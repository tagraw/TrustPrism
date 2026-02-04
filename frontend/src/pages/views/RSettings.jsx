import { useState, useEffect } from "react";
import "./RSettings.css";

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
      const headers = { Authorization: `Bearer ${token}` };

      // In a real app we might handle partial failures, but for now wrap both
      try {
        const [profileRes, emailsRes] = await Promise.all([
          fetch("http://localhost:5000/auth/settings/profile", { headers }),
          fetch("http://localhost:5000/auth/settings/emails", { headers })
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile({
            ...data,
            research_interests: data.research_interests || [],
            notification_prefs: data.notification_prefs || { email: true, push: false }
          });
        }
        if (emailsRes.ok) setEmails(await emailsRes.json());
      } catch (inner) {
        console.error("Network error fetching settings", inner);
      }

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
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleInterestsChange = (e) => {
    // Keep it as a string in the separate handler if needed,
    // or just split on blur/submit. For better UX, let's keep it simple text and split on save.
    // Ideally we store the raw string in state for the textarea, but here we are mapping back/forth to array.
    // To simplify: we'll just update the array on every keystroke by splitting.
    setProfile(prev => ({ ...prev, research_interests: e.target.value.split(",") }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      // Clean up interests before sending
      const cleanedProfile = {
        ...profile,
        research_interests: profile.research_interests.map(s => s.trim()).filter(Boolean)
      };

      const res = await fetch("http://localhost:5000/auth/settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(cleanedProfile)
      });
      if (res.ok) alert("Profile updated successfully!");
      else alert("Failed to update profile");
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });
      if (res.ok) {
        alert("Email added! Please check your inbox to verify.");
        setNewEmail("");
        fetchSettings(); // Refresh list
      } else {
        alert("Failed to add email.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="rs-layout">Loading settings...</div>;

  return (
    <main className="rs-layout">
      <header className="rs-header">
        <h1>Settings</h1>
        <p className="rs-subtitle">Manage your account preferences and research profile.</p>
      </header>

      <div className="rs-container">

        {/* Profile Section */}
        <section className="rs-card">
          <div className="rs-card-header">
            <h2>Researcher Profile</h2>
            <p className="rs-card-desc">Update your personal information and affiliations.</p>
          </div>

          <form className="rs-form" onSubmit={saveProfile}>
            <div className="rs-form-row">
              <div className="rs-form-group">
                <label className="rs-label">First Name</label>
                <input
                  className="rs-input"
                  type="text"
                  name="first_name"
                  value={profile.first_name || ""}
                  onChange={handleProfileChange}
                  placeholder="Jane"
                />
              </div>
              <div className="rs-form-group">
                <label className="rs-label">Last Name</label>
                <input
                  className="rs-input"
                  type="text"
                  name="last_name"
                  value={profile.last_name || ""}
                  onChange={handleProfileChange}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="rs-form-group">
              <label className="rs-label">Affiliation</label>
              <input
                className="rs-input"
                type="text"
                name="affiliation"
                value={profile.affiliation || ""}
                onChange={handleProfileChange}
                placeholder="University or Research Institute"
              />
            </div>

            <div className="rs-form-group">
              <label className="rs-label">Research Interests</label>
              <textarea
                className="rs-textarea"
                rows="3"
                value={profile.research_interests.join(", ")}
                onChange={handleInterestsChange}
                placeholder="e.g. Human-AI Interaction, Ethics, Cognitive Science (comma separated)"
              />
            </div>

            <div className="rs-form-group">
              <label className="rs-label">OpenAI / Anthropic API Key</label>
              <input
                className="rs-input"
                type="password"
                name="api_key"
                value={profile.api_key || ""}
                onChange={handleProfileChange}
                placeholder="sk-..."
              />
              <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Used for running AI simulations within your research groups.
              </small>
            </div>

            <div className="rs-checkbox-group">
              <label className="rs-label" style={{ marginBottom: '0.5rem' }}>Notification Preferences</label>
              <label className="rs-checkbox-label">
                <input
                  className="rs-checkbox"
                  type="checkbox"
                  name="notify_email"
                  checked={profile.notification_prefs?.email || false}
                  onChange={handleProfileChange}
                />
                Receive email notifications about study progress
              </label>
              <label className="rs-checkbox-label">
                <input
                  className="rs-checkbox"
                  type="checkbox"
                  name="notify_push"
                  checked={profile.notification_prefs?.push || false}
                  onChange={handleProfileChange}
                />
                Receive browser push notifications
              </label>
            </div>

            <button type="submit" className="rs-btn-primary">Save Changes</button>
          </form>
        </section>

        {/* Email Management */}
        <section className="rs-card">
          <div className="rs-card-header">
            <h2>Email Management</h2>
            <p className="rs-card-desc">Manage connected email addresses for login and notifications.</p>
          </div>

          <ul className="rs-email-list">
            {emails.map(e => (
              <li key={e.email} className="rs-email-item">
                <div className="rs-email-text">
                  <span className="material-icons-round" style={{ fontSize: '1.2rem', color: '#64748b' }}>email</span>
                  {e.email}
                  {e.is_primary && <span className="rs-badge-primary">Primary</span>}
                </div>
                <span className={e.is_verified ? "rs-status-verified" : "rs-status-unverified"}>
                  {e.is_verified ? "Verified" : "Unverified"}
                </span>
              </li>
            ))}
            {emails.length === 0 && <li className="rs-email-item" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No emails found.</li>}
          </ul>

          <form onSubmit={addEmail} className="rs-add-email-row">
            <input
              className="rs-input"
              type="email"
              placeholder="Add another email address"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="rs-btn-add">Add Email</button>
          </form>
        </section>

      </div>
    </main>
  );
}