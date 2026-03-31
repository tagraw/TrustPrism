/**
 * TACC §3.04 — Configuration Management CCR Migration
 *
 * Extends the tickets table to support Configuration Change Requests (CCRs).
 * Makes game_id nullable (CCRs may be system-wide, not game-specific).
 * Adds approval workflow columns: change_type, security_impact, approval_status,
 * approved_by, approved_at, approval_notes, is_change_request.
 */
import { pool } from "../db.js";

async function migrate() {
    try {
        console.log("[CCR Migration] Connecting...");

        // 1. Make game_id nullable — CCRs for system-wide changes have no game
        await pool.query(`
            ALTER TABLE tickets
            ALTER COLUMN game_id DROP NOT NULL;
        `);
        console.log("[CCR Migration] game_id is now nullable.");

        // 2. Flag to distinguish CCRs from regular support tickets
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS is_change_request BOOLEAN NOT NULL DEFAULT FALSE;
        `);

        // 3. Change type: one of the 6 TACC config-controlled categories
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS change_type VARCHAR(30)
                CHECK (change_type IN (
                    'security_config', 'access_rights', 'system_config',
                    'game_lifecycle', 'account_management', 'infrastructure'
                ));
        `);

        // 4. Submitter's written security impact assessment (required for CCRs)
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS security_impact TEXT;
        `);

        // 5. CCR approval workflow status
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)
                CHECK (approval_status IN ('pending', 'approved', 'disapproved'));
        `);

        // 6. Who approved/disapproved + when
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
        `);

        // 7. Approver's written rationale (required on disapproval)
        await pool.query(`
            ALTER TABLE tickets
            ADD COLUMN IF NOT EXISTS approval_notes TEXT;
        `);

        // 8. Index for fast CCR queue queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_is_change_request
            ON tickets (is_change_request, approval_status)
            WHERE is_change_request = TRUE;
        `);

        console.log("[CCR Migration] All CCR columns added successfully.");
        console.log("[CCR Migration] Complete.");
        process.exit(0);
    } catch (err) {
        console.error("[CCR Migration] FAILED:", err.message);
        process.exit(1);
    }
}

migrate();
