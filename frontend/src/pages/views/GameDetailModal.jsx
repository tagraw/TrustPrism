import { useState, useEffect, useContext } from "react";
import AuthContext from "../../context/AuthContext";
import TicketCreate from "../../components/tickets/TicketCreate";
import TicketDetail from "../../components/tickets/TicketDetail";
import "../../components/tickets/Tickets.css";
import "../Admin.css";

const API = "http://localhost:5000";

const GameDetailModal = ({ game, onClose }) => {
    const [apiKey, setApiKey] = useState(null);
    const [apiKeys, setApiKeys] = useState([]);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [keyCopied, setKeyCopied] = useState(false);
    const [stagingUrl, setStagingUrl] = useState(game.staging_url || "");
    const [savingStagingUrl, setSavingStagingUrl] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // Tickets state
    const [tickets, setTickets] = useState([]);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    
    const { auth: currentUser } = useContext(AuthContext);

    useEffect(() => {
        fetchApiKeys();
        fetchTickets();
    }, [game.id]);

    async function fetchTickets() {
        try {
            const res = await fetch(`${API}/api/tickets?game_id=${game.id}`, {
      credentials: "include",
                headers: {}
            });
            if (res.ok) setTickets(await res.json());
        } catch (err) { console.error(err); }
    }



    const handleMarkPendingReview = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/status`, {
      credentials: "include",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({ status: "pending_review" })
            });
            if (res.ok) {
                alert("Marked as Pending Review. Researcher notified.");
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update status");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchApiKeys = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/api-keys`, {
      credentials: "include",
                headers: {}
            });
            if (res.ok) setApiKeys(await res.json());
        } catch (err) { console.error(err); }
    };

    const generateApiKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/generate-key`, {
      credentials: "include",
                method: "POST",
                headers: {}
            });
            if (res.ok) {
                const data = await res.json();
                setApiKey(data.api_key);
                fetchApiKeys();
            }
        } catch (err) { console.error(err); }
        setGeneratingKey(false);
    };

    const copyApiKey = () => {
        navigator.clipboard.writeText(apiKey);
        setKeyCopied(true);
        setTimeout(() => setKeyCopied(false), 2000);
    };

    const saveStagingUrl = async () => {
        if (!stagingUrl.trim()) return;
        setSavingStagingUrl(true);
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/staging-url`, {
      credentials: "include",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({ staging_url: stagingUrl.trim() })
            });
            if (res.ok) {
                game.staging_url = stagingUrl.trim();
            }
        } catch (err) { console.error(err); }
        setSavingStagingUrl(false);
    };

    const handlePublish = async () => {
        const productionUrl = prompt("Enter the production URL for this game:", stagingUrl || "");
        if (!productionUrl) return;

        setPublishing(true);
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/status`, {
      credentials: "include",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({ status: "published", production_url: productionUrl })
            });
            if (res.ok) {
                alert("Game published successfully!");
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to publish");
            }
        } catch (err) { console.error(err); }
        setPublishing(false);
    };

    // Parse experimental_conditions safely
    const conditions = (() => {
        if (!game.experimental_conditions) return null;
        if (typeof game.experimental_conditions === "string") {
            try { return JSON.parse(game.experimental_conditions); } catch { return null; }
        }
        return game.experimental_conditions;
    })();

    const activeKey = apiKeys.find(k => k.is_active);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="game-detail-modal" onClick={e => e.stopPropagation()}>
                {/* Left: Details */}
                <div className="detail-pane">
                    <div className="detail-header">
                        <h2>{game.name}</h2>
                        <button className="icon-btn" onClick={onClose} title="Close">
                            <span className="material-icons-round">close</span>
                        </button>
                    </div>

                    <div className="detail-meta">
                        <span className={`pill ${game.status === 'published' ? 'green' : game.status === 'publish_requested' || game.status === 'approved' ? 'blue' : game.status === 'pending_review' ? 'orange' : 'gray'}`}>
                            {game.status?.replace("_", " ")}
                        </span>
                        <span className="meta-item">
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>science</span>
                            {game.game_type?.replace('_', ' ')}
                        </span>
                        {game.category && (
                            <span className="meta-item">
                                <span className="material-icons-round" style={{ fontSize: "16px" }}>category</span>
                                {game.category.replace('_', ' ')}
                            </span>
                        )}
                        {game.irb_approval && (
                            <span className="meta-item irb-badge">IRB Approved ✓</span>
                        )}
                    </div>

                    <div className="detail-section">
                        <h4>Researcher</h4>
                        <p>{game.researcher_name} — {game.researcher_email}</p>
                    </div>

                    <div className="detail-section">
                        <h4>Description</h4>
                        <p>{game.description || "No description provided."}</p>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="detail-section">
                        <h4>Basic Information</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                            {game.category && (
                                <div>
                                    <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>Category</small>
                                    <p style={{ margin: '4px 0 0 0' }}>{game.category.replace('_', ' ')}</p>
                                </div>
                            )}
                            {game.age_group && (
                                <div>
                                    <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>Age Group</small>
                                    <p style={{ margin: '4px 0 0 0' }}>{game.age_group}</p>
                                </div>
                            )}
                            {game.target_sample_size && (
                                <div>
                                    <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>Target Sample Size</small>
                                    <p style={{ margin: '4px 0 0 0' }}>{game.target_sample_size} participants</p>
                                </div>
                            )}
                            <div>
                                <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>IRB Approval</small>
                                <p style={{ margin: '4px 0 0 0' }}>{game.irb_approval ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Research Tags */}
                    {game.research_tags && game.research_tags.length > 0 && (
                        <div className="detail-section">
                            <h4>Research Tags</h4>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {game.research_tags.map((tag, i) => (
                                    <span key={i} style={{
                                        padding: '3px 10px',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Configuration */}
                    <div className="detail-section">
                        <h4>AI Configuration</h4>
                        <p style={{ marginBottom: '8px' }}>
                            <strong>Usage Type:</strong>{' '}
                            {game.ai_usage_type === 'none' ? 'None' :
                                game.ai_usage_type === 'assistive' ? 'Assistive — AI helps players' :
                                    game.ai_usage_type === 'adversarial' ? 'Adversarial — AI opposes players' :
                                        game.ai_usage_type === 'adaptive' ? 'Adaptive — AI adjusts difficulty' :
                                            game.ai_usage_type === 'generative' ? 'Generative — AI generates content' :
                                                game.ai_usage_type || '—'}
                        </p>
                    </div>

                    {/* Consent Form */}
                    {game.consent_form_url && (
                        <div className="detail-section">
                            <h4>Consent Form</h4>
                            <iframe
                                src={`http://localhost:5000${game.consent_form_url}`}
                                style={{ width: '100%', height: '400px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}
                                title="Consent Form PDF"
                            />
                            <a href={`http://localhost:5000${game.consent_form_url}`} target="_blank" rel="noreferrer" className="consent-link" style={{ marginTop: '8px', display: 'inline-flex' }}>
                                <span className="material-icons-round">open_in_new</span>
                                Open in New Tab
                            </a>
                        </div>
                    )}

                    {conditions && (
                        <div className="detail-section">
                            <h4>Game Mechanics & Experimental Conditions</h4>
                            <pre className="conditions-json">{JSON.stringify(conditions, null, 2)}</pre>
                        </div>
                    )}

                    <div className="detail-section">
                        <h4>Dates</h4>
                        <p>Created: {new Date(game.created_at).toLocaleString()}</p>
                        {game.updated_at && <p>Updated: {new Date(game.updated_at).toLocaleString()}</p>}
                    </div>

                    {/* Developer API Key Section */}
                    <div className="detail-section api-key-section">
                        <h4>
                            <span className="material-icons-round" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>vpn_key</span>
                            Developer API Key
                        </h4>

                        {apiKey ? (
                            <div className="api-key-reveal">
                                <p className="api-key-warning">
                                    <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle' }}>warning</span>
                                    {" "}This key is shown <strong>once</strong>. Copy it now.
                                </p>
                                <div className="api-key-box">
                                    <code>{apiKey}</code>
                                    <button className="api-key-copy" onClick={copyApiKey}>
                                        <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                            {keyCopied ? "check" : "content_copy"}
                                        </span>
                                        {keyCopied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>
                        ) : activeKey ? (
                            <div className="api-key-existing">
                                <span className="api-key-prefix">{activeKey.key_prefix}•••</span>
                                <span className="api-key-env">{activeKey.environment}</span>
                                <small style={{ color: '#94a3b8' }}>Created {new Date(activeKey.created_at).toLocaleDateString()}</small>
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No API key generated yet.</p>
                        )}

                        <button
                            className="generate-key-btn"
                            onClick={generateApiKey}
                            disabled={generatingKey}
                        >
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                {activeKey ? "refresh" : "add"}
                            </span>
                            {generatingKey ? "Generating..." : activeKey ? "Regenerate Key" : "Generate API Key"}
                        </button>
                    </div>

                    {/* Staging URL & Preview Section */}
                    <div className="detail-section staging-section">
                        <h4>
                            <span className="material-icons-round" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>language</span>
                            Staging URL
                        </h4>
                        <div className="staging-url-row">
                            <input
                                type="url"
                                className="staging-url-input"
                                value={stagingUrl}
                                onChange={e => setStagingUrl(e.target.value)}
                                placeholder="https://staging.game-name.example.com"
                            />
                            <button
                                className="staging-save-btn"
                                onClick={saveStagingUrl}
                                disabled={savingStagingUrl || !stagingUrl.trim() || stagingUrl.trim() === game.staging_url}
                            >
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                    {savingStagingUrl ? "hourglass_empty" : "save"}
                                </span>
                                {savingStagingUrl ? "Saving..." : "Save"}
                            </button>
                        </div>

                        {(stagingUrl.trim() || game.staging_url) && (
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
                    {showPreview && (stagingUrl.trim() || game.staging_url) && (
                        <div className="preview-iframe-container">
                            <div className="preview-iframe-header">
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>monitor</span>
                                <span>Live Preview</span>
                                <a href={stagingUrl.trim() || game.staging_url} target="_blank" rel="noreferrer" className="preview-open-external">
                                    <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                                </a>
                            </div>
                            <iframe
                                src={stagingUrl.trim() || game.staging_url}
                                title={`Preview: ${game.name}`}
                                className="preview-iframe"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    {game.status === "draft" && (
                        <div className="detail-actions">
                            <button className="approve-btn" onClick={handleMarkPendingReview} style={{ backgroundColor: '#f59e0b' }}>
                                <span className="material-icons-round">rate_review</span>
                                Mark as Pending Review
                            </button>
                        </div>
                    )}

                    {(game.status === "publish_requested" || game.status === "approved") && (
                        <div className="detail-actions">
                            <button className="publish-btn" onClick={handlePublish} disabled={publishing}>
                                <span className="material-icons-round">rocket_launch</span>
                                {publishing ? "Publishing..." : "Publish Game"}
                            </button>
                        </div>
                    )}

                    {game.status === "published" && game.production_url && (
                        <div className="detail-section">
                            <h4>
                                <span className="material-icons-round" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>public</span>
                                Production URL
                            </h4>
                            <a href={game.production_url} target="_blank" rel="noreferrer" className="consent-link">
                                <span className="material-icons-round">link</span>
                                {game.production_url}
                            </a>
                        </div>
                    )}
                </div>

                {/* Right: Tickets (replaced chat) */}
                <div className="chat-pane">
                    <div className="chat-header">
                        <span className="material-icons-round">confirmation_number</span>
                        <h4>Tickets</h4>
                        <button
                            className="tickets-create-btn"
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', marginLeft: 'auto' }}
                            onClick={() => setShowCreateTicket(true)}
                        >
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>add</span>
                            New
                        </button>
                    </div>

                    <div className="chat-messages" style={{ gap: '0.5rem' }}>
                        {tickets.length === 0 ? (
                            <p className="chat-empty">No tickets yet for this game.</p>
                        ) : (
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
                </div>

                {/* Ticket Create Modal */}
                {showCreateTicket && (
                    <TicketCreate
                        prefilledGameId={game.id}
                        onClose={() => setShowCreateTicket(false)}
                        onCreated={() => fetchTickets()}
                    />
                )}

                {/* Ticket Detail Modal */}
                {selectedTicketId && (
                    <TicketDetail
                        ticketId={selectedTicketId}
                        role="admin"
                        onClose={() => {
                            setSelectedTicketId(null);
                            fetchTickets();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default GameDetailModal;
