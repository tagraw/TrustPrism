import { useState, useEffect, useCallback } from "react";

const CHANGE_TYPE_META = {
    security_config:    { label: "Security Config",    color: "#dc2626", bg: "#fef2f2", icon: "security" },
    access_rights:      { label: "Access Rights",      color: "#14b8a6", bg: "#ccfbf1", icon: "manage_accounts" },
    system_config:      { label: "System Config",      color: "#0369a1", bg: "#f0f9ff", icon: "settings" },
    game_lifecycle:     { label: "Game Lifecycle",     color: "#059669", bg: "#f0fdf4", icon: "videogame_asset" },
    account_management: { label: "Account Mgmt",       color: "#b45309", bg: "#fffbeb", icon: "badge" },
    infrastructure:     { label: "Infrastructure",     color: "#475569", bg: "#f8fafc", icon: "dns" },
};

const APPROVAL_META = {
    pending:     { label: "Pending Review", color: "#b45309", bg: "#fffbeb", icon: "schedule" },
    approved:    { label: "Approved",       color: "#059669", bg: "#f0fdf4", icon: "check_circle" },
    disapproved: { label: "Disapproved",    color: "#dc2626", bg: "#fef2f2", icon: "cancel" },
};

const API = "http://localhost:5000";

export default function ChangeControl() {
    const [tab, setTab] = useState("pending");
    const [ccrs, setCcrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState(null); // { ccr, action: 'approve'|'disapprove' }
    const [actionNotes, setActionNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitForm, setSubmitForm] = useState({
        title: "", description: "", change_type: "", security_impact: "", game_id: "", priority: "medium"
    });
    const [submitStatus, setSubmitStatus] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [systemTime, setSystemTime] = useState(null);

    const fetchCCRs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tickets/change-requests`, { credentials: "include" });
            if (res.ok) setCcrs(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchCCRs(); }, [fetchCCRs]);

    useEffect(() => {
        fetch(`${API}/admin/system-time`, { credentials: "include" })
            .then(r => r.json()).then(setSystemTime).catch(() => {});
    }, []);

    const pending    = ccrs.filter(c => c.approval_status === "pending");
    const history    = ccrs.filter(c => c.approval_status !== "pending");

    const handleAction = async () => {
        if (!actionModal) return;
        if (actionModal.action === "disapprove" && !actionNotes.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/tickets/${actionModal.ccr.id}/${actionModal.action}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approval_notes: actionNotes })
            });
            if (res.ok) { setActionModal(null); setActionNotes(""); fetchCCRs(); }
            else {
                const d = await res.json();
                alert(d.error || "Action failed");
            }
        } catch (e) { console.error(e); }
        setSubmitting(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true); setSubmitStatus(null);
        try {
            const res = await fetch(`${API}/api/tickets/change-requests`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitForm)
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitStatus({ ok: true, msg: "Change Request submitted. Admins have been notified." });
                setSubmitForm({ title: "", description: "", change_type: "", security_impact: "", game_id: "", priority: "medium" });
                fetchCCRs();
            } else {
                setSubmitStatus({ ok: false, msg: data.error || "Submission failed" });
            }
        } catch (e) { setSubmitStatus({ ok: false, msg: "Network error" }); }
        setSubmitting(false);
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const tabStyle = (key) => ({
        padding: "8px 18px", border: "none", cursor: "pointer",
        fontWeight: 600, fontSize: "0.88rem",
        background: "none",
        color: tab === key ? "#0ea5e9" : "#64748b",
        borderBottom: tab === key ? "2px solid #0ea5e9" : "2px solid transparent",
        transition: "color 0.15s, border-color 0.15s",
    });

    const card = {
        background: "white", borderRadius: "14px",
        border: "1px solid #e2e8f0", padding: "1.25rem",
        marginBottom: "0.75rem", transition: "box-shadow 0.15s",
    };

    const inputStyle = {
        width: "100%", padding: "9px 12px",
        border: "1px solid #e2e8f0", borderRadius: "8px",
        fontSize: "0.875rem", color: "#0f172a",
        background: "#f8fafc", boxSizing: "border-box",
        fontFamily: "inherit",
    };

    const Badge = ({ type, map }) => {
        const m = map[type] || { label: type, color: "#64748b", bg: "#f1f5f9", icon: "circle" };
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "3px 10px", borderRadius: "20px",
                background: m.bg, color: m.color,
                fontSize: "0.75rem", fontWeight: 700,
            }}>
                <span className="material-icons-round" style={{ fontSize: "13px" }}>{m.icon}</span>
                {m.label}
            </span>
        );
    };

    return (
        <div style={{ padding: "1.5rem", maxWidth: "960px" }}>

            {/* NTP Banner */}
            {systemTime && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: "10px", padding: "10px 16px", marginBottom: "1.25rem"
                }}>
                    <span className="material-icons-round" style={{ color: "#16a34a", fontSize: "18px" }}>schedule</span>
                    <div>
                        <span style={{ color: "#15803d", fontSize: "0.8rem", fontWeight: 600 }}>NTP-Synchronized Server Time: </span>
                        <span style={{ color: "#15803d", fontSize: "0.8rem", fontFamily: "monospace" }}>
                            {new Date(systemTime.server_time).toUTCString()}
                        </span>
                        <span style={{ color: "#86efac", fontSize: "0.75rem", marginLeft: "8px" }}>
                            ({systemTime.timezone})
                        </span>
                    </div>
                </div>
            )}

            {/* Summary Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
                {[
                    { label: "Pending Review", count: pending.length, color: "#b45309", bg: "#fffbeb", icon: "pending_actions" },
                    { label: "Approved", count: history.filter(c => c.approval_status === "approved").length, color: "#059669", bg: "#f0fdf4", icon: "check_circle" },
                    { label: "Disapproved", count: history.filter(c => c.approval_status === "disapproved").length, color: "#dc2626", bg: "#fef2f2", icon: "cancel" },
                ].map(s => (
                    <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span className="material-icons-round" style={{ color: s.color, fontSize: "18px" }}>{s.icon}</span>
                            <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color }}>{s.count}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "1.25rem", gap: "4px" }}>
                <button style={tabStyle("pending")} onClick={() => setTab("pending")}>
                    Pending Review {pending.length > 0 && <span style={{ background: "#fef3c7", color: "#b45309", borderRadius: "10px", padding: "1px 7px", marginLeft: "4px", fontSize: "0.72rem" }}>{pending.length}</span>}
                </button>
                <button style={tabStyle("history")} onClick={() => setTab("history")}>Change History</button>
                <button style={tabStyle("submit")} onClick={() => setTab("submit")}>Submit Request</button>
            </div>

            {loading && <div style={{ color: "#64748b", padding: "2rem", textAlign: "center" }}>Loading change requests…</div>}

            {/* ── Pending Review ── */}
            {!loading && tab === "pending" && (
                pending.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        <span className="material-icons-round" style={{ fontSize: "48px", display: "block", marginBottom: "8px" }}>task_alt</span>
                        No change requests pending review.
                    </div>
                ) : pending.map(ccr => (
                    <div key={ccr.id} style={{ ...card, borderLeft: `4px solid ${CHANGE_TYPE_META[ccr.change_type]?.color || "#e2e8f0"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                                    <Badge type={ccr.change_type} map={CHANGE_TYPE_META} />
                                    <Badge type={ccr.priority} map={{ low: { label: "Low", color: "#64748b", bg: "#f1f5f9", icon: "arrow_downward" }, medium: { label: "Medium", color: "#b45309", bg: "#fffbeb", icon: "remove" }, high: { label: "High", color: "#dc2626", bg: "#fef2f2", icon: "arrow_upward" } }} />
                                </div>
                                <h3 style={{ margin: "0 0 4px", color: "#0f172a", fontSize: "1rem" }}>{ccr.title}</h3>
                                <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                                    By <strong>{ccr.creator_first_name} {ccr.creator_last_name}</strong>
                                    {ccr.game_name && <> · Study: <strong>{ccr.game_name}</strong></>}
                                    {" · "}{new Date(ccr.created_at).toLocaleString()}
                                </div>
                                <p style={{ margin: "8px 0 0", color: "#334155", fontSize: "0.875rem", lineHeight: 1.5 }}>{ccr.description}</p>

                                {/* Security Impact expandable */}
                                <button
                                    onClick={() => setExpandedId(expandedId === ccr.id ? null : ccr.id)}
                                    style={{ margin: "8px 0 0", border: "none", background: "none", color: "#0ea5e9", cursor: "pointer", fontSize: "0.8rem", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>
                                        {expandedId === ccr.id ? "expand_less" : "expand_more"}
                                    </span>
                                    {expandedId === ccr.id ? "Hide" : "View"} Security Impact Assessment
                                </button>
                                {expandedId === ccr.id && (
                                    <div style={{ marginTop: "8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px" }}>
                                        <div style={{ color: "#b45309", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
                                            Security Impact Assessment
                                        </div>
                                        <p style={{ margin: 0, color: "#78350f", fontSize: "0.875rem", lineHeight: 1.6 }}>{ccr.security_impact}</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                                <button
                                    onClick={() => { setActionModal({ ccr, action: "approve" }); setActionNotes(""); }}
                                    style={{ padding: "7px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>check</span> Approve
                                </button>
                                <button
                                    onClick={() => { setActionModal({ ccr, action: "disapprove" }); setActionNotes(""); }}
                                    style={{ padding: "7px 16px", background: "white", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>close</span> Disapprove
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* ── Change History ── */}
            {!loading && tab === "history" && (
                history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        <span className="material-icons-round" style={{ fontSize: "48px", display: "block", marginBottom: "8px" }}>history</span>
                        No reviewed change requests yet.
                    </div>
                ) : (
                    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Request", "Type", "Submitter", "Outcome", "Reviewed By", "Date", "Notes"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(ccr => (
                                    <tr key={ccr.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600, fontSize: "0.875rem", maxWidth: "180px" }}>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ccr.title}</div>
                                        </td>
                                        <td style={{ padding: "10px 14px" }}><Badge type={ccr.change_type} map={CHANGE_TYPE_META} /></td>
                                        <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.82rem" }}>
                                            {ccr.creator_first_name} {ccr.creator_last_name}
                                        </td>
                                        <td style={{ padding: "10px 14px" }}><Badge type={ccr.approval_status} map={APPROVAL_META} /></td>
                                        <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.82rem" }}>
                                            {ccr.approver_first_name ? `${ccr.approver_first_name} ${ccr.approver_last_name}` : "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                                            {ccr.approved_at ? new Date(ccr.approved_at).toLocaleDateString() : "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.78rem", maxWidth: "200px" }}>
                                            <span title={ccr.approval_notes || ""} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {ccr.approval_notes || "—"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ── Submit Change Request ── */}
            {tab === "submit" && (
                <div style={{ ...card, maxWidth: "680px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
                        <span className="material-icons-round" style={{ color: "#0ea5e9", fontSize: "22px" }}>add_task</span>
                        <div>
                            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Submit Configuration Change Request</h3>
                            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.8rem" }}>
                                TACC §3.04 — All configuration-controlled changes require review and approval before implementation.
                            </p>
                        </div>
                    </div>

                    {submitStatus && (
                        <div style={{
                            padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem",
                            background: submitStatus.ok ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${submitStatus.ok ? "#bbf7d0" : "#fca5a5"}`,
                            color: submitStatus.ok ? "#15803d" : "#dc2626", fontSize: "0.875rem"
                        }}>
                            {submitStatus.msg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                Change Title *
                            </label>
                            <input style={inputStyle} placeholder="Brief title for the proposed change"
                                value={submitForm.title} required
                                onChange={e => setSubmitForm(p => ({ ...p, title: e.target.value }))} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                    Change Type *
                                </label>
                                <select style={{ ...inputStyle }} value={submitForm.change_type} required
                                    onChange={e => setSubmitForm(p => ({ ...p, change_type: e.target.value }))}>
                                    <option value="">Select type…</option>
                                    {Object.entries(CHANGE_TYPE_META).map(([v, m]) => (
                                        <option key={v} value={v}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                    Priority
                                </label>
                                <select style={{ ...inputStyle }} value={submitForm.priority}
                                    onChange={e => setSubmitForm(p => ({ ...p, priority: e.target.value }))}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                Description of Proposed Change *
                            </label>
                            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                                placeholder="Describe what will change and why it is needed"
                                value={submitForm.description} required
                                onChange={e => setSubmitForm(p => ({ ...p, description: e.target.value }))} />
                        </div>

                        <div>
                            <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                Security Impact Assessment *
                                <span style={{ color: "#dc2626" }}> (required per TACC §3.04)</span>
                            </label>
                            <textarea style={{ ...inputStyle, minHeight: "100px", resize: "vertical", borderColor: "#fde68a", background: "#fffbeb" }}
                                placeholder="Describe the security implications of this change. Consider: authentication, access control, data integrity, availability, and auditability."
                                value={submitForm.security_impact} required
                                onChange={e => setSubmitForm(p => ({ ...p, security_impact: e.target.value }))} />
                        </div>

                        <div>
                            <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                                Related Study ID (optional)
                            </label>
                            <input style={inputStyle} placeholder="Study UUID (leave blank for system-wide changes)"
                                value={submitForm.game_id}
                                onChange={e => setSubmitForm(p => ({ ...p, game_id: e.target.value }))} />
                        </div>

                        <button type="submit" disabled={submitting} style={{
                            padding: "10px 24px", background: submitting ? "#94a3b8" : "#0ea5e9",
                            color: "white", border: "none", borderRadius: "8px",
                            fontWeight: 700, fontSize: "0.9rem", cursor: submitting ? "not-allowed" : "pointer",
                            alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "6px"
                        }}>
                            <span className="material-icons-round" style={{ fontSize: "18px" }}>send</span>
                            {submitting ? "Submitting…" : "Submit for Review"}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Approve / Disapprove Modal ── */}
            {actionModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "2rem",
                        width: "500px", maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                            <span className="material-icons-round" style={{ color: actionModal.action === "approve" ? "#16a34a" : "#dc2626", fontSize: "24px" }}>
                                {actionModal.action === "approve" ? "check_circle" : "cancel"}
                            </span>
                            <h3 style={{ margin: 0, color: "#0f172a" }}>
                                {actionModal.action === "approve" ? "Approve" : "Disapprove"} Change Request
                            </h3>
                        </div>

                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{actionModal.ccr.title}</div>
                            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "2px" }}>
                                {CHANGE_TYPE_META[actionModal.ccr.change_type]?.label} · Priority: {actionModal.ccr.priority}
                            </div>
                        </div>

                        <label style={{ display: "block", color: "#374151", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                            {actionModal.action === "disapprove"
                                ? "Rationale (required) — document your security reasoning:"
                                : "Approval notes (optional):"}
                        </label>
                        <textarea
                            autoFocus
                            style={{
                                width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
                                borderRadius: "8px", minHeight: "90px", resize: "vertical",
                                fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box"
                            }}
                            placeholder={actionModal.action === "disapprove"
                                ? "Explain why this change is being disapproved and what security concerns exist…"
                                : "Optional notes for the submitter…"}
                            value={actionNotes}
                            onChange={e => setActionNotes(e.target.value)}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "1rem" }}>
                            <button onClick={() => setActionModal(null)}
                                style={{ padding: "8px 18px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", borderRadius: "8px", cursor: "pointer", fontWeight: 500 }}>
                                Cancel
                            </button>
                            <button onClick={handleAction} disabled={submitting || (actionModal.action === "disapprove" && !actionNotes.trim())}
                                style={{
                                    padding: "8px 20px", border: "none",
                                    background: actionModal.action === "approve" ? "#16a34a" : "#dc2626",
                                    color: "white", borderRadius: "8px", cursor: "pointer",
                                    fontWeight: 700, opacity: submitting ? 0.7 : 1
                                }}>
                                {submitting ? "Processing…" : actionModal.action === "approve" ? "Confirm Approval" : "Confirm Disapproval"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
