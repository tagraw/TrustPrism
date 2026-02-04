import { useState, useEffect } from "react";
import io from "socket.io-client";
import "./ProjectModal.css";

// Initialize socket outside component to prevent multiple connections
const socket = io("http://localhost:5000");

export default function ProjectModal({ project, onClose, onViewInsights }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState("consent"); // consent, logic, description

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
            // Optimistic update handled by socket or fetch
        } catch (err) {
            console.error(err);
        }
    }

    if (!project) return null;

    const status = project.status || 'draft';
    const isPublished = status === 'published';


    return (
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-content" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <header className="pm-header">
                    <div className="pm-header-left">
                        <div className="pm-icon">
                            <span className="material-icons-round">security_update_good</span>
                        </div>
                        <div className="pm-title-stack">
                            <h2>{project.name}</h2>
                            <div className="pm-meta-row">
                                <span className={`pm-badge ${status}`}>{status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pm-header-actions">
                        <button className="pm-btn-preview">
                            <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>visibility</span>
                            Preview Game
                        </button>

                        {!isPublished && (
                            <>
                                <button className="pm-btn-request">
                                    <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>notes</span>
                                    Request Changes
                                </button>
                                <button className="pm-btn-approve" onClick={() => alert("Approved!")}>
                                    <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>check_circle</span>
                                    Approve Study
                                </button>
                            </>
                        )}
                        <span className="material-icons-round" style={{ color: '#cbd5e1', cursor: 'pointer' }}>notifications_active</span>
                        <button className="material-icons-round" onClick={onClose} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}>close</button>
                    </div>
                </header>

                <div className="pm-body">
                    {/* Left Main Content */}
                    <main className="pm-main">
                        <div className="pm-tabs">
                            <button className={`pm-tab ${activeTab === 'consent' ? 'active' : ''}`} onClick={() => setActiveTab('consent')}>
                                Consent Form
                            </button>
                            <button className={`pm-tab ${activeTab === 'logic' ? 'active' : ''}`} onClick={() => setActiveTab('logic')}>
                                AI Interaction Logic
                            </button>
                            <button className={`pm-tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
                                Study Description
                            </button>
                        </div>

                        <div className="pm-content-view">
                            {activeTab === 'consent' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>description</span>
                                        <strong>Participant Consent Form</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        {project.consent_form_url ? (
                                            <iframe
                                                src={`http://localhost:5000${project.consent_form_url}`}
                                                className="pm-pdf-viewer"
                                                title="Consent Form PDF"
                                            />
                                        ) : (
                                            <>
                                                <div className="pm-doc-section">
                                                    <h4>1. Purpose of the Study</h4>
                                                    <p>You are being invited to participate in a research study titled "{project.name}". The purpose of this study is to evaluate how users perceive transparency in large language model responses.</p>
                                                </div>
                                                <div className="pm-doc-section">
                                                    <h4>2. Procedures</h4>
                                                    <p>You will be asked to interact with an AI agent across 5 different scenarios. In each scenario, the AI will provide a suggestion, and you will rate your level of agreement and trust.</p>
                                                </div>
                                                <div className="pm-doc-section">
                                                    <h4>3. Data Privacy & Anonymity</h4>
                                                    <p>All data collected is anonymized using TrustPrism's end-to-end encryption protocols. Your interaction logs will be assigned a unique ID.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'logic' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>psychology</span>
                                        <strong>AI Configuration (Preview)</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                            {JSON.stringify(project.experimental_conditions || {}, null, 2)}
                                        </pre>
                                    </div>
                                </>
                            )}

                            {activeTab === 'description' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>info</span>
                                        <strong>Detailed Description</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <p>{project.description || "No description provided."}</p>
                                        <p><strong>Game Type:</strong> {project.game_type}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </main>

                    {/* Right Sidebar (Chat) */}
                    <aside className="pm-sidebar">
                        <div className="pm-sb-header">
                            <span>COLLABORATION CHAT</span>
                            <span className="pm-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}>ADMIN REVIEW</span>
                        </div>

                        <div className="pm-chat-list">
                            {messages.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>Start the discussion...</p>}

                            {messages.map((m, i) => {
                                const isMe = m.role !== 'admin'; // In this context "Me" is the researcher viewing this?
                                // Actually, if we are the user, we are 'me'. We need a way to know WHO is viewing.
                                // For visual purposes:
                                const isAdmin = (m.role === 'admin' || m.role === 'Reviewer');

                                return (
                                    <div key={i} className="pm-chat-msg">
                                        <div className="pm-msg-meta" style={{ justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                                            {(!isAdmin) ?
                                                <><span>10:42 AM</span> <strong>You</strong></> :
                                                <><strong>Dr. Aris Thorne (Admin)</strong> <span>10:42 AM</span></>
                                            }
                                        </div>
                                        <div className={`pm-msg-bubble ${isAdmin ? 'admin' : 'me'}`}>
                                            {m.message}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pm-chat-input-area">
                            <div className="pm-chat-input-wrapper">
                                <span className="material-icons-round" style={{ color: '#cbd5e1', fontSize: '1.2rem', transform: 'rotate(45deg)' }}>attach_file</span>
                                <input
                                    className="pm-chat-input"
                                    placeholder="Type your message or feedback..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                />
                                <button className="pm-btn-send" onClick={sendMessage}>
                                    <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>send</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
