import { useEffect, useState } from "react";
import { getMyGroups } from "../api/groups";
import LogoutButton from "../components/LogoutButton";
import logo from "../assets/logo-removebg-preview.png";
import "./Researcher.css";

export default function Researcher() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await getMyGroups();
        setGroups(data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    }
    fetchGroups();
  }, []);

  return (
    <div className="researcher-layout">
      {/* Sidebar */}
      <aside className="researcher-sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="TrustPrism" />
          <div>
            <strong>TrustPrism</strong>
            <span>Integrity First</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a className="active">
            <span className="material-icons-round">dashboard</span>
            Dashboard
          </a>
          <a>
            <span className="material-icons-round">groups</span>
            Research Groups
          </a>
          <a>
            <span className="material-icons-round">people</span>
            Participants
          </a>
          <a>
            <span className="material-icons-round">insights</span>
            Data Insights
          </a>
          <a>
            <span className="material-icons-round">security</span>
            Security
          </a>
          <a>
            <span className="material-icons-round">settings</span>
            Settings
          </a>
        </nav>

        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="researcher-main">
        {/* Top Bar */}
        <header className="researcher-topbar">
          <h1>Researcher Dashboard</h1>

          <div className="topbar-actions">
            <input
              className="search-input"
              placeholder="Search research IDs..."
            />
            <button className="create-btn">
              <span className="material-icons-round">add</span>
              Create New Project
            </button>
          </div>
        </header>

        {/* Groups Section */}
        <section className="groups-section">
          <div className="groups-header">
            <div>
              <h2>Your Research Groups</h2>
              <p>
                Manage active cohorts and monitor scientific integrity.
              </p>
            </div>
            <button className="export-btn">Export Dataset</button>
          </div>

          {groups.length === 0 ? (
            <p className="empty-state">
              You have not created or joined any research groups yet.
            </p>
          ) : (
            <div className="groups-grid">
              {groups.map((g) => (
                <div key={g.id} className="group-card">
                  <div className="group-icon">
                    <span className="material-icons-round">science</span>
                  </div>

                  <span className="status active">ACTIVE</span>

                  <h3>{g.name}</h3>
                  <p className="group-id">ID: {g.id}</p>

                  <div className="group-footer">
                    <div>
                      <span className="label">Participants</span>
                      <strong>{g.participantCount ?? "—"}</strong>
                    </div>
                    <button className="manage-btn">Manage</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
