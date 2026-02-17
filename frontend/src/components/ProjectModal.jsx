import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./ProjectModal.css";

const SOCKET_URL = "http://localhost:5000";

export default function ProjectModal({ project, onClose, onViewInsights }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState("consent"); // consent, logic, description
    const socketRef = useRef(null);
    const token = localStorage.getItem("token");

    // Decode current user from JWT
    const currentUser = (() => {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return { ...payload, id: String(payload.id) };
        } catch { return {}; }
    })();

    useEffect(() => {
        if (!project) return;

        // Connect socket
        socketRef.current = io(SOCKET_URL, { transports: ["websocket", "polling"] });
        socketRef.current.emit("join_project", project.id);

        fetchMessages();

        // Listen for new messages (with deduplication)
        socketRef.current.on("new_message", (msg) => {
            setMessages(prev => {
                if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [project]);

    async function fetchMessages() {
        try {
            const res = await fetch(`http://localhost:5000/chat/projects/${project.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setMessages(await res.json());
        } catch (e) { console.error(e); }
    }

    async function sendMessage() {
        if (!newMessage.trim()) return;
        try {
            const res = await fetch(`http://localhost:5000/chat/projects/${project.id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMessage })
            });
            if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
            }
            setNewMessage("");
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
                                                    <p>You are being invited to participate in a research study titled &quot;{project.name}&quot;. The purpose of this study is to evaluate how users perceive transparency in large language model responses.</p>
                                                </div>
                                                <div className="pm-doc-section">
                                                    <h4>2. Procedures</h4>
                                                    <p>You will be asked to interact with an AI agent across 5 different scenarios. In each scenario, the AI will provide a suggestion, and you will rate your level of agreement and trust.</p>
                                                </div>
                                                <div className="pm-doc-section">
                                                    <h4>3. Data Privacy &amp; Anonymity</h4>
                                                    <p>All data collected is anonymized using TrustPrism&apos;s end-to-end encryption protocols. Your interaction logs will be assigned a unique ID.</p>
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
                                const isMe = String(m.sender_id) === String(currentUser.id);
                                const senderName = isMe ? "You" : `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown';
                                const roleLabel = m.role === 'admin' ? '(Admin)' : m.role === 'researcher' ? '(Researcher)' : '';
                                const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                                return (
                                    <div key={m.id || i} className="pm-chat-msg">
                                        <div className="pm-msg-meta" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                            {isMe ?
                                                <><span>{time}</span> <strong>You</strong></> :
                                                <><strong>{senderName} {roleLabel}</strong> <span>{time}</span></>
                                            }
                                        </div>
                                        <div className={`pm-msg-bubble ${isMe ? 'me' : 'admin'}`}>
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
