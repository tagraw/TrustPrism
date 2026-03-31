import { pool } from "../db.js";

/**
 * Logs an event to the SIEM table for NSO (Networking, Security, & Operations) auditing.
 * @param {string} user_id - The UUID of the user triggering the event (can be null for anonymous).
 * @param {string} event_type - A categorized string (e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'USER_SUSPENDED').
 * @param {string} ip_address - The IP address of the requester.
 * @param {object} details - Additional JSON metadata context mapping the event.
 */
export async function logSIEMEvent(user_id, event_type, ip_address, details = {}) {
    try {
        await pool.query(
            `INSERT INTO siem_logs (user_id, event_type, ip_address, details)
             VALUES ($1, $2, $3, $4)`,
            [user_id, event_type, ip_address || "0.0.0.0", JSON.stringify(details)]
        );
    } catch (err) {
        // We typically do not crash the main thread if logging fails, but we error it
        console.error("[SIEM LOGGING ERROR]", err);
    }
}
