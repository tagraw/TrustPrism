import { useState } from "react";

const SECTIONS = [
    {
        id: "quickstart",
        title: "Quick Start",
        icon: "rocket_launch"
    },
    {
        id: "init",
        title: "Initialization",
        icon: "play_arrow"
    },
    {
        id: "sessions",
        title: "Session Management",
        icon: "login"
    },
    {
        id: "events",
        title: "Event Tracking",
        icon: "timeline"
    },
    {
        id: "ai",
        title: "AI Proxy",
        icon: "smart_toy"
    },
    {
        id: "logging",
        title: "What Gets Logged",
        icon: "storage"
    }
];

export default function SDKDocs() {
    const [activeSection, setActiveSection] = useState("quickstart");
    const [copied, setCopied] = useState(null);

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const codeBlockStyle = {
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "16px",
        borderRadius: "8px",
        fontSize: "0.82rem",
        fontFamily: "'Fira Code', 'Consolas', monospace",
        overflowX: "auto",
        lineHeight: 1.6,
        position: "relative"
    };

    const copyBtnStyle = {
        position: "absolute",
        top: "8px",
        right: "8px",
        padding: "3px 8px",
        border: "1px solid #334155",
        background: "#1e293b",
        color: "#94a3b8",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "0.7rem",
        display: "flex",
        alignItems: "center",
        gap: "4px"
    };

    const tableStyle = {
        width: "100%", borderCollapse: "collapse", fontSize: "0.85rem"
    };

    const thStyle = {
        textAlign: "left", padding: "10px 12px", background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase"
    };

    const tdStyle = {
        padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155"
    };

    const sectionCard = {
        background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.5rem", marginBottom: "1rem"
    };

    return (
        <div style={{ padding: "1.5rem", display: "flex", gap: "1.5rem" }}>
            {/* Sidebar Nav */}
            <div style={{ width: "200px", flexShrink: 0 }}>
                <div style={{ position: "sticky", top: "1.5rem" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>SDK Reference</h4>
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                padding: "8px 12px", border: "none", borderRadius: "8px",
                                background: activeSection === s.id ? "#f0f9ff" : "transparent",
                                color: activeSection === s.id ? "#0369a1" : "#64748b",
                                fontWeight: activeSection === s.id ? 600 : 400,
                                cursor: "pointer", fontSize: "0.85rem", textAlign: "left",
                                marginBottom: "2px"
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: "18px" }}>{s.icon}</span>
                            {s.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Quick Start */}
                {activeSection === "quickstart" && (
                    <div style={sectionCard}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                            <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#0ea5e9" }}>rocket_launch</span>
                            Quick Start
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "1rem", lineHeight: 1.6 }}>
                            Integrate your game with TrustPrism in 5 lines. The SDK handles session management,
                            event telemetry, and AI proxy with full server-side audit logging.
                        </p>

                        <div style={{ marginBottom: "1rem" }}>
                            <h4 style={{ margin: "0 0 8px 0", color: "#334155" }}>Installation</h4>
                            <div style={{ ...codeBlockStyle }}>
                                <button style={copyBtnStyle} onClick={() => copyCode('npm install @trustprism/sdk', 'install')}>
                                    {copied === 'install' ? '✓' : 'Copy'}
                                </button>
                                <code>{`npm install @trustprism/sdk`}</code>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: "0 0 8px 0", color: "#334155" }}>Full Example</h4>
                            <div style={{ ...codeBlockStyle }}>
                                <button style={copyBtnStyle} onClick={() => copyCode(`import TrustPrism from "@trustprism/sdk";

const tp = TrustPrism.init({
  apiKey: "tp_dev_abc123...",
  gameId: "your-game-uuid",
  baseUrl: "http://localhost:5000",
  debug: true
});

// Start session
const session = await tp.startSession({ participantId: "player-uuid" });

// Track events
await tp.trackEvent("level_started", { level: 1, difficulty: "hard" });
await tp.trackEvent("hint_shown", { hint_type: "directional" });

// AI proxy (fully logged)
const result = await tp.ai.generate({
  prompt: "The player is stuck on level 3. Suggest a hint.",
  systemPrompt: "You are a helpful game assistant.",
  model: "gpt-4",
  temperature: 0.7
});
console.log(result.response);

// End session
await tp.endSession({ score: 42 });`, 'quickstart')}>
                                    {copied === 'quickstart' ? '✓ Copied' : 'Copy'}
                                </button>
                                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{`import TrustPrism from "@trustprism/sdk";

const tp = TrustPrism.init({
  apiKey: "tp_dev_abc123...",
  gameId: "your-game-uuid",
  baseUrl: "http://localhost:5000",
  debug: true
});

// Start session
const session = await tp.startSession({ participantId: "player-uuid" });

// Track events
await tp.trackEvent("level_started", { level: 1, difficulty: "hard" });
await tp.trackEvent("hint_shown", { hint_type: "directional" });

// AI proxy (fully logged)
const result = await tp.ai.generate({
  prompt: "The player is stuck on level 3. Suggest a hint.",
  systemPrompt: "You are a helpful game assistant.",
  model: "gpt-4",
  temperature: 0.7
});
console.log(result.response);

// End session
await tp.endSession({ score: 42 });`}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Initialization */}
                {activeSection === "init" && (
                    <div style={sectionCard}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                            <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#0ea5e9" }}>play_arrow</span>
                            TrustPrism.init(config)
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "1rem" }}>Creates and returns a new SDK instance.</p>

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Parameter</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Required</th>
                                    <th style={thStyle}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td style={tdStyle}><code>apiKey</code></td><td style={tdStyle}>string</td><td style={tdStyle}>✅</td><td style={tdStyle}>Your API key (Admin → Game Detail → Generate Key)</td></tr>
                                <tr><td style={tdStyle}><code>gameId</code></td><td style={tdStyle}>string</td><td style={tdStyle}>✅</td><td style={tdStyle}>UUID of your registered game</td></tr>
                                <tr><td style={tdStyle}><code>baseUrl</code></td><td style={tdStyle}>string</td><td style={tdStyle}>—</td><td style={tdStyle}>Backend URL (default: <code>http://localhost:5000</code>)</td></tr>
                                <tr><td style={tdStyle}><code>debug</code></td><td style={tdStyle}>boolean</td><td style={tdStyle}>—</td><td style={tdStyle}>Log SDK calls to console (default: <code>false</code>)</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Sessions */}
                {activeSection === "sessions" && (
                    <>
                        <div style={sectionCard}>
                            <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                                <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#16a34a" }}>login</span>
                                tp.startSession(options)
                            </h2>
                            <p style={{ color: "#64748b", marginBottom: "1rem" }}>
                                Start a game session. <strong>Must be called before</strong> <code>trackEvent()</code> or <code>ai.generate()</code>.
                            </p>
                            <table style={tableStyle}>
                                <thead><tr><th style={thStyle}>Parameter</th><th style={thStyle}>Type</th><th style={thStyle}>Description</th></tr></thead>
                                <tbody>
                                    <tr><td style={tdStyle}><code>participantId</code></td><td style={tdStyle}>string</td><td style={tdStyle}>UUID of the participant/player</td></tr>
                                </tbody>
                            </table>
                            <p style={{ marginTop: "12px", color: "#334155", fontSize: "0.85rem" }}>
                                <strong>Returns:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{"{ sessionId, startedAt }"}</code>
                            </p>
                        </div>

                        <div style={sectionCard}>
                            <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                                <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#dc2626" }}>logout</span>
                                tp.endSession(options?)
                            </h2>
                            <p style={{ color: "#64748b", marginBottom: "1rem" }}>End the current session. Optionally record a final score.</p>
                            <table style={tableStyle}>
                                <thead><tr><th style={thStyle}>Parameter</th><th style={thStyle}>Type</th><th style={thStyle}>Description</th></tr></thead>
                                <tbody>
                                    <tr><td style={tdStyle}><code>score</code></td><td style={tdStyle}>number</td><td style={tdStyle}>Final score (optional)</td></tr>
                                </tbody>
                            </table>
                            <p style={{ marginTop: "12px", color: "#334155", fontSize: "0.85rem" }}>
                                <strong>Returns:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{"{ sessionId, endedAt, score }"}</code>
                            </p>
                        </div>

                        <div style={{ ...sectionCard, background: "#f8fafc" }}>
                            <h4 style={{ margin: "0 0 8px 0", color: "#334155" }}>Utilities</h4>
                            <div style={{ ...codeBlockStyle, fontSize: "0.85rem" }}>
                                <pre style={{ margin: 0 }}>{`tp.sessionId        // Current session ID (or null)
tp.isSessionActive  // Boolean — is a session running?`}</pre>
                            </div>
                        </div>
                    </>
                )}

                {/* Event Tracking */}
                {activeSection === "events" && (
                    <div style={sectionCard}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                            <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#ea580c" }}>timeline</span>
                            tp.trackEvent(eventType, data?)
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "1rem" }}>Track any game event. Written to TrustPrism's activity logs.</p>

                        <table style={tableStyle}>
                            <thead><tr><th style={thStyle}>Parameter</th><th style={thStyle}>Type</th><th style={thStyle}>Description</th></tr></thead>
                            <tbody>
                                <tr><td style={tdStyle}><code>eventType</code></td><td style={tdStyle}>string</td><td style={tdStyle}>Event name (e.g. <code>"hint_shown"</code>, <code>"user_decision"</code>)</td></tr>
                                <tr><td style={tdStyle}><code>data</code></td><td style={tdStyle}>object</td><td style={tdStyle}>Arbitrary event data to attach</td></tr>
                            </tbody>
                        </table>
                        <p style={{ marginTop: "12px", color: "#334155", fontSize: "0.85rem" }}>
                            <strong>Returns:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{"{ eventId, trackedAt }"}</code>
                        </p>

                        <h4 style={{ margin: "1.5rem 0 8px 0", color: "#334155" }}>Example Events</h4>
                        <div style={codeBlockStyle}>
                            <pre style={{ margin: 0 }}>{`await tp.trackEvent("level_started", { level: 1, difficulty: "hard" });
await tp.trackEvent("hint_shown", { hint_type: "directional", ai_confidence: 0.85 });
await tp.trackEvent("user_decision", { choice: "cooperate", reaction_time_ms: 2300 });
await tp.trackEvent("ai_recommendation_accepted", { was_correct: true });`}</pre>
                        </div>
                    </div>
                )}

                {/* AI Proxy */}
                {activeSection === "ai" && (
                    <div style={sectionCard}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                            <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#0ea5e9" }}>smart_toy</span>
                            tp.ai.generate(options)
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "1rem" }}>
                            Proxy an AI call through TrustPrism. The full request/response audit trail is logged server-side.
                        </p>

                        <table style={tableStyle}>
                            <thead><tr><th style={thStyle}>Parameter</th><th style={thStyle}>Type</th><th style={thStyle}>Default</th><th style={thStyle}>Description</th></tr></thead>
                            <tbody>
                                <tr><td style={tdStyle}><code>prompt</code></td><td style={tdStyle}>string</td><td style={tdStyle}>—</td><td style={tdStyle}>The prompt text (required)</td></tr>
                                <tr><td style={tdStyle}><code>systemPrompt</code></td><td style={tdStyle}>string</td><td style={tdStyle}>—</td><td style={tdStyle}>System instruction</td></tr>
                                <tr><td style={tdStyle}><code>model</code></td><td style={tdStyle}>string</td><td style={tdStyle}><code>"gpt-4"</code></td><td style={tdStyle}>LLM model</td></tr>
                                <tr><td style={tdStyle}><code>provider</code></td><td style={tdStyle}>string</td><td style={tdStyle}><code>"openai"</code></td><td style={tdStyle}>LLM provider</td></tr>
                                <tr><td style={tdStyle}><code>temperature</code></td><td style={tdStyle}>number</td><td style={tdStyle}><code>0.7</code></td><td style={tdStyle}>Sampling temperature</td></tr>
                                <tr><td style={tdStyle}><code>maxTokens</code></td><td style={tdStyle}>number</td><td style={tdStyle}><code>1024</code></td><td style={tdStyle}>Max response tokens</td></tr>
                                <tr><td style={tdStyle}><code>metadata</code></td><td style={tdStyle}>object</td><td style={tdStyle}><code>{"{}"}</code></td><td style={tdStyle}>Extra metadata for the log</td></tr>
                            </tbody>
                        </table>

                        <h4 style={{ margin: "1.5rem 0 8px 0", color: "#334155" }}>Response</h4>
                        <div style={codeBlockStyle}>
                            <pre style={{ margin: 0 }}>{`{
  "response": "Try looking near the waterfall...",
  "usage": {
    "promptTokens": 42,
    "completionTokens": 128,
    "totalTokens": 170,
    "latencyMs": 1200
  },
  "logId": "uuid-of-log-entry"
}`}</pre>
                        </div>
                    </div>
                )}

                {/* What Gets Logged */}
                {activeSection === "logging" && (
                    <div style={sectionCard}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.3rem" }}>
                            <span className="material-icons-round" style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px", color: "#0ea5e9" }}>storage</span>
                            What Gets Logged
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "1rem" }}>
                            Every call through the SDK is captured server-side for full audit compliance.
                        </p>

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Method</th>
                                    <th style={thStyle}>Backend Table</th>
                                    <th style={thStyle}>Data Captured</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={tdStyle}><code>startSession</code></td>
                                    <td style={tdStyle}><code>game_sessions</code></td>
                                    <td style={tdStyle}>game_id, participant_id, started_at</td>
                                </tr>
                                <tr>
                                    <td style={tdStyle}><code>endSession</code></td>
                                    <td style={tdStyle}><code>game_sessions</code></td>
                                    <td style={tdStyle}>ended_at, score</td>
                                </tr>
                                <tr>
                                    <td style={tdStyle}><code>trackEvent</code></td>
                                    <td style={tdStyle}><code>activity_logs</code></td>
                                    <td style={tdStyle}>event_type, event_data, game_id, session_id</td>
                                </tr>
                                <tr>
                                    <td style={tdStyle}><code>ai.generate</code></td>
                                    <td style={tdStyle}><code>ai_interaction_logs</code></td>
                                    <td style={tdStyle}>prompt, response, model, provider, tokens, latency, flags</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
