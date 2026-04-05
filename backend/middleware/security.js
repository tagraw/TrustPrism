import { pool } from "../db.js";
import { logSIEMEvent } from "../util/siem.js";

/**
 * CSRF Protection Middleware
 * TACC Compliance requirement: Prevent Cross-Site Request Forgery.
 * Since JWT is in HttpOnly cookies, we require a custom header 'X-TrustPrism-CSRF' 
 * (or generically 'X-Requested-With') to be present on all non-safe methods (POST, PUT, DELETE, PATCH).
 * The value doesn't need to be unique per-session if the goal is to block simple automated cross-origin forms.
 */
export const csrfProtection = (req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) return next();

    const csrfHeader = req.headers["x-trustprism-csrf"] || req.headers["x-requested-with"];
    
    if (!csrfHeader) {
        logSIEMEvent(req.user?.id || null, "SUSPICIOUS_ACTIVITY", req.ip, {
            reason: "MISSING_CSRF_HEADER",
            method: req.method,
            path: req.path
        });
        return res.status(403).json({ 
            error: "Security Check Failed: Missing required CSRF header. Please ensure your client is up-to-date." 
        });
    }
    next();
};

/**
 * checkOwnership — Broken Object Level Authorization (BOLA) Prevention
 * Verifies that the authenticated user (req.user.id) matches the owner column of the resource being accessed.
 *
 * @param {string} table  - Name of the DB table (e.g. 'games')
 * @param {string} ownerColumn - Column that stores the owner's UUID (default: researcher_id)
 * @param {string} idParam - Param name in req.params for the resource (default: id)
 */
export const checkOwnership = (table, ownerColumn = 'researcher_id', idParam = 'id') => {
    return async (req, res, next) => {
        const resourceId = req.params[idParam];
        const userId = req.user.id;
        const userRole = req.user.role;

        // Admins pass ownership checks for all resources
        if (userRole === 'admin') return next();

        try {
            const result = await pool.query(
                `SELECT ${ownerColumn} FROM ${table} WHERE id = $1`,
                [resourceId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Resource not found" });
            }

            const ownerId = result.rows[0][ownerColumn];

            if (ownerId !== userId) {
                logSIEMEvent(userId, "SUSPICIOUS_ACTIVITY", req.ip, {
                    reason: "UNAUTHORIZED_OWNERSHIP_ACCESS",
                    table,
                    resourceId,
                    attempted_by: userId
                });
                return res.status(403).json({ error: "Access Denied: You do not own this resource" });
            }

            next();
        } catch (err) {
            console.error(`Ownership check error for ${table}:`, err.message);
            res.status(500).json({ error: "Security check internal error" });
        }
    };
};
