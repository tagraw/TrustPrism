import { useState, useEffect } from "react";
import TicketCreate from "./tickets/TicketCreate";
import TicketDetail from "./tickets/TicketDetail";
import "./ProjectModal.css";
import "../pages/Admin.css";

const API = "http://localhost:5000";

export default function ProjectModal({ project, onClose, onViewInsights }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [stagingUrl, setStagingUrl] = useState(project?.staging_url || "");
    const [savingStagingUrl, setSavingStagingUrl] = useState(false);
    const [exportDateFrom, setExportDateFrom] = useState("");
    const [exportDateTo, setExportDateTo] = useState("");
    const [exporting, setExporting] = useState(false);

    // Tickets state
    const [tickets, setTickets] = useState([]);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    
    // Decode current user from JWT
    const currentUser = (() => {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return { ...payload, id: String(payload.id) };
        } catch { return {}; }
    })();

    useEffect(() => {
        if (project) fetchTickets();
    }, [project]);

    async function fetchTickets() {
        try {
            const res = await fetch(`${API}/api/tickets?game_id=${project.id}`, {
      credentials: "include",
                headers: {}
            });
            if (res.ok) setTickets(await res.json());
        } catch (e) { console.error(e); }
    }

    if (!project) return null;

    const status = project.status || 'draft';
    const isPublished = status === 'published';

    async function saveStagingUrl() {
        if (!stagingUrl.trim()) return;
        setSavingStagingUrl(true);
        try {
            const res = await fetch(`${API}/projects/${project.id}`, {
      credentials: "include",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({ staging_url: stagingUrl.trim() })
            });
            if (res.ok) {
                project.staging_url = stagingUrl.trim();
            }
        } catch (err) { console.error(err); }
        setSavingStagingUrl(false);
    }

    async function updateStatus(newStatus) {
        let msg = "Confirm action?";
        if (newStatus === "pending_review") msg = "Mark as Pending Review? Researcher will be notified to review.";
        if (newStatus === "draft") msg = "Return to draft and request changes from Admin?";
        if (newStatus === "publish_requested") msg = "Request publish? Admin will be notified to make the site live.";
        if (newStatus === "published") msg = "Publish this game? It will become visible in Live Games.";

        if (!confirm(msg)) return;

        try {
            const res = await fetch(`${API}/projects/${project.id}`, {
      credentials: "include",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const errData = await res.json();
                alert(errData.error || `Failed to update status to ${newStatus}`);
                return;
            }

            if (newStatus === "published") {
                alert("Game published!");
            } else {
                alert(`Status changed to ${newStatus.replace('_', ' ')}`);
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to update status.");
        }
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

                        {isPublished && (
                            <button className="pm-btn-approve" onClick={() => { }} style={{ cursor: 'default' }}>
                                <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>check_circle</span>
                                Published
                            </button>
                        )}

                        {!isPublished && (
                            <>
                                {/* Admin actions for draft */}
                                {currentUser.role === 'admin' && status === 'draft' && (
                                    <button className="pm-btn-approve" onClick={() => updateStatus("pending_review")}>
                                        <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>rate_review</span>
                                        Mark as Pending Review
                                    </button>
                                )}

                                {/* Researcher actions for pending_review */}
                                {currentUser.role === 'researcher' && status === 'pending_review' && (
                                    <>
                                        <button className="pm-btn-request" onClick={() => updateStatus("draft")}>
                                            <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>edit_note</span>
                                            Return to Draft
                                        </button>
                                        <button className="pm-btn-approve" onClick={() => updateStatus("publish_requested")}>
                                            <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>flight_takeoff</span>
                                            Request Publish
                                        </button>
                                    </>
                                )}

                                {/* Admin actions for publish_requested */}
                                {currentUser.role === 'admin' && (status === 'publish_requested' || status === 'approved') && (
                                    <button className="pm-btn-approve" onClick={() => updateStatus("published")}>
                                        <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>rocket_launch</span>
                                        Publish Game
                                    </button>
                                )}
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
                                                <span className="pm-info-label">Target Sample Size</span>
                                                <span className="pm-info-value">{project.target_sample_size || '—'}</span>
                                            </div>
                                            <div className="pm-info-item">
                                                <span className="pm-info-label">IRB Required</span>
                                                <span className="pm-info-value">{project.irb_required ? 'Yes' : 'No'}</span>
                                            </div>
                                            {project.irb_required && (
                                                <div className="pm-info-item">
                                                    <span className="pm-info-label">IRB Status</span>
                                                    <span className="pm-info-value">{project.irb_approved ? 'Approved ✅' : 'Pending ⏳'}</span>
                                                </div>
                                            )}
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
                                                <p style={{ color: '#0f172a', lineHeight: 1.6, margin: 0 }}>{project.description}</p>
                                            </div>
                                        )}


                                        {project.demographic_filters && (
                                            <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '8px', color: '#0f172a' }}>Participant Targeting</span>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
                                                    <div><strong style={{color: '#64748b'}}>Age Range:</strong> {project.demographic_filters.minAge} - {project.demographic_filters.maxAge}</div>
                                                    <div><strong style={{color: '#64748b'}}>Location:</strong> {project.demographic_filters.locationCountry || 'Any'} {project.demographic_filters.locationState ? `(${project.demographic_filters.locationState})` : ''}</div>
                                                    <div><strong style={{color: '#64748b'}}>Gender:</strong> {project.demographic_filters.gender?.join(', ') || 'Any'}</div>
                                                    <div><strong style={{color: '#64748b'}}>Race/Ethnicity:</strong> {project.demographic_filters.raceEthnicity?.join(', ') || 'Any'}</div>
                                                    {project.demographic_filters.customNotes && <div style={{gridColumn: '1 / -1'}}><strong style={{color: '#64748b'}}>Notes:</strong> {project.demographic_filters.customNotes}</div>}
                                                </div>
                                            </div>
                                        )}

                                        {project.data_collection_config && (
                                            <div style={{ marginTop: '1rem', background: '#f0f9ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '8px', color: '#0369a1' }}>Data Collection Configurations</span>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {Object.entries(project.data_collection_config).map(([key, val]) => val && (
                                                        <span key={key} style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {project.irb_required && project.irb_number && (
                                            <div style={{ marginTop: '1rem', background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                                <span className="pm-info-label" style={{ display: 'block', marginBottom: '8px', color: '#b45309' }}>IRB Protocol</span>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <strong style={{color: '#92400e'}}>Protocol Number:</strong> {project.irb_number}
                                                </div>
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
                                    <div className="pm-doc-card" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                                        {project.irb_document_url && (
                                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <strong style={{color: '#0f172a'}}>IRB Approval Document</strong>
                                                    <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>Protocol: {project.irb_number}</div>
                                                </div>
                                                <a href={`${API}${project.irb_document_url}`} target="_blank" rel="noreferrer" style={{ background: '#0ea5e9', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>View PDF</a>
                                            </div>
                                        )}

                                        {project.consent_form_url ? (
                                            <iframe
                                                src={`${API}${project.consent_form_url}`}
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


                                    </div>

                                    <div className="pm-doc-card" style={{ marginTop: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#0f172a' }}>CSV Columns</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {['created_at', 'event_type', 'input_tokens', 'output_tokens', 'ai_model', 'participant_id', 'prompt', 'response'].map(col => (
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
                                                params.set('format', 'csv');
                                                if (exportDateFrom) params.set('date_from', exportDateFrom);
                                                if (exportDateTo) params.set('date_to', exportDateTo);
                                                const res = await fetch(
                                                    `${API}/projects/${project.id}/export?${params}`, {
      credentials: "include", headers: {} }
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

                    {/* Right Sidebar — Tickets (replaced chat) */}
                    <aside className="pm-sidebar">
                        <div className="pm-sb-header">
                            <span>TICKETS</span>
                            <button
                                className="tickets-create-btn"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                                onClick={() => setShowCreateTicket(true)}
                            >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>add</span>
                                New
                            </button>
                        </div>

                        <div className="pm-tickets-list">
                            {tickets.length === 0 ? (
                                <div className="pm-tickets-empty">
                                    <span className="material-icons-round" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>confirmation_number</span>
                                    No tickets for this game yet
                                </div>
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
                    </aside>
                </div>

                {/* Ticket Create Modal */}
                {showCreateTicket && (
                    <TicketCreate
                        prefilledGameId={project.id}
                        onClose={() => setShowCreateTicket(false)}
                        onCreated={() => fetchTickets()}
                    />
                )}

                {/* Ticket Detail Modal */}
                {selectedTicketId && (
                    <TicketDetail
                        ticketId={selectedTicketId}
                        role={currentUser.role}
                        onClose={() => {
                            setSelectedTicketId(null);
                            fetchTickets();
                        }}
                    />
                )}
            </div>
        </div>
    );
}
