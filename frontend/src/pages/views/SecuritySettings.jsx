import { useState, useEffect } from "react";

const DEFAULT_SETTINGS = {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    mfaEnabled: false,
    apiRateLimit: 100,
    apiRateWindow: 60,
    maxApiKeysPerGame: 3,
    autoRevokeInactiveKeys: true,
    autoRevokeDays: 90,
    auditLogRetentionDays: 365,
    consentFormRequired: true,
    irbApprovalRequired: true,
    dataExportApproval: false
};

export default function SecuritySettings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);
    const token = localStorage.getItem("token");

    // Load settings from backend on mount
    useEffect(() => {
        fetch("http://localhost:5000/admin/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => { setSettings({ ...DEFAULT_SETTINGS, ...data }); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const update = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
        setError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:5000/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error("Failed to save");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError("Failed to save settings to the server.");
        }
        setSaving(false);
    };

    const handleReset = async () => {
        if (!confirm("Reset all settings to defaults? This will update the backend immediately.")) return;
        setSaving(true);
        try {
            const res = await fetch("http://localhost:5000/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(DEFAULT_SETTINGS)
            });
            if (res.ok) {
                setSettings(DEFAULT_SETTINGS);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            setError("Failed to reset settings.");
        }
        setSaving(false);
    };

    const cardStyle = {
        background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
        padding: "1.5rem", marginBottom: "1rem"
    };

    const labelStyle = {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 0", borderBottom: "1px solid #f1f5f9"
    };

    const labelTextStyle = { color: "#0f172a", fontSize: "0.9rem", fontWeight: 500 };
    const descStyle = { color: "#64748b", fontSize: "0.8rem", marginTop: "2px" };

    const inputStyle = {
        padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "6px",
        fontSize: "0.85rem", width: "80px", textAlign: "center", color: "#0f172a"
    };

    const toggleStyle = (on) => ({
        width: "44px", height: "24px", borderRadius: "12px", border: "none",
        background: on ? "#0ea5e9" : "#cbd5e1", cursor: "pointer", position: "relative",
        transition: "background 0.2s"
    });

    const toggleDotStyle = (on) => ({
        width: "18px", height: "18px", borderRadius: "50%", background: "white",
        position: "absolute", top: "3px", left: on ? "22px" : "4px",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
    });

    const sectionHeaderStyle = {
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px"
    };

    if (loading) return <div style={{ padding: "2rem", color: "#64748b" }}>Loading settings...</div>;

    return (
        <div style={{ padding: "1.5rem", maxWidth: "800px" }}>
            {/* Info Banner */}
            <div style={{
                background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px",
                padding: "12px 16px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px"
            }}>
                <span className="material-icons-round" style={{ color: "#0369a1", fontSize: "18px" }}>info</span>
                <span style={{ color: "#0369a1", fontSize: "0.85rem" }}>
                    These settings are enforced server-side. Changes affect password validation, login lockout, session timeout, and project submission policies across the entire system.
                </span>
            </div>

            {/* Save Bar */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "1rem", alignItems: "center" }}>
                {error && <span style={{ color: "#dc2626", fontSize: "0.85rem", marginRight: "auto" }}>{error}</span>}
                <button
                    onClick={handleReset}
                    disabled={saving}
                    style={{
                        padding: "8px 16px", border: "1px solid #e2e8f0", background: "white",
                        color: "#64748b", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500
                    }}
                >Reset to Defaults</button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "8px 20px", border: "none", background: saved ? "#16a34a" : "#0ea5e9",
                        color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                        opacity: saving ? 0.7 : 1
                    }}
                >{saving ? "Saving…" : saved ? "✓ Saved to Server" : "Save Settings"}</button>
            </div>

            {/* Authentication & Sessions */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <span className="material-icons-round" style={{ fontSize: "20px", color: "#0ea5e9" }}>lock</span>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Authentication & Sessions</h3>
                </div>
                <p style={{ ...descStyle, marginBottom: "8px" }}>Control login behavior, session duration, and account lockout policies.</p>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Session Timeout (minutes)</div>
                        <div style={descStyle}>JWT token expires after this duration — users must re-login</div>
                    </div>
                    <input type="number" min={5} max={480} value={settings.sessionTimeout}
                        onChange={e => update("sessionTimeout", parseInt(e.target.value) || 30)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Max Login Attempts</div>
                        <div style={descStyle}>Lock account after N consecutive failed attempts (tracked in login_attempts table)</div>
                    </div>
                    <input type="number" min={3} max={20} value={settings.maxLoginAttempts}
                        onChange={e => update("maxLoginAttempts", parseInt(e.target.value) || 5)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Lockout Duration (minutes)</div>
                        <div style={descStyle}>How long an account stays locked after exceeding max attempts</div>
                    </div>
                    <input type="number" min={1} max={1440} value={settings.lockoutDuration}
                        onChange={e => update("lockoutDuration", parseInt(e.target.value) || 15)}
                        style={inputStyle} />
                </div>

                <div style={{ ...labelStyle, borderBottom: "none" }}>
                    <div>
                        <div style={labelTextStyle}>Two-Factor Authentication</div>
                        <div style={descStyle}>Require MFA for all users (requires additional setup)</div>
                    </div>
                    <button style={toggleStyle(settings.mfaEnabled)}
                        onClick={() => update("mfaEnabled", !settings.mfaEnabled)}>
                        <div style={toggleDotStyle(settings.mfaEnabled)} />
                    </button>
                </div>
            </div>

            {/* Password Policy */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <span className="material-icons-round" style={{ fontSize: "20px", color: "#ea580c" }}>password</span>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Password Policy</h3>
                </div>
                <p style={{ ...descStyle, marginBottom: "8px" }}>Enforced on registration and password reset — backend validates against these rules.</p>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Minimum Length</div>
                        <div style={descStyle}>Minimum password character count</div>
                    </div>
                    <input type="number" min={6} max={32} value={settings.passwordMinLength}
                        onChange={e => update("passwordMinLength", parseInt(e.target.value) || 8)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Require Uppercase Letter</div>
                        <div style={descStyle}>At least one A-Z character</div>
                    </div>
                    <button style={toggleStyle(settings.passwordRequireUppercase)}
                        onClick={() => update("passwordRequireUppercase", !settings.passwordRequireUppercase)}>
                        <div style={toggleDotStyle(settings.passwordRequireUppercase)} />
                    </button>
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Require Number</div>
                        <div style={descStyle}>At least one 0-9 digit</div>
                    </div>
                    <button style={toggleStyle(settings.passwordRequireNumber)}
                        onClick={() => update("passwordRequireNumber", !settings.passwordRequireNumber)}>
                        <div style={toggleDotStyle(settings.passwordRequireNumber)} />
                    </button>
                </div>

                <div style={{ ...labelStyle, borderBottom: "none" }}>
                    <div>
                        <div style={labelTextStyle}>Require Special Character</div>
                        <div style={descStyle}>At least one !@#$%^&* character</div>
                    </div>
                    <button style={toggleStyle(settings.passwordRequireSpecial)}
                        onClick={() => update("passwordRequireSpecial", !settings.passwordRequireSpecial)}>
                        <div style={toggleDotStyle(settings.passwordRequireSpecial)} />
                    </button>
                </div>
            </div>

            {/* API Key Management */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <span className="material-icons-round" style={{ fontSize: "20px", color: "#16a34a" }}>vpn_key</span>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>API Key Management</h3>
                </div>
                <p style={{ ...descStyle, marginBottom: "8px" }}>Control API rate limits and key lifecycle.</p>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Rate Limit (requests)</div>
                        <div style={descStyle}>Maximum API calls per window</div>
                    </div>
                    <input type="number" min={10} max={10000} value={settings.apiRateLimit}
                        onChange={e => update("apiRateLimit", parseInt(e.target.value) || 100)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Rate Window (seconds)</div>
                        <div style={descStyle}>Time window for rate limiting</div>
                    </div>
                    <input type="number" min={10} max={3600} value={settings.apiRateWindow}
                        onChange={e => update("apiRateWindow", parseInt(e.target.value) || 60)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Max Keys Per Game</div>
                        <div style={descStyle}>Maximum active API keys per game</div>
                    </div>
                    <input type="number" min={1} max={10} value={settings.maxApiKeysPerGame}
                        onChange={e => update("maxApiKeysPerGame", parseInt(e.target.value) || 3)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Auto-Revoke Inactive Keys</div>
                        <div style={descStyle}>Automatically revoke keys not used within the configured period</div>
                    </div>
                    <button style={toggleStyle(settings.autoRevokeInactiveKeys)}
                        onClick={() => update("autoRevokeInactiveKeys", !settings.autoRevokeInactiveKeys)}>
                        <div style={toggleDotStyle(settings.autoRevokeInactiveKeys)} />
                    </button>
                </div>

                {settings.autoRevokeInactiveKeys && (
                    <div style={{ ...labelStyle, borderBottom: "none", paddingLeft: "24px" }}>
                        <div>
                            <div style={labelTextStyle}>Inactivity Period (days)</div>
                            <div style={descStyle}>Revoke keys unused for this many days</div>
                        </div>
                        <input type="number" min={7} max={365} value={settings.autoRevokeDays}
                            onChange={e => update("autoRevokeDays", parseInt(e.target.value) || 90)}
                            style={inputStyle} />
                    </div>
                )}
            </div>

            {/* Data & Compliance */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <span className="material-icons-round" style={{ fontSize: "20px", color: "#0369a1" }}>gavel</span>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Data & Compliance</h3>
                </div>
                <p style={{ ...descStyle, marginBottom: "8px" }}>Manage audit logs, consent requirements, and data governance policies — enforced on project submission.</p>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Audit Log Retention (days)</div>
                        <div style={descStyle}>How long to keep AI interaction logs</div>
                    </div>
                    <input type="number" min={30} max={3650} value={settings.auditLogRetentionDays}
                        onChange={e => update("auditLogRetentionDays", parseInt(e.target.value) || 365)}
                        style={inputStyle} />
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>Consent Form Required</div>
                        <div style={descStyle}>Researchers must upload a consent form PDF before submitting for review</div>
                    </div>
                    <button style={toggleStyle(settings.consentFormRequired)}
                        onClick={() => update("consentFormRequired", !settings.consentFormRequired)}>
                        <div style={toggleDotStyle(settings.consentFormRequired)} />
                    </button>
                </div>

                <div style={labelStyle}>
                    <div>
                        <div style={labelTextStyle}>IRB Approval Required</div>
                        <div style={descStyle}>Researchers must indicate IRB approval before submitting for review</div>
                    </div>
                    <button style={toggleStyle(settings.irbApprovalRequired)}
                        onClick={() => update("irbApprovalRequired", !settings.irbApprovalRequired)}>
                        <div style={toggleDotStyle(settings.irbApprovalRequired)} />
                    </button>
                </div>

                <div style={{ ...labelStyle, borderBottom: "none" }}>
                    <div>
                        <div style={labelTextStyle}>Data Export Requires Admin Approval</div>
                        <div style={descStyle}>Researchers must request admin approval before exporting data</div>
                    </div>
                    <button style={toggleStyle(settings.dataExportApproval)}
                        onClick={() => update("dataExportApproval", !settings.dataExportApproval)}>
                        <div style={toggleDotStyle(settings.dataExportApproval)} />
                    </button>
                </div>
            </div>
        </div>
    );
}
