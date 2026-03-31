/**
 * TACC 3.03.03 — SIEM Retention Migration
 *
 * Adds the `category` column to siem_logs so every event maps to one of the
 * 15 TACC audit categories, and creates indexes to support fast retention
 * queries (e.g., age-based filtering, compliance reporting).
 *
 * Does NOT delete any records — purging requires explicit TISO authorization.
 */
import { pool } from "../db.js";

async function migrate() {
    try {
        console.log("[SIEM Migration] Connecting...");

        // 1. Add category column (idempotent)
        await pool.query(`
            ALTER TABLE siem_logs
            ADD COLUMN IF NOT EXISTS category VARCHAR(60) DEFAULT 'UNCATEGORIZED';
        `);
        console.log("[SIEM Migration] Added 'category' column.");

        // 2. Backfill existing rows using known event type mappings
        await pool.query(`
            UPDATE siem_logs SET category = CASE event_type
                WHEN 'LOGIN_FAILED'               THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'LOGIN_FAILED_PASSWORD'       THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'LOGIN_FAILED_DISABLED'       THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'LOGIN_FAILED_SUSPENDED'      THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'LOGIN_FAILED_UNVERIFIED'     THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'MFA_FAILED'                  THEN 'UNSUCCESSFUL_LOGON'
                WHEN 'ADMIN_USER_STATUS_UPDATE'    THEN 'PRIVILEGED_ACCOUNT_ACTIVITY'
                WHEN 'ADMIN_ROLE_UDPATE'           THEN 'PRIVILEGED_ACCOUNT_ACTIVITY'
                WHEN 'ADMIN_GROUP_TRANSFER'        THEN 'PRIVILEGED_ACCOUNT_ACTIVITY'
                WHEN 'REGISTER_SUCCESS'            THEN 'ACCOUNT_MANAGEMENT'
                WHEN 'REGISTER_REJECTED_COC'       THEN 'ACCOUNT_MANAGEMENT'
                WHEN 'LOGIN_SUCCESS'               THEN 'REMOTE_LOGON'
                WHEN 'MFA_SUCCESS'                 THEN 'CONFIDENTIAL_DATA_HANDLING'
                WHEN 'LOGOUT_SUCCESS'              THEN 'AUTH_AUTHORIZATION'
                WHEN 'USER_SUSPENDED_INACTIVE'     THEN 'SUSPICIOUS_ACTIVITY'
                ELSE 'UNCATEGORIZED'
            END
            WHERE category = 'UNCATEGORIZED' OR category IS NULL;
        `);
        console.log("[SIEM Migration] Backfilled category for existing rows.");

        // 3. Index on created_at for time-range queries (retention auditing)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_siem_logs_created_at
            ON siem_logs (created_at DESC);
        `);
        console.log("[SIEM Migration] Created created_at index.");

        // 4. Index on category for compliance filtering
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_siem_logs_category
            ON siem_logs (category);
        `);
        console.log("[SIEM Migration] Created category index.");

        // 5. Index on user_id for per-user audit queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_siem_logs_user_id
            ON siem_logs (user_id);
        `);
        console.log("[SIEM Migration] Created user_id index.");

        // 6. Report retention status
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)::int AS total_records,
                MIN(created_at) AS oldest_record,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')::int AS records_in_policy_window
            FROM siem_logs;
        `);
        console.log("[SIEM Migration] Retention status:", rows[0]);
        console.log("[SIEM Migration] TACC Policy: retain >= 90 days. All existing records preserved.");

        console.log("[SIEM Migration] Complete.");
        process.exit(0);
    } catch (err) {
        console.error("[SIEM Migration] FAILED:", err);
        process.exit(1);
    }
}

migrate();
