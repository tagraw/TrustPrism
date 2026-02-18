import { useState, useEffect } from "react";
import LogoutButton from "../components/LogoutButton";
import Notifications from "../components/Notifications";
import UserManagement from "./views/User_Management";
import GroupManagement from "./views/Group_Management";
import StudyApprovals from "./views/Study_Approvals";
import AuditMonitor from "./views/AuditMonitor";
import SDKDocs from "./views/SDKDocs";
import SecuritySettings from "./views/SecuritySettings";
import logo from "../assets/logo-removebg-preview.png";
import "./Admin.css";

export default function Admin() {
  const [activeView, setActiveView] = useState("overview");
  const [notificationGameId, setNotificationGameId] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeResearchers: 0,
    pendingApprovals: 0,
    systemStatus: "Healthy"
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Admin Page Token:", token); // DEBUG

    if (!token) {
      console.error("No token found, skipping fetch");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Fetch Stats
    fetch("http://localhost:5000/admin/stats", { headers })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to load stats", err));

    // 2. Fetch Recent Users (re-using users endpoint)
    fetch("http://localhost:5000/admin/users", { headers })
      .then(res => res.json())
      .then(users => {
        if (Array.isArray(users)) {
          setRecentUsers(users.slice(0, 5)); // Show top 5
        }
      })
      .catch(err => console.error("Failed to load users", err));

    // 3. Fetch Games
    fetch("http://localhost:5000/admin/games", { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGames(data);
        }
      })
      .catch(err => console.error("Failed to load games", err));
  }, []);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logo} alt="TrustPrism" />
          <div>
            <strong>TrustPrism</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="admin-nav">
          <a
            className={activeView === "overview" ? "active" : ""}
            onClick={() => setActiveView("overview")}
          >
            <span className="material-icons-round">grid_view</span>
            Overview
          </a>
          <a
            className={activeView === "users" ? "active" : ""}
            onClick={() => setActiveView("users")}
          >
            <span className="material-icons-round">people</span>
            Users
          </a>
          <a
            className={activeView === "groups" ? "active" : ""}
            onClick={() => setActiveView("groups")}
          >
            <span className="material-icons-round">groups</span>
            Groups
          </a>
          <a
            className={activeView === "approvals" ? "active" : ""}
            onClick={() => setActiveView("approvals")}
          >
            <span className="material-icons-round">checklist</span>
            Study Approvals
          </a>
          <a
            className={activeView === "audit" ? "active" : ""}
            onClick={() => setActiveView("audit")}
          >
            <span className="material-icons-round">shield</span>
            Audit & Monitoring
          </a>
          <a
            className={activeView === "sdk" ? "active" : ""}
            onClick={() => setActiveView("sdk")}
          >
            <span className="material-icons-round">code</span>
            SDK Docs
          </a>
          <a
            className={activeView === "settings" ? "active" : ""}
            onClick={() => setActiveView("settings")}
          >
            <span className="material-icons-round">security</span>
            Security Settings
          </a>
        </nav>

        <div className="admin-footer">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <h1>
            {activeView === 'users' ? 'User Management' :
              activeView === 'groups' ? 'Group Management' :
                activeView === 'approvals' ? 'Study Approvals' :
                  activeView === 'audit' ? 'Audit & Monitoring' :
                    activeView === 'sdk' ? 'SDK Documentation' :
                      activeView === 'settings' ? 'Security Settings' :
                        'System Dashboard'}
          </h1>

          <div className="topbar-actions">
            <Notifications onOpenProject={(gameId) => {
              setNotificationGameId(gameId);
              setActiveView("approvals");
            }} />
          </div>
        </header>

        {/* View Switcher */}
        {activeView === 'users' ? (
          <UserManagement />
        ) : activeView === 'groups' ? (
          <GroupManagement />
        ) : activeView === 'approvals' ? (
          <StudyApprovals openGameId={notificationGameId} onGameOpened={() => setNotificationGameId(null)} />
        ) : activeView === 'audit' ? (
          <AuditMonitor />
        ) : activeView === 'sdk' ? (
          <SDKDocs />
        ) : activeView === 'settings' ? (
          <SecuritySettings />
        ) : (
          <>
            {/* Stats */}
            <section className="stats-grid">
              <div className="stat-card">
                <span className="material-icons-round blue">groups</span>
                <p>Total Users</p>
                <h2>{stats.totalUsers}</h2>
                <small className="positive">Updated just now</small>
              </div>

              <div className="stat-card">
                <span className="material-icons-round purple">school</span>
                <p>Researchers</p>
                <h2>{stats.activeResearchers}</h2>
                <small className="positive">Active</small>
              </div>

              <div className="stat-card">
                <span className="material-icons-round orange">hourglass_empty</span>
                <p>Pending Approvals</p>
                <h2>{stats.pendingApprovals}</h2>
                <small className="warning">Requires Attention</small>
              </div>

              <div className="stat-card">
                <span className="material-icons-round green">check_circle</span>
                <p>System Status</p>
                <h2>{stats.systemStatus}</h2>
                <small>Operational</small>
              </div>
            </section>

            {/* Main Grid */}
            <section className="admin-grid">
              {/* User Management */}
              <div className="admin-card wide">
                <div className="card-header">
                  <h3>Recent Users</h3>
                  <button className="text-btn" onClick={() => setActiveView("users")}>View All</button>
                </div>

                <table className="user-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.first_name} {u.last_name}</strong>
                          <span>{u.email}</span>
                        </td>
                        <td>
                          <span className={`pill ${u.role === 'admin' ? 'purple' : u.role === 'researcher' ? 'blue' : 'gray'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className={u.is_verified ? "verified" : "pending"}>
                          {u.is_verified ? "Verified" : "Pending"}
                        </td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recently'}</td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Activity */}
              <div className="admin-card">
                <h3>Recent System Activity</h3>
                <ul className="activity-list">
                  <li>
                    <span className="dot blue" />
                    Researcher Verified
                    <small>12:45 PM Today</small>
                  </li>
                  <li>
                    <span className="dot green" />
                    System Backup Successful
                    <small>04:00 AM Today</small>
                  </li>
                  <li>
                    <span className="dot orange" />
                    New Study Submission
                    <small>4 hours ago</small>
                  </li>
                </ul>
              </div>
            </section>

            {/* All Games / Studies */}
            <section className="study-approvals">
              <div className="admin-card">
                <div className="card-header">
                  <h3>Researcher Studies</h3>
                  <span className="subtle-text">All games created by researchers</span>
                </div>

                <div className="approval-list">
                  {games.length === 0 && (
                    <p className="text-center">No studies found in the database.</p>
                  )}
                  {games.map(game => (
                    <div className="approval-item" key={game.id}>
                      <div className="approval-info">
                        <strong>{game.name}</strong>
                        <span>By {game.researcher_name} ({game.researcher_email})</span>
                        <small>
                          Type: {game.game_type} • Status:
                          <span className={`pill ${game.status === 'published' ? 'green' : game.status === 'pending_review' ? 'orange' : game.status === 'approved' ? 'blue' : 'gray'}`} style={{ marginLeft: '4px' }}>
                            {game.status}
                          </span>
                          {game.irb_approval && ' • IRB Approved'}
                        </small>
                      </div>

                      <div className="approval-actions">
                        {game.status === 'pending_review' && (
                          <>
                            <button className="approve-btn">Approve</button>
                            <button className="request-btn">Request Changes</button>
                          </>
                        )}
                        {game.status !== 'pending_review' && (
                          <small>{new Date(game.created_at).toLocaleDateString()}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </>
        )}
      </main>
    </div>
  );
}
