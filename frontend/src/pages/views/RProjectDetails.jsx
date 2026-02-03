import { useState, useEffect } from "react";

export default function RProjectDetails({ projectId, goBack }) {
    const [project, setProject] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    // Poll for messages every 5s for MVP
    useEffect(() => {
        fetchProject();
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [projectId]);

    async function fetchProject() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setProject(await res.json());
        } catch (e) { console.error(e); }
    }

    async function fetchMessages() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/chat/projects/${projectId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setMessages(await res.json());
            setLoading(false);
        } catch (e) { console.error(e); }
    }

    async function sendMessage() {
        if (!newMessage.trim()) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:5000/chat/projects/${projectId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMessage })
            });
            setNewMessage("");
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
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

                    <div className="actions-bar" style={{ marginTop: "20px" }}>
                        {project.status === 'draft' && (
                            <button className="create-btn" onClick={() => updateStatus('pending_review')}>
                                Submit for Review
                            </button>
                        )}
                        {project.status === 'pending_review' && (
                            <div className="review-status">
                                <p>Waiting for Admin Review...</p>
                                <button className="manage-btn">Preview Game</button>
                            </div>
                        )}
                        {project.status === 'published' && (
                            <button className="manage-btn">View Insights</button>
                        )}
                    </div>
                </section>

                <section className="dashboard-card chat-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
                    <h2>Admin Collaboration</h2>
                    <div className="chat-history" style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                        {messages.length === 0 ? <p className="empty">No messages yet. Start discussing!</p> : (
                            messages.map(m => (
                                <div key={m.id} className={`chat-msg ${m.role === 'admin' ? 'admin' : 'me'}`}>
                                    <strong>{m.first_name}:</strong> {m.message}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="chat-input-area">
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </section>
            </div>
        </main>
    );
}
