import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./ProjectModal.css";
import "../pages/Admin.css";

const SOCKET_URL = "http://localhost:5000";

export default function ProjectModal({ project, onClose, onViewInsights }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState("overview"); // overview, consent, logic, description, preview
    const [stagingUrl, setStagingUrl] = useState(project?.staging_url || "");
    const [savingStagingUrl, setSavingStagingUrl] = useState(false);
    const [exportDateFrom, setExportDateFrom] = useState("");
    const [exportDateTo, setExportDateTo] = useState("");
    const [exportCompletedOnly, setExportCompletedOnly] = useState(false);
    const [exporting, setExporting] = useState(false);
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
    const isApproved = status === 'approved';

    async function saveStagingUrl() {
        if (!stagingUrl.trim()) return;
        setSavingStagingUrl(true);
        try {
            const res = await fetch(`http://localhost:5000/projects/${project.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ staging_url: stagingUrl.trim() })
            });
            if (res.ok) {
                project.staging_url = stagingUrl.trim();
            }
        } catch (err) { console.error(err); }
        setSavingStagingUrl(false);
    }

    async function handlePublish() {
        if (!confirm("Publish this game? It will become visible in Live Games.")) return;
        try {
            const res = await fetch(`http://localhost:5000/projects/${project.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "published" })
            });
            if (res.ok) {
                alert("Game published!");
                onClose();
            }
        } catch (err) { console.error(err); }
    }


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
                        <button
                            className={`pm-btn-preview ${activeTab === 'preview' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'preview' ? 'consent' : 'preview')}
                        >
                            <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                                {activeTab === 'preview' ? 'visibility_off' : 'visibility'}
                            </span>
                            {activeTab === 'preview' ? 'Hide Preview' : 'Preview Game'}
                        </button>

                        {isApproved && (
                            <button className="pm-btn-approve" onClick={handlePublish}>
                                <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>rocket_launch</span>
                                Publish Game
                            </button>
                        )}

                        {!isPublished && !isApproved && (
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
                            <button className={`pm-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                                Overview
                            </button>
                            <button className={`pm-tab ${activeTab === 'consent' ? 'active' : ''}`} onClick={() => setActiveTab('consent')}>
                                Consent Form
                            </button>
                            <button className={`pm-tab ${activeTab === 'logic' ? 'active' : ''}`} onClick={() => setActiveTab('logic')}>
                                AI Configuration
                            </button>
                            <button className={`pm-tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
                                Study Details
                            </button>
                            {status === 'published' && (
                                <button className={`pm-tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
                                    Export Data
                                </button>
                            )}
                        </div>

                        <div className="pm-content-view">

                            {/* ── Overview Tab ── */}
                            {activeTab === 'overview' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>dashboard</span>
                                        <strong>Project Overview</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <div className="pm-info-grid">
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Game Name</span>
                                                <span className="pm-info-value">{project.name}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Game Type</span>
                                                <span className="pm-info-value">{project.game_type?.replace('_', ' ') || '—'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Category</span>
                                                <span className="pm-info-value">{project.category?.replace('_', ' ') || '—'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Age Group</span>
                                                <span className="pm-info-value">{project.age_group || '—'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Target Sample Size</span>
                                                <span className="pm-info-value">{project.target_sample_size || '—'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">IRB Approval</span>
                                                <span className="pm-info-value">{project.irb_approval ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Status</span>
                                                <span className={`pm-badge ${status}`} style={{ display: 'inline-block' }}>{status.replace('_', ' ')}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">Created</span>
                                                <span className="pm-info-value">{project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        {project.research_tags && project.research_tags.length > 0 && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '6px' }}>Research Tags</span>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {project.research_tags.map((tag, i) => (
                                                        <span key={i} className="pm-tag">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {project.description && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '6px' }}>Description</span>
                                                <p style={{ color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{project.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Consent Form Tab ── */}
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
                                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
                                                No consent form uploaded.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── AI Configuration Tab ── */}
                            {activeTab === 'logic' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>psychology</span>
                                        <strong>AI Configuration</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <div className="pm-info-grid">
                                            <div className="pm-info-item" style={{ gridColumn: '1 / -1' }}>
                                                <span className="pm-info-label">AI Usage Type</span>
                                                <span className="pm-info-value" style={{ textTransform: 'capitalize' }}>
                                                    {project.ai_usage_type === 'none' ? 'None' :
                                                        project.ai_usage_type === 'assistive' ? 'Assistive — AI helps players' :
                                                            project.ai_usage_type === 'adversarial' ? 'Adversarial — AI opposes players' :
                                                                project.ai_usage_type === 'adaptive' ? 'Adaptive — AI adjusts difficulty' :
                                                                    project.ai_usage_type === 'generative' ? 'Generative — AI generates content' :
                                                                        project.ai_usage_type || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {project.experimental_conditions && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '6px' }}>Game Mechanics & Experimental Conditions</span>
                                                <pre style={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: "'Fira Code', monospace",
                                                    fontSize: '0.85rem',
                                                    background: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    color: '#a5b4fc',
                                                    margin: 0,
                                                    overflowX: 'auto'
                                                }}>
                                                    {typeof project.experimental_conditions === 'string'
                                                        ? project.experimental_conditions
                                                        : JSON.stringify(project.experimental_conditions, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Study Details Tab ── */}
                            {activeTab === 'description' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>info</span>
                                        <strong>Study Details</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <div className="pm-doc-section">
                                            <h4>Game Description</h4>
                                            <p>{project.description || "No description provided."}</p>
                                        </div>
                                        <div className="pm-doc-section">
                                            <h4>Game Type</h4>
                                            <p>{project.game_type?.replace('_', ' ') || '—'}</p>
                                        </div>
                                        {project.researcher_name && (
                                            <div className="pm-doc-section">
                                                <h4>Researcher</h4>
                                                <p>{project.researcher_name} {project.researcher_email ? `(${project.researcher_email})` : ''}</p>
                                            </div>
                                        )}
                                        {project.staging_url && (
                                            <div className="pm-doc-section">
                                                <h4>Staging URL</h4>
                                                <p><a href={project.staging_url} target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>{project.staging_url}</a></p>
                                            </div>
                                        )}
                                        {project.production_url && (
                                            <div className="pm-doc-section">
                                                <h4>Production URL</h4>
                                                <p><a href={project.production_url} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>{project.production_url}</a></p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'preview' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>language</span>
                                        <strong>Game Preview</strong>
                                    </div>
                                    <div className="pm-doc-card">
                                        <div className="staging-url-row" style={{ marginBottom: '12px' }}>
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

                                        {(stagingUrl.trim() || project.staging_url) ? (
                                            <div className="preview-iframe-container">
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
                                        ) : (
                                            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '2rem' }}>
                                                Enter a staging URL above and click Save to preview the game.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Export Data Tab ── */}
                            {activeTab === 'export' && (
                                <>
                                    <div className="pm-doc-title">
                                        <span className="material-icons-round" style={{ color: '#64748b' }}>download</span>
                                        <strong>Export Anonymized Data</strong>
                                    </div>

                                    <div className="pm-doc-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <span className="material-icons-round" style={{ color: '#16a34a', fontSize: '20px', marginTop: '2px' }}>verified_user</span>
                                            <div>
                                                <strong style={{ color: '#166534' }}>Privacy-Safe Export</strong>
                                                <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                                    All participant IDs are hashed with SHA-256. No names, emails, or IP addresses are included.
                                                    Data is ready for statistical modeling, machine learning, or academic publication.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pm-doc-card">
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Filter Options</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Date From</label>
                                                <input
                                                    type="date"
                                                    value={exportDateFrom}
                                                    onChange={e => setExportDateFrom(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                                                        borderRadius: '6px', fontSize: '0.9rem', color: '#334155'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Date To</label>
                                                <input
                                                    type="date"
                                                    value={exportDateTo}
                                                    onChange={e => setExportDateTo(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                                                        borderRadius: '6px', fontSize: '0.9rem', color: '#334155'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={exportCompletedOnly}
                                                    onChange={e => setExportCompletedOnly(e.target.checked)}
                                                    style={{ width: '16px', height: '16px', accentColor: '#0ea5e9' }}
                                                />
                                                Only completed sessions
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pm-doc-card" style={{ marginTop: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#0f172a' }}>CSV Columns</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {['hashed_user_id', 'session_id', 'started_at', 'ended_at', 'duration_seconds', 'score', 'completion_status', 'event_count', 'ai_event_count', 'ai_model', 'avg_latency_ms'].map(col => (
                                                <span key={col} style={{
                                                    padding: '3px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                                                    borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569'
                                                }}>{col}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            setExporting(true);
                                            try {
                                                const params = new URLSearchParams();
                                                if (exportDateFrom) params.set('date_from', exportDateFrom);
                                                if (exportDateTo) params.set('date_to', exportDateTo);
                                                if (exportCompletedOnly) params.set('min_completion', '100');
                                                const res = await fetch(
                                                    `http://localhost:5000/projects/${project.id}/export?${params}`,
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                if (!res.ok) {
                                                    const err = await res.json();
                                                    alert(err.error || 'Export failed');
                                                    return;
                                                }
                                                const blob = await res.blob();
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export.csv';
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            } catch (err) { console.error(err); alert('Export failed'); }
                                            setExporting(false);
                                        }}
                                        disabled={exporting}
                                        style={{
                                            marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '12px 24px', background: '#0ea5e9', color: 'white', border: 'none',
                                            borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                                            width: '100%', justifyContent: 'center',
                                            opacity: exporting ? 0.7 : 1
                                        }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: '20px' }}>
                                            {exporting ? 'hourglass_empty' : 'file_download'}
                                        </span>
                                        {exporting ? 'Exporting...' : 'Download Anonymized CSV'}
                                    </button>
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
