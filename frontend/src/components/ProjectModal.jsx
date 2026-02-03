import { useState, useEffect } from "react";
import io from "socket.io-client";

// Initialize socket outside component to prevent multiple connections
const socket = io("http://localhost:5000");

export default function ProjectModal({ project, onClose, onViewInsights }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState("overview"); // overview, data

    useEffect(() => {
        if (!project) return;

        // Join project room
        socket.emit("join_project", project.id);

        fetchMessages();

        // Listen for new messages
        socket.on("new_message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socket.off("new_message");
            // socket.emit("leave_project", project.id); // If backend handled leaving
        };
    }, [project]);

    async function fetchMessages() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/chat/projects/${project.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setMessages(await res.json());
        } catch (e) { console.error(e); }
    }

    async function sendMessage() {
        if (!newMessage.trim()) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:5000/chat/projects/${project.id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMessage })
            });
            setNewMessage("");
        } catch (err) {
            console.error(err);
        }
    }

    if (!project) return null;

    const isPublished = project.status === 'published';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{project.name} <span className={`badge ${project.status}`}>{project.status}</span></h2>
                    <button className="close-btn material-icons-round" onClick={onClose}>close</button>
                </header>

                <div className="modal-body">
                    {isPublished ? (
                        /* PUBLISHED VIEW */
                        <div className="published-view">
                            <div className="stats-preview">
                                <div className="stat-box">
                                    <h3>1,240</h3>
                                    <p>Participants</p>
                                </div>
                                <div className="stat-box">
                                    <h3>85%</h3>
                                    <p>Completion Rate</p>
                                </div>
                            </div>

                            <div className="actions-row">
                                <button className="primary-btn" onClick={onViewInsights}>View Full Data Insights</button>
                                <button className="secondary-btn" onClick={() => alert("Downloading CSV...")}>
                                    <span className="material-icons-round">download</span>
                                    Export Anonymized CSV
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* DRAFT / PENDING VIEW */
                        <div className="draft-view">
                            <div className="info-panel">
                                <h3>Project Details</h3>
                                <p><strong>Type:</strong> {project.game_type}</p>
                                <p><strong>Description:</strong> {project.description}</p>
                                <p><strong>Conditions:</strong> <pre>{project.experimental_conditions && JSON.stringify(project.experimental_conditions, null, 2)}</pre></p>

                                {project.status === 'pending_review' && (
                                    <div className="review-actions">
                                        <button className="primary-btn">Preview Game</button>
                                        <p className="status-text">Pending Admin Approval</p>
                                    </div>
                                )}
                            </div>

                            <div className="chat-panel">
                                <h3>Admin Collaboration</h3>
                                <div className="messages-list">
                                    {messages.length === 0 ? <p className="empty">No messages yet.</p> : (
                                        messages.map((m, i) => (
                                            <div key={m.id || i} className={`message-bubble ${m.role === 'admin' ? 'admin' : 'me'}`}>
                                                <strong>{m.first_name}:</strong> {m.message}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="message-input">
                                    <input
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    />
                                    <button onClick={sendMessage}>Send</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
