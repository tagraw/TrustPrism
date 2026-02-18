import { useState, useEffect } from "react";
import Notifications from "../../components/Notifications";
import "./RDashboard.css";

export default function RDashboard({ setActiveView, onViewInsights, onViewProject }) {
  const [stats, setStats] = useState({ projects: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("published");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProjects = stats.projects.filter(p => {
    const status = p.status || 'draft';
    if (status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.game_type || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <main className="rd-main">
      <header className="rd-topbar">
        <div>
          <h1>Researcher Dashboard</h1>
        </div>
        <div className="rd-actions">
          <input
            className="rd-search"
            placeholder="Search studies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Notifications onOpenProject={async (gameId) => {
            try {
              const token = localStorage.getItem("token");
              const res = await fetch(`http://localhost:5000/dashboard/stats`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                const project = data.projects?.find(p => p.id === gameId);
                if (project) onViewProject(project);
              }
            } catch (e) { console.error(e); }
          }} />
          <button className="rd-create" onClick={() => setActiveView("create")}>
            + Create New Game
          </button>
        </div>
      </header>

      <div className="rd-tabs">
        <button
          className={activeTab === 'draft' ? 'active' : ''}
          onClick={() => setActiveTab('draft')}
        >
          Drafts <span>{projectCounts['draft'] || 0}</span>
        </button>
        <button
          className={activeTab === 'pending_review' ? 'active' : ''}
          onClick={() => setActiveTab('pending_review')}
        >
          Pending Review <span>{projectCounts['pending_review'] || 0}</span>
        </button>
        <button
          className={activeTab === 'published' ? 'active' : ''}
          onClick={() => setActiveTab('published')}
        >
          Published <span>{projectCounts['published'] || 0}</span>
        </button>
      </div>

      <div className="rd-card-grid">
        {filteredProjects.length === 0 ? (
          <div style={{ gridColumn: '1/-1', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No {activeTab.replace('_', ' ')} projects found.
          </div>
        ) : (
          filteredProjects.map(p => (
            <div key={p.id} className="rd-card" onClick={() => onViewProject(p)}>
              <div className="rd-card-header">
                <span className={`badge active`}>
                  {activeTab === 'published' ? 'ACTIVE STUDY' : activeTab === 'pending_review' ? 'IN REVIEW' : 'DRAFT'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{p.name}</h3>
              <p className="updated">Last update: {new Date(p.updated_at || p.created_at).toLocaleDateString()}</p>


              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                </div>
                <span className="view-link">View Info</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Bar - kept as user designed */}
      <section className="rd-summary">
        <div>
          <small>Total Participants</small>
        </div>
        <div>
          <small>Active Studies</small>
          <strong>{projectCounts["published"] || 0}</strong>
        </div>
        <div>
          <small>Data Storage</small>
        </div>
        <div>
          <small>Audit Score</small>
          <strong className="green">-</strong>
        </div>
      </section>

    </main>
  );
}
