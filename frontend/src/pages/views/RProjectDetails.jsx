import { useState, useEffect } from "react";
import TicketCreate from "../../components/tickets/TicketCreate";
import TicketDetail from "../../components/tickets/TicketDetail";
import "../../components/tickets/Tickets.css";
import "../Researcher.css";

export default function RProjectDetails({ projectId, goBack }) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stagingUrl, setStagingUrl] = useState("");
    const [savingStagingUrl, setSavingStagingUrl] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    // Tickets state
    const [tickets, setTickets] = useState([]);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    useEffect(() => {
        fetchProject();
        fetchTickets();
    }, [projectId]);

    async function fetchTickets() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/tickets?game_id=${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setTickets(await res.json());
        } catch (e) { console.error(e); }
    }

    async function fetchProject() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProject(data);
                setStagingUrl(data.staging_url || "");
            }
        } catch (e) { console.error(e); }
    }



    async function updateStatus(status) {
        if (!confirm(`Are you sure you want to mark this as ${status}?`)) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:5000/projects/${projectId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            fetchProject();
        } catch (err) {
            console.error(err);
        }
    }

    async function saveStagingUrl() {
        if (!stagingUrl.trim()) return;
        setSavingStagingUrl(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/projects/${projectId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ staging_url: stagingUrl.trim() })
            });
            if (res.ok) {
                const updated = await res.json();
                setProject(updated);
            }
        } catch (err) { console.error(err); }
        setSavingStagingUrl(false);
    }

    if (loading) return <div className="p-8">Loading project...</div>;
    if (!project) return <div className="p-8">Project not found</div>;

    return (
        <main className="researcher-main">
            <header className="researcher-topbar">
                <button onClick={goBack} className="back-btn material-icons-round">arrow_back</button>
                <h1>{project.name}</h1>
                <span className={`badge ${project.status}`}>{project.status || 'draft'}</span>
            </header>

            <div className="project-details-grid">
                <section className="dashboard-card" style={{ flex: 2 }}>
                    <h2>Project Overview</h2>
                    <p><strong>Type:</strong> {project.game_type}</p>
                    <p><strong>Description:</strong> {project.description}</p>

                    {/* Staging URL */}
                    <div className="staging-section" style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>language</span>
                            Staging URL
                        </h3>
                        <div className="staging-url-row">
                            <input
                                type="url"
                                className="staging-url-input"
                                value={stagingUrl}
                                onChange={e => setStagingUrl(e.target.value)}
                                placeholder="https://staging.your-game.example.com"
                            />
                            <button
                                className="staging-save-btn"
                                onClick={saveStagingUrl}
                                disabled={savingStagingUrl || !stagingUrl.trim() || stagingUrl.trim() === project.staging_url}
                            >
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                    {savingStagingUrl ? "hourglass_empty" : "save"}
                                </span>
                                {savingStagingUrl ? "Saving..." : "Save"}
                            </button>
                        </div>

                        {(stagingUrl.trim() || project.staging_url) && (
                            <button
                                className={`preview-toggle-btn ${showPreview ? "active" : ""}`}
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                    {showPreview ? "visibility_off" : "visibility"}
                                </span>
                                {showPreview ? "Hide Preview" : "Preview Game"}
                            </button>
                        )}
                    </div>

                    {/* Iframe Preview */}
                    {showPreview && (stagingUrl.trim() || project.staging_url) && (
                        <div className="preview-iframe-container" style={{ marginTop: '1rem' }}>
                            <div className="preview-iframe-header">
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>monitor</span>
                                <span>Live Preview</span>
                                <a href={stagingUrl.trim() || project.staging_url} target="_blank" rel="noreferrer" className="preview-open-external">
                                    <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                                </a>
                            </div>
                            <iframe
                                src={stagingUrl.trim() || project.staging_url}
                                title={`Preview: ${project.name}`}
                                className="preview-iframe"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        </div>
                    )}

                    <div className="actions-bar" style={{ marginTop: "20px" }}>
                        {project.status === 'draft' && (
                            <button className="create-btn" onClick={() => updateStatus('pending_review')}>
                                Submit for Review
                            </button>
                        )}
                        {project.status === 'pending_review' && (
                            <div className="review-status">
                                <p>Waiting for Admin Review...</p>
                            </div>
                        )}
                        {project.status === 'approved' && (
                            <button className="publish-btn" onClick={() => updateStatus('published')}>
                                <span className="material-icons-round">rocket_launch</span>
                                Publish Game
                            </button>
                        )}
                        {project.status === 'published' && (
                            <button className="manage-btn">View Insights</button>
                        )}
                    </div>
                </section>

                <section className="dashboard-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0 }}>Tickets</h2>
                        <button
                            className="tickets-create-btn"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                            onClick={() => setShowCreateTicket(true)}
                        >
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>add</span>
                            New
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {tickets.length === 0 ? <p className="empty">No tickets yet. Create one to get started!</p> : (
                            tickets.map(t => (
                                <div
                                    key={t.id}
                                    className="pm-ticket-item"
                                    onClick={() => setSelectedTicketId(t.id)}
                                >
                                    <div>
                                        <div className="pm-ticket-title">{t.title}</div>
                                        <div className="pm-ticket-meta">
                                            <span className={`ticket-status ${t.status}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                                {t.status.replace('_', ' ')}
                                            </span>
                                            <span className={`ticket-priority ${t.priority}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                                {t.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Ticket Create Modal */}
                {showCreateTicket && (
                    <TicketCreate
                        prefilledGameId={projectId}
                        onClose={() => setShowCreateTicket(false)}
                        onCreated={() => fetchTickets()}
                    />
                )}

                {/* Ticket Detail Modal */}
                {selectedTicketId && (
                    <TicketDetail
                        ticketId={selectedTicketId}
                        role="researcher"
                        onClose={() => {
                            setSelectedTicketId(null);
                            fetchTickets();
                        }}
                    />
                )}
            </div>
        </main>
    );
}
