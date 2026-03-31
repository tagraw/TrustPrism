/**
 * TACC Re-Authentication Migration
 *
 * Adds session_version and mfa_required columns to the users table.
 *
 * session_version — An integer incremented server-side whenever a user's
 *   role, password, or MFA authenticator changes. This value is embedded in
 *   the JWT at login and checked on every authenticated request. A mismatch
 *   forces immediate re-authentication (TACC §3.05.01).
 *
 * mfa_required — Per-user MFA override. TRUE when the user is an admin/TISO
 *   or when the global mfaEnabled setting is on. Admins can also set it
 *   manually for specific accounts.
 */
import { pool } from "../db.js";

async function migrate() {
    try {
        console.log("[ReAuth Migration] Connecting...");

        // 1. session_version — invalidates JWTs on credential/role/authenticator change
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
        `);
        console.log("[ReAuth Migration] Added 'session_version' column.");

        // 2. mfa_required — per-user MFA flag
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        console.log("[ReAuth Migration] Added 'mfa_required' column.");

        // 3. Set mfa_required = TRUE for existing admin accounts
        const r = await pool.query(`
            UPDATE users SET mfa_required = TRUE WHERE role = 'admin' OR is_tiso = TRUE
            RETURNING id, email, role;
        `);
        console.log(`[ReAuth Migration] Flagged ${r.rowCount} admin/TISO accounts as mfa_required.`);

        // 4. Index for fast session_version lookups in requireAuth middleware
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_session_version
            ON users (id, session_version);
        `);
        console.log("[ReAuth Migration] Created session_version index.");

        console.log("[ReAuth Migration] Complete.");
        process.exit(0);
    } catch (err) {
        console.error("[ReAuth Migration] FAILED:", err.message);
        process.exit(1);
    }
}

migrate();
