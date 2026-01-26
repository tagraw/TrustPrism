import { useEffect, useState, useContext } from "react";
import AuthContext from "../../context/AuthContext";

export default function SettingsView() {
  const { auth } = useContext(AuthContext);
  const API_URL = "http://127.0.0.1:5000";

  // State for different sections
  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        // Fetch Profile & Emails in parallel
        const [profRes, emailRes] = await Promise.all([
          fetch(`${API_URL}/auth/profile-stats`, { headers: { Authorization: `Bearer ${auth.token}` } }),
          fetch(`${API_URL}/auth/settings/emails`, { headers: { Authorization: `Bearer ${auth.token}` } })
        ]);
        const profData = await profRes.json();
        const emailData = await emailRes.json();

        setProfile({ first_name: profData.firstName, last_name: profData.lastName || "" });
        setEmails(emailData);
      } catch (err) {
        console.error("Load error:", err);
      }
    };

    if (auth.token) fetchSettingsData();
  }, [auth.token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/settings/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(profile)
    });
    if (res.ok) alert("Profile updated!");
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;
    const res = await fetch(`${API_URL}/auth/settings/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ email: newEmail })
    });
    if (res.ok) {
      setNewEmail("");
      try {
        const [profRes, emailRes] = await Promise.all([
          fetch(`${API_URL}/auth/profile-stats`, { headers: { Authorization: `Bearer ${auth.token}` } }),
          fetch(`${API_URL}/auth/settings/emails`, { headers: { Authorization: `Bearer ${auth.token}` } })
        ]);
        const profData = await profRes.json();
        const emailData = await emailRes.json();
        setProfile({ first_name: profData.firstName, last_name: profData.lastName || "" });
        setEmails(emailData);
      } catch (err) {
        console.error("Load error:", err);
      }
    }
  };

 return (
    <div className="settings-container">
        <h2 className="settings-title">Account Settings</h2>

        {/* Profile Section */}
        <section className="settings-card">
        <div className="card-header">
            <span className="material-icons-round">badge</span>
            <h3>Personal Information</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="input-group">
            <label>First Name</label>
            <input
                type="text"
                value={profile.first_name}
                onChange={e => setProfile({ ...profile, first_name: e.target.value })}
            />
            </div>

            <div className="input-group">
            <label>Last Name</label>
            <input
                type="text"
                value={profile.last_name}
                onChange={e => setProfile({ ...profile, last_name: e.target.value })}
            />
            </div>

            <div className="form-actions">
            <button type="submit" className="primary-btn">
                Save Changes
            </button>
            </div>
        </form>
        </section>

        {/* Email Section */}
        <section className="settings-card">
        <div className="card-header">
            <span className="material-icons-round">alternate_email</span>
            <h3>Email Addresses</h3>
        </div>

        <div className="email-manager">
            <ul className="email-chip-list">
            {emails.map(e => (
                <li
                key={e.email}
                className={`email-chip ${e.is_primary ? "primary" : ""}`}
                >
                <span className="email-text">{e.email}</span>

                <div className="chip-tags">
                    {e.is_primary && <span className="tag">Primary</span>}
                    {!e.is_verified && (
                    <span className="tag warning">Unverified</span>
                    )}
                </div>
                </li>
            ))}
            </ul>

            <div className="add-email-row">
            <input
                type="email"
                placeholder="Add backup email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
            />
            <button onClick={handleAddEmail} className="secondary-btn">
                Add
            </button>
            </div>
        </div>
        </section>
    </div>
    );

}