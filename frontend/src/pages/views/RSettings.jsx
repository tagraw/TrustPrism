import { useState, useEffect } from "react";

export default function RSettings() {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    affiliation: "",
    research_interests: [], // Array
    api_key: "",
    notification_prefs: { email: true, push: false }
  });

  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token} ` };

      const [profileRes, emailsRes] = await Promise.all([
        fetch("http://localhost:5000/auth/settings/profile", { headers }),
        fetch("http://localhost:5000/auth/settings/emails", { headers })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        // Ensure defaults
        setProfile({
          ...data,
          research_interests: data.research_interests || [],
          notification_prefs: data.notification_prefs || { email: true, push: false }
        });
      }
      if (emailsRes.ok) setEmails(await emailsRes.json());
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  }

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("notify_")) {
      const prefKey = name.replace("notify_", "");
      setProfile(prev => ({
        ...prev,
        notification_prefs: { ...prev.notification_prefs, [prefKey]: checked }
      }));
    } else if (name === "research_interests") {
      // Split by comma for display/edit as string, but we store as string in state for input
      // Actually, let's just handle it as text and split on submit
      // OR handle it here. Let's start with simple text input that maps to array
      setProfile(prev => ({ ...prev, [name]: value.split(",").map(s => s.trim()) }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  // Helper for text area interaction
  const handleInterestsChange = (e) => {
    setProfile(prev => ({ ...prev, research_interests: e.target.value.split(",") }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/auth/settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token} `
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) alert("Profile updated!");
      else alert("Failed to update profile");
    } catch (err) {
      console.error(err);
    }
  };

  const addEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/auth/settings/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token} `
        },
        body: JSON.stringify({ email: newEmail })
      });
      if (res.ok) {
        alert("Email added! Please verify it.");
        setNewEmail("");
        fetchSettings();
      } else {
        alert("Failed to add email.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <main className="researcher-main">
      <header className="researcher-topbar">
        <h1>Settings</h1>
      </header>

      <div className="settings-grid" style={{ display: "grid", gap: "2rem", maxWidth: "1000px", padding: "0" }}>

        {/* Profile Section */}
        <section className="settings-section">
          <div className="settings-header">
            <h2>Researcher Profile</h2>
            <p>Update your personal information and preferences.</p>
          </div>

          <form onSubmit={saveProfile}>
            <div className="form-row">
              <label>
                First Name
                <input type="text" name="first_name" value={profile.first_name || ""} onChange={handleProfileChange} />
              </label>
              <label>
                Last Name
                <input type="text" name="last_name" value={profile.last_name || ""} onChange={handleProfileChange} />
              </label>
            </div>

            <label>
              Affiliation
              <input
                type="text" name="affiliation"
                value={profile.affiliation || ""}
                onChange={handleProfileChange}
                placeholder="University or Organization"
              />
            </label>

            <label>
              Research Interests (comma separated)
              <textarea
                rows="3"
                value={profile.research_interests.join(", ")}
                onChange={handleInterestsChange}
                placeholder="e.g. Human-AI Interaction, Trust, Ethics"
              />
            </label>

            <label>
              OpenAI / Anthropic API Key
              <input
                type="password" name="api_key"
                value={profile.api_key || ""}
                onChange={handleProfileChange}
                placeholder="sk-..."
              />
            </label>

            <div className="form-group checkbox" style={{ marginTop: "1rem" }}>
              <h3>Notification Preferences</h3>
              <label>
                <input
                  type="checkbox" name="notify_email"
                  checked={profile.notification_prefs?.email || false}
                  onChange={handleProfileChange}
                />
                Email Notifications
              </label>
              <label>
                <input
                  type="checkbox" name="notify_push"
                  checked={profile.notification_prefs?.push || false}
                  onChange={handleProfileChange}
                />
                Browser Push Notifications
              </label>
            </div>

            <button type="submit" className="submit-btn">Save Profile</button>
          </form>
        </section>

        {/* Email Management */}
        <section className="settings-section">
          <div className="settings-header">
            <h2>Email Management</h2>
            <p>Manage your connected email addresses.</p>
          </div>

          <ul className="email-list" style={{ listStyle: "none", padding: 0, marginBottom: "1rem" }}>
            {emails.map(e => (
              <li key={e.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <span>
                  {e.email}
                  {e.is_primary && <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", background: "#def7ec", color: "#03543f", padding: "2px 6px", borderRadius: "4px" }}>Primary</span>}
                </span>
                <span style={{ fontSize: "0.9rem", color: e.is_verified ? "green" : "orange" }}>
                  {e.is_verified ? "Verified" : "Unverified"}
                </span>
              </li>
            ))}
          </ul>

          <form onSubmit={addEmail} style={{ display: "flex", gap: "1rem" }}>
            <input
              type="email"
              placeholder="Add new email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="manage-btn">Add</button>
          </form>
        </section>

      </div>
    </main>
  );
}