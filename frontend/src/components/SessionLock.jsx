import { useState, useEffect, useRef, useCallback, useContext } from "react";
import AuthContext from "../context/AuthContext";

const API = "http://localhost:5000";
const DEFAULT_TIMEOUT_MINUTES = 30;
const WARNING_MINUTES = 2; // show countdown in last N minutes

/**
 * SessionLock — TACC §3.05 Re-authentication at Device Lock
 *
 * Monitors user inactivity. After sessionTimeout minutes of no activity,
 * renders a full-screen frosted-glass lock overlay. The user must re-enter
 * their password to unlock. On success, a fresh JWT is issued via
 * POST /auth/verify-session, resetting the inactivity timer.
 *
 * Also listens for SESSION_INVALIDATED (401) events dispatched by API calls
 * and fires the lockout immediately in that case.
 *
 * Mount once at the top of the authenticated layout (App.jsx).
 */
export default function SessionLock({ timeoutMinutes = DEFAULT_TIMEOUT_MINUTES }) {
    const { auth, setAuth, logout } = useContext(AuthContext);
    const [locked, setLocked] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [forcedLock, setForcedLock] = useState(false); // session invalidated externally

    const idleTimer = useRef(null);
    const countdownTimer = useRef(null);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = WARNING_MINUTES * 60 * 1000;

    const startCountdown = useCallback(() => {
        let secs = WARNING_MINUTES * 60;
        setSecondsLeft(secs);
        clearInterval(countdownTimer.current);
        countdownTimer.current = setInterval(() => {
            secs -= 1;
            setSecondsLeft(secs);
            if (secs <= 0) {
                clearInterval(countdownTimer.current);
                setLocked(true);
            }
        }, 1000);
    }, []);

    const resetTimer = useCallback(() => {
        if (locked) return;
        clearTimeout(idleTimer.current);
        clearInterval(countdownTimer.current);
        setSecondsLeft(0);

        // After (timeout - warning) ms: start countdown
        idleTimer.current = setTimeout(() => {
            startCountdown();
        }, timeoutMs - warningMs);
    }, [locked, timeoutMs, warningMs, startCountdown]);

    // Listen for activity events
    useEffect(() => {
        if (!auth?.isAuthenticated) return;
        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            clearTimeout(idleTimer.current);
            clearInterval(countdownTimer.current);
        };
    }, [auth?.isAuthenticated, resetTimer]);

    // Listen for SESSION_INVALIDATED dispatched by API calls globally
    useEffect(() => {
        const handler = (e) => {
            setForcedLock(true);
            setLocked(true);
        };
        window.addEventListener("session:invalidated", handler);
        return () => window.removeEventListener("session:invalidated", handler);
    }, []);

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        setVerifying(true);
        setError("");

        if (forcedLock) {
            // Session was server-invalidated — must do a full re-login
            logout();
            return;
        }

        try {
            const res = await fetch(`${API}/auth/verify-session`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (res.ok) {
                setLocked(false);
                setForcedLock(false);
                setPassword("");
                setError("");
                resetTimer();
            } else if (res.status === 401 && data.code === "SESSION_INVALIDATED") {
                // Role/credential changed while locked — force full re-login
                logout();
            } else {
                setError(data.error || "Incorrect password. Try again.");
            }
        } catch {
            setError("Connection error. Please try again.");
        }
        setVerifying(false);
    };

    const handleLogout = async () => {
        clearTimeout(idleTimer.current);
        clearInterval(countdownTimer.current);
        logout();
    };

    if (!auth?.isAuthenticated) return null;

    const showWarning = !locked && secondsLeft > 0;
    const minsLeft = Math.floor(secondsLeft / 60);
    const secsLeft = secondsLeft % 60;

    return (
        <>
            {/* ── Inactivity Warning Banner ─────────────────────────────── */}
            {showWarning && (
                <div style={{
                    position: "fixed", bottom: "24px", right: "24px", zIndex: 900,
                    background: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: "12px", padding: "12px 20px",
                    display: "flex", alignItems: "center", gap: "10px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    animation: "pulse 1.5s ease-in-out infinite",
                }}>
                    <span className="material-icons-round" style={{ color: "#b45309", fontSize: "20px" }}>
                        timer
                    </span>
                    <div>
                        <div style={{ color: "#b45309", fontWeight: 700, fontSize: "0.875rem" }}>
                            Session locking in {minsLeft}:{secsLeft.toString().padStart(2, "0")}
                        </div>
                        <div style={{ color: "#92400e", fontSize: "0.75rem" }}>
                            Move your mouse or press a key to stay active
                        </div>
                    </div>
                    <button onClick={resetTimer} style={{
                        padding: "4px 12px", background: "#b45309", color: "white",
                        border: "none", borderRadius: "6px", cursor: "pointer",
                        fontWeight: 600, fontSize: "0.78rem"
                    }}>
                        Extend
                    </button>
                </div>
            )}

            {/* ── Lock Overlay ──────────────────────────────────────────── */}
            {locked && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(16px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "fadeIn 0.3s ease",
                }}>
                    <div style={{
                        background: "white", borderRadius: "20px",
                        padding: "2.5rem 2rem", width: "380px", maxWidth: "95vw",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
                        textAlign: "center",
                    }}>
                        {/* Lock icon */}
                        <div style={{
                            width: "64px", height: "64px", borderRadius: "50%",
                            background: forcedLock ? "#fef2f2" : "#f0f9ff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 1.25rem",
                        }}>
                            <span className="material-icons-round" style={{
                                fontSize: "32px",
                                color: forcedLock ? "#dc2626" : "#0ea5e9"
                            }}>
                                {forcedLock ? "gpp_bad" : "lock"}
                            </span>
                        </div>

                        <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "1.3rem" }}>
                            {forcedLock ? "Session Revoked" : "Session Locked"}
                        </h2>
                        <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.875rem", lineHeight: 1.5 }}>
                            {forcedLock
                                ? "Your session was invalidated by an administrative action. Please log in again to continue."
                                : "Your session was locked after inactivity. Re-enter your password to continue."}
                        </p>

                        {/* TACC compliance note */}
                        <div style={{
                            background: "#f0f9ff", border: "1px solid #bae6fd",
                            borderRadius: "8px", padding: "8px 12px", marginBottom: "1.5rem",
                            display: "flex", alignItems: "center", gap: "6px"
                        }}>
                            <span className="material-icons-round" style={{ fontSize: "14px", color: "#0369a1" }}>verified_user</span>
                            <span style={{ color: "#0369a1", fontSize: "0.72rem", fontWeight: 600 }}>
                                TACC §3.05 — Re-authentication required
                            </span>
                        </div>

                        {forcedLock ? (
                            <button onClick={handleLogout} style={{
                                width: "100%", padding: "12px", background: "#dc2626",
                                color: "white", border: "none", borderRadius: "10px",
                                fontWeight: 700, fontSize: "0.95rem", cursor: "pointer"
                            }}>
                                Go to Login
                            </button>
                        ) : (
                            <form onSubmit={handleUnlock}>
                                <input
                                    type="password"
                                    autoFocus
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    style={{
                                        width: "100%", padding: "11px 14px",
                                        border: `1px solid ${error ? "#fca5a5" : "#e2e8f0"}`,
                                        borderRadius: "10px", fontSize: "0.95rem",
                                        boxSizing: "border-box", marginBottom: "10px",
                                        fontFamily: "inherit",
                                    }}
                                />
                                {error && (
                                    <div style={{ color: "#dc2626", fontSize: "0.82rem", marginBottom: "10px", textAlign: "left" }}>
                                        {error}
                                    </div>
                                )}
                                <button type="submit" disabled={verifying || !password.trim()} style={{
                                    width: "100%", padding: "12px", background: "#0ea5e9",
                                    color: "white", border: "none", borderRadius: "10px",
                                    fontWeight: 700, fontSize: "0.95rem",
                                    cursor: verifying ? "not-allowed" : "pointer",
                                    opacity: verifying ? 0.7 : 1, marginBottom: "10px"
                                }}>
                                    {verifying ? "Verifying…" : "Unlock Session"}
                                </button>
                                <button type="button" onClick={handleLogout} style={{
                                    width: "100%", padding: "10px", background: "transparent",
                                    color: "#64748b", border: "1px solid #e2e8f0",
                                    borderRadius: "10px", fontWeight: 500, fontSize: "0.875rem",
                                    cursor: "pointer"
                                }}>
                                    Log out instead
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(180,83,9,0.15); }
                    50%       { box-shadow: 0 4px 30px rgba(180,83,9,0.35); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </>
    );
}
