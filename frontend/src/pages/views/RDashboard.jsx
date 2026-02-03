import { useState, useEffect } from "react";

export default function RDashboard({ setActiveView, onViewInsights, onViewProject }) {
  const [stats, setStats] = useState({ projects: [], activity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const projectCounts = stats.projects.reduce((acc, curr) => {
    const status = curr.status || 'draft';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="researcher-main">
      <header className="researcher-topbar">
        <h1>Researcher Dashboard</h1>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search..." />
          <button className="create-btn" onClick={() => setActiveView("create")}>
            <span className="material-icons-round">add</span>
            Create New Project
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Status Overview */}
        <section className="dashboard-card overview">
          <h2>Project Status</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="count">{projectCounts['draft'] || 0}</span>
              <span className="label">Drafts</span>
            </div>
            <div className="stat-item">
              <span className="count">{projectCounts['pending_review'] || 0}</span>
              <span className="label">Pending Review</span>
            </div>
            <div className="stat-item active">
              <span className="count">{projectCounts['published'] || 0}</span>
              <span className="label">Published</span>
            </div>
          </div>

          <div className="projects-list-container">
            <h3>Pending Review</h3>
            {stats.projects.filter(p => !p.status || p.status === 'draft' || p.status === 'pending_review').length === 0 ? (
              <p>No pending projects.</p>
            ) : (
              <ul className="project-list">
                {stats.projects.filter(p => p.status === 'pending_review').map(p => (
                  <li key={p.id} className="project-list-item" onClick={() => onViewProject(p)} style={{ cursor: 'pointer' }}>
                    <strong>{p.name}</strong>
                    <span className="badge pending_review">Pending</span>
                  </li>
                ))}
                {stats.projects.filter(p => !p.status || p.status === 'draft').map(p => (
                  <li key={p.id} className="project-list-item" onClick={() => onViewProject(p)} style={{ cursor: 'pointer' }}>
                    <strong>{p.name}</strong>
                    <span className="badge draft">Draft</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="projects-list-container">
            <h3>Published Games</h3>
            {stats.projects.filter(p => p.status === 'published').length === 0 ? <p>No published games.</p> : (
              <ul className="project-list">
                {stats.projects.filter(p => p.status === 'published').map(p => (
                  <li key={p.id} className="project-list-item" onClick={() => onViewProject(p)} style={{ cursor: 'pointer' }}>
                    <strong>{p.name}</strong>
                    <span className="badge published">Published</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>

        {/* Recent Activity */}
        <section className="dashboard-card activity">
          <h2>Recent Activity</h2>
          <ul className="activity-list">
            {stats.activity.length === 0 ? (
              <li className="empty">No recent activity</li>
            ) : (
              stats.activity.map((log) => (
                <li key={log.id} className="activity-item">
                  <span className="icon material-icons-round">
                    {log.action_type === 'create_project' ? 'add_circle' : 'info'}
                  </span>
                  <div className="details">
                    <p>{log.description}</p>
                    <small>{new Date(log.created_at).toLocaleDateString()}</small>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Quick Actions / Chat Placeholder */}
        <section className="dashboard-card actions">
          <h2>Admin Support</h2>
          <div className="chat-placeholder">
            <p>Need help with your study design?</p>
            <button className="chat-btn">
              <span className="material-icons-round">chat</span>
              Chat with Admin
            </button>
          </div>
        </section>
      </div >
    </main >
  );
}
