import { useState, useEffect } from "react";

export default function AuditMonitor() {
    const [data, setData] = useState({ logs: [], spikes: [], flagged: [], spike_threshold: 20 });
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("spikes");
    const [flaggingId, setFlaggingId] = useState(null);
    const [disablingId, setDisablingId] = useState(null);
    const token = localStorage.getItem("token");

    const fetchAudit = async () => {
        try {
            const res = await fetch("http://localhost:5000/admin/audit", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { fetchAudit(); }, []);

    const handleFlag = async (logId, flagged, reason) => {
        setFlaggingId(logId);
        try {
            await fetch(`http://localhost:5000/admin/ai-logs/${logId}/flag`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ flagged, flag_reason: reason })
            });
            fetchAudit();
        } catch (err) { console.error(err); }
        setFlaggingId(null);
    };

    const handleDisableGame = async (gameId, gameName) => {
        if (!confirm(`Disable "${gameName}"? This will also revoke all API keys.`)) return;
        setDisablingId(gameId);
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${gameId}/disable`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) { alert("Game disabled."); fetchAudit(); }
        } catch (err) { console.error(err); }
        setDisablingId(null);
    };

    const handleRevokeKey = async (keyId) => {
        if (!confirm("Revoke this API key?")) return;
        try {
            const res = await fetch(`http://localhost:5000/admin/api-keys/${keyId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) { alert("API key revoked."); fetchAudit(); }
        } catch (err) { console.error(err); }
    };

    if (loading) return <div style={{ padding: "2rem", color: "#64748b" }}>Loading audit data...</div>;

    const sectionStyle = (key) => ({
        padding: "8px 16px",
        border: "none",
        borderBottom: activeSection === key ? "2px solid #0ea5e9" : "2px solid transparent",
        background: "none",
        color: activeSection === key ? "#0ea5e9" : "#64748b",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: "0.9rem"
    });

    return (
        <div style={{ padding: "1.5rem" }}>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span className="material-icons-round" style={{ color: "#ea580c", fontSize: "20px" }}>warning</span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>Usage Spikes</span>
                    </div>
                    <h2 style={{ margin: 0, color: "#ea580c", fontSize: "2rem" }}>{data.spikes.length}</h2>
                    <small style={{ color: "#94a3b8" }}>Sessions with &gt;{data.spike_threshold} AI events</small>
                </div>
                <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span className="material-icons-round" style={{ color: "#dc2626", fontSize: "20px" }}>flag</span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>Flagged Logs</span>
                    </div>
                    <h2 style={{ margin: 0, color: "#dc2626", fontSize: "2rem" }}>{data.flagged.length}</h2>
                    <small style={{ color: "#94a3b8" }}>Abusive/suspicious prompts</small>
                </div>
                <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span className="material-icons-round" style={{ color: "#0ea5e9", fontSize: "20px" }}>analytics</span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>Total AI Logs</span>
                    </div>
                    <h2 style={{ margin: 0, color: "#0f172a", fontSize: "2rem" }}>{data.logs.length}</h2>
                    <small style={{ color: "#94a3b8" }}>Recent interactions (last 500)</small>
                </div>
            </div>

            {/* Section Tabs */}
            <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                <button style={sectionStyle("spikes")} onClick={() => setActiveSection("spikes")}>
                    Usage Spikes ({data.spikes.length})
                </button>
                <button style={sectionStyle("flagged")} onClick={() => setActiveSection("flagged")}>
                    Flagged ({data.flagged.length})
                </button>
                <button style={sectionStyle("logs")} onClick={() => setActiveSection("logs")}>
                    All AI Logs ({data.logs.length})
                </button>
            </div>

            {/* ── Usage Spikes ── */}
            {activeSection === "spikes" && (
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    {data.spikes.length === 0 ? (
                        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No usage spikes detected. All sessions are within normal limits.</p>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Game", "Session", "Events", "Prompt Tokens", "Completion Tokens", "Last Event", "Actions"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.spikes.map(s => (
                                    <tr key={s.session_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px 12px", color: "#0f172a", fontSize: "0.9rem", fontWeight: 500 }}>{s.game_name}</td>
                                        <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.8rem", fontFamily: "monospace" }}>{s.session_id?.substring(0, 8)}…</td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: "10px", fontWeight: 700, fontSize: "0.85rem" }}>{s.event_count}</span>
                                        </td>
                                        <td style={{ padding: "10px 12px", color: "#334155", fontSize: "0.85rem" }}>{s.total_prompt_tokens?.toLocaleString() || "—"}</td>
                                        <td style={{ padding: "10px 12px", color: "#334155", fontSize: "0.85rem" }}>{s.total_completion_tokens?.toLocaleString() || "—"}</td>
                                        <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.8rem" }}>{new Date(s.last_event).toLocaleString()}</td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <button
                                                onClick={() => handleDisableGame(s.game_id, s.game_name)}
                                                disabled={disablingId === s.game_id}
                                                style={{
                                                    padding: "4px 10px", border: "1px solid #dc2626", background: "transparent",
                                                    color: "#dc2626", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
                                                }}
                                            >
                                                {disablingId === s.game_id ? "Disabling…" : "Disable Game"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Flagged Logs ── */}
            {activeSection === "flagged" && (
                <div>
                    {data.flagged.length === 0 ? (
                        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No flagged interactions. Use the AI Logs tab to flag suspicious entries.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {data.flagged.map(f => (
                                <div key={f.id} style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1px solid #fecaca" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <span className="material-icons-round" style={{ color: "#dc2626", fontSize: "18px" }}>flag</span>
                                            <strong style={{ color: "#0f172a" }}>{f.game_name}</strong>
                                            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>• {f.event_type}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                onClick={() => handleFlag(f.id, false, null)}
                                                style={{ padding: "3px 8px", border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                                            >Unflag</button>
                                            <button
                                                onClick={() => handleDisableGame(f.game_id, f.game_name)}
                                                style={{ padding: "3px 8px", border: "1px solid #dc2626", background: "transparent", color: "#dc2626", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                                            >Disable Game</button>
                                        </div>
                                    </div>
                                    {f.flag_reason && (
                                        <p style={{ margin: "4px 0 8px 26px", color: "#dc2626", fontSize: "0.85rem" }}>
                                            <strong>Reason:</strong> {f.flag_reason}
                                        </p>
                                    )}
                                    {f.payload && (
                                        <pre style={{ margin: "0 0 0 26px", color: "#334155", fontSize: "0.8rem", background: "#f8fafc", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", maxHeight: "120px", overflow: "auto" }}>
                                            {JSON.stringify(f.payload, null, 2)}
                                        </pre>
                                    )}
                                    <small style={{ marginLeft: "26px", color: "#94a3b8" }}>{new Date(f.created_at).toLocaleString()}</small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── All AI Logs ── */}
            {activeSection === "logs" && (
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    {data.logs.length === 0 ? (
                        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No AI interaction logs yet.</p>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Game", "Event", "Model", "Tokens", "Latency", "Time", "Actions"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.logs.slice(0, 100).map(log => (
                                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9", background: log.flagged ? "#fef2f2" : "transparent" }}>
                                        <td style={{ padding: "8px 12px", color: "#0f172a", fontSize: "0.85rem", fontWeight: 500 }}>{log.game_name}</td>
                                        <td style={{ padding: "8px 12px" }}>
                                            <span style={{ padding: "2px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8rem", color: "#334155" }}>{log.event_type}</span>
                                        </td>
                                        <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "0.85rem" }}>{log.ai_model || "—"}</td>
                                        <td style={{ padding: "8px 12px", color: "#334155", fontSize: "0.85rem" }}>{(log.prompt_tokens || 0) + (log.completion_tokens || 0)}</td>
                                        <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "0.85rem" }}>{log.latency_ms ? `${log.latency_ms}ms` : "—"}</td>
                                        <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: "0.8rem" }}>{new Date(log.created_at).toLocaleString()}</td>
                                        <td style={{ padding: "8px 12px" }}>
                                            {log.flagged ? (
                                                <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>Flagged</span>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt("Reason for flagging:");
                                                        if (reason !== null) handleFlag(log.id, true, reason);
                                                    }}
                                                    disabled={flaggingId === log.id}
                                                    style={{
                                                        padding: "3px 8px", border: "1px solid #e2e8f0", background: "transparent",
                                                        color: "#64748b", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem"
                                                    }}
                                                >
                                                    {flaggingId === log.id ? "…" : "Flag"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
