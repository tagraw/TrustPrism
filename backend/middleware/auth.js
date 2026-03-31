import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { logSIEMEvent } from "../util/siem.js";

console.log("🔥 auth middleware loaded");

/**
 * requireAuth — validates the JWT cookie and session_version.
 *
 * TACC §3.05 — Re-authentication:
 *   If the JWT's embedded session_version does not match the DB value
 *   (because the user's role, password, or MFA authenticator changed),
 *   the request is rejected with SESSION_INVALIDATED and the cookie cleared.
 *   The frontend detects this code and shows the lock or redirect.
 */
export async function requireAuth(req, res, next) {
    try {
        let token = req.cookies?.token;

        // Fallback for frontend clients that haven't transitioned yet (if any)
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Authentication token missing" });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ── TACC §3.05: session_version check ─────────────────────────────
        // Every privileged action (role/credential/authenticator change) bumps
        // session_version in the DB. JWTs carrying a stale value are rejected.
        const dbRes = await pool.query(
            "SELECT session_version, status FROM users WHERE id = $1",
            [decoded.id]
        );

        if (dbRes.rowCount === 0) {
            return res.status(401).json({ error: "User not found", code: "SESSION_INVALIDATED" });
        }

        const dbUser = dbRes.rows[0];

        if (dbUser.status === "disabled" || dbUser.status === "suspended") {
            res.clearCookie("token");
            return res.status(401).json({ error: "Account suspended or disabled.", code: "SESSION_INVALIDATED" });
        }

        // session_version mismatch → force re-auth
        const tokenVersion = decoded.session_version ?? 1; // legacy tokens without the field default to 1
        if (dbUser.session_version !== tokenVersion) {
            res.clearCookie("token");
            await logSIEMEvent(decoded.id, "SESSION_INVALIDATED", req.ip, {
                reason: "session_version_mismatch",
                token_version: tokenVersion,
                db_version: dbUser.session_version
            });
            return res.status(401).json({
                error: "Your session has been invalidated. Please log in again.",
                code: "SESSION_INVALIDATED"
            });
        }
        // ──────────────────────────────────────────────────────────────────

        req.user = decoded;

        // Sliding Session Window: Enforce 24-hour inactivity logout.
        // If the token was issued more than 15 minutes ago, generate a fresh 24h token.
        const nowEpoch = Math.floor(Date.now() / 1000);
        const ageMinutes = (nowEpoch - decoded.iat) / 60;

        if (ageMinutes >= 15) {
            const newToken = jwt.sign(
                { id: decoded.id, role: decoded.role, session_version: dbUser.session_version },
                process.env.JWT_SECRET,
                { expiresIn: "24h" }
            );

            res.cookie("token", newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000
            });

            // Update activity timestamp to stave off 120-day hard suspension
            pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [decoded.id])
                .catch(err => console.error("Failed to update last_login_at:", err.message));
        }

        next();
    } catch (err) {
        console.error("AUTH ERROR:", err.message);
        res.clearCookie("token");
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * requireFreshAuth(maxAgeMinutes)
 *
 * TACC §3.05 — Step-up authentication for privileged functions.
 * Rejects requests where the JWT was issued more than maxAgeMinutes ago.
 * The frontend detects requires_reauth: true and prompts re-authentication.
 *
 * Default: 15 minutes — covers: security settings, scope changes,
 *   API key revocation, game disable, SIEM log access.
 */
export function requireFreshAuth(maxAgeMinutes = 15) {
    return async (req, res, next) => {
        try {
            const nowEpoch = Math.floor(Date.now() / 1000);
            const ageMinutes = (nowEpoch - (req.user?.iat ?? 0)) / 60;

            if (ageMinutes > maxAgeMinutes) {
                await logSIEMEvent(req.user?.id ?? null, "STEP_UP_REQUIRED", req.ip, {
                    path: req.path, method: req.method,
                    token_age_minutes: Math.round(ageMinutes),
                    max_age_minutes: maxAgeMinutes
                });
                return res.status(403).json({
                    error: `This action requires recent authentication (within ${maxAgeMinutes} minutes). Please re-authenticate.`,
                    code: "REQUIRES_REAUTH",
                    requires_reauth: true
                });
            }
            next();
        } catch (err) {
            next(err);
        }
    };
}

export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}
