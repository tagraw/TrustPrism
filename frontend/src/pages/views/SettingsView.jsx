import { useEffect, useState, useContext } from "react";
import AuthContext from "../../context/AuthContext";

export default function SettingsView() {
  const { auth } = useContext(AuthContext);
  const API_URL = "http://127.0.0.1:5000";

  // State for different sections
  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [consents, setConsents] = useState([]);
  const [consentsLoading, setConsentsLoading] = useState(true);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        // Fetch Profile, Emails, and Consents in parallel
        const [profRes, emailRes, consentsRes] = await Promise.all([
          fetch(`${API_URL}/auth/profile-stats`, {
      credentials: "include", headers: {} }),
          fetch(`${API_URL}/auth/settings/emails`, {
      credentials: "include", headers: {} }),
          fetch(`${API_URL}/participant/my-consents`, {
      credentials: "include", headers: {} })
        ]);
        const profData = await profRes.json();
        const emailData = await emailRes.json();
        const consentsData = consentsRes.ok ? await consentsRes.json() : [];

        setProfile({ first_name: profData.firstName, last_name: profData.lastName || "" });
        setEmails(emailData);
        setConsents(consentsData);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setConsentsLoading(false);
      }
    };

    if (auth.token) fetchSettingsData();
  }, [auth.token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/settings/profile`, {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "application/json",},
      body: JSON.stringify(profile)
    });
    if (res.ok) alert("Profile updated!");
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;
    const res = await fetch(`${API_URL}/auth/settings/emails`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json",},
      body: JSON.stringify({ email: newEmail })
    });
    if (res.ok) {
      setNewEmail("");
      try {
        const [profRes, emailRes] = await Promise.all([
          fetch(`${API_URL}/auth/profile-stats`, {
      credentials: "include", headers: {} }),
          fetch(`${API_URL}/auth/settings/emails`, {
      credentials: "include", headers: {} })
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      {/* Accepted Consents Section */}
      <section className="settings-card">
        <div className="card-header">
          <span className="material-icons-round" style={{ color: "#0ea5e9" }}>verified_user</span>
          <h3>Accepted Consent Forms</h3>
        </div>

        {consentsLoading ? (
          <div className="consents-loading">
            <span className="material-icons-round spin" style={{ fontSize: "1.5rem", color: "#94a3b8" }}>autorenew</span>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading consent history...</p>
          </div>
        ) : consents.length === 0 ? (
          <div className="consents-empty">
            <span className="material-icons-round" style={{ fontSize: "2.5rem", color: "#cbd5e1" }}>fact_check</span>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "0.5rem" }}>
              No consent forms accepted yet.
            </p>
            <p style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
              Consent forms will appear here when you accept them before playing a game.
            </p>
          </div>
        ) : (
          <ul className="consent-list">
            {consents.map((consent) => (
              <li key={consent.id} className="consent-item">
                <div className="consent-item-info">
                  <span className="material-icons-round consent-icon">description</span>
                  <div>
                    <p className="consent-game-name">{consent.game_name}</p>
                    <p className="consent-date">
                      Accepted on {formatDate(consent.accepted_at)}
                    </p>
                  </div>
                </div>
                {consent.consent_form_url && (
                  <a
                    href={`http://localhost:5000${consent.consent_form_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="consent-view-link"
                  >
                    <span className="material-icons-round" style={{ fontSize: "16px" }}>open_in_new</span>
                    View Form
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

}