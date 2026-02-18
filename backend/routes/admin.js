import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { getSettings, updateSettings } from "../util/settings.js";

const router = express.Router();

// Middleware: Require Admin for all routes
router.use(requireAuth);
router.use(requireRole("admin"));

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = {
            totalUsers: 0,
            activeResearchers: 0,
            pendingApprovals: 0,
            systemStatus: "Healthy"
        };

        // 1. Total Users
        const usersRes = await pool.query("SELECT COUNT(*) FROM users");
        stats.totalUsers = parseInt(usersRes.rows[0].count);

        // 2. Active Researchers
        const researchersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'researcher'");
        stats.activeResearchers = parseInt(researchersRes.rows[0].count);

        // 3. Pending Approvals (Games in pending_review)
        // Check if games table exists and has status column first to be safe, but assuming schema matches
        const approvalsRes = await pool.query("SELECT COUNT(*) FROM games WHERE status = 'pending_review'");
        stats.pendingApprovals = parseInt(approvalsRes.rows[0].count);

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching stats" });
    }
});

/**
 * GET /api/admin/users
 * List all users with basic metadata
 */
router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_verified,
        u.created_at,
        u.role,
        u.is_verified,
        u.created_at,
        u.status,
        CASE
            WHEN r.user_id IS NOT NULL THEN json_build_object('id', r.user_id, 'access_scopes', r.access_scopes)
            ELSE NULL
        END as researcher_profile
      FROM users u
      LEFT JOIN researchers r ON u.id = r.user_id
      ORDER BY u.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put("/users/:id/role", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "researcher", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
    }

    try {
        await pool.query("BEGIN");

        // Update role
        await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);

        // specific logic: if demoting researcher, maybe keep profile but inactive?
        // specific logic: if promoting to researcher, create profile?

        if (role === "researcher") {
            // Check if profile exists
            const resCheck = await pool.query("SELECT user_id FROM researchers WHERE user_id = $1", [id]);
            if (resCheck.rowCount === 0) {
                await pool.query("INSERT INTO researchers (user_id) VALUES ($1)", [id]);
            }
        }

        await pool.query("COMMIT");
        res.json({ message: "User role updated successfully" });
    } catch (err) {
        await pool.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * GET /api/admin/groups
 * List all researcher groups
 */
router.get("/groups", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                rg.id,
                rg.name,
                rg.description,
                rg.created_at,
                u.first_name || ' ' || u.last_name as owner_name,
                rg.created_by as owner_id
            FROM researcher_groups rg
            JOIN users u ON rg.created_by = u.id
            ORDER BY rg.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching groups" });
    }
});

/**
 * PUT /api/admin/users/:id/status
 * Update user status (active/suspended/disabled)
 */
router.put("/users/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended", "disabled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, id]);
        res.json({ message: "User status updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * PUT /api/admin/researchers/:id/scopes
 * Update researcher access scopes
 */
router.put("/researchers/:id/scopes", async (req, res) => {
    const { id } = req.params; // this is the user_id (since researchers table PK is user_id)
    const { access_scopes } = req.body;

    try {
        await pool.query("UPDATE researchers SET access_scopes = $1 WHERE user_id = $2", [access_scopes, id]);
        res.json({ message: "Researcher scopes updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


/**
 * POST /api/admin/groups/:groupId/transfer
 * Transfer group ownership
 */
router.post("/groups/:groupId/transfer", async (req, res) => {
    const { groupId } = req.params;
    const { newOwnerId } = req.body; // researcher_id of the new owner

    try {
        await pool.query("BEGIN");

        // 1. Verify new owner is a researcher
        const ownerCheck = await pool.query("SELECT id FROM researchers WHERE id = $1", [newOwnerId]);
        if (ownerCheck.rowCount === 0) {
            throw new Error("New owner must be a valid researcher");
        }

        // 2. Update existing owner to 'member' or 'admin' (researcher group admin)
        // First, find current owner
        await pool.query(`
      UPDATE researcher_group_members
      SET role = 'member'
      WHERE group_id = $1 AND role = 'owner'
    `, [groupId]);

        // 3. Set new owner
        // Check if new owner is already in the group
        const memberCheck = await pool.query(`
      SELECT role FROM researcher_group_members
      WHERE group_id = $1 AND researcher_id = $2
    `, [groupId, newOwnerId]);

        if (memberCheck.rowCount > 0) {
            // Update role
            await pool.query(`
        UPDATE researcher_group_members
        SET role = 'owner'
        WHERE group_id = $1 AND researcher_id = $2
      `, [groupId, newOwnerId]);
        } else {
            // Insert as owner
            await pool.query(`
        INSERT INTO researcher_group_members (group_id, researcher_id, role)
        VALUES ($1, $2, 'owner')
      `, [groupId, newOwnerId]);
        }

        await pool.query("COMMIT");
        res.json({ message: "Group ownership transferred successfully" });
    } catch (err) {
        await pool.query("ROLLBACK");
        console.error(err);
        res.status(400).json({ error: err.message || "Transfer failed" });
    }
});

/**
 * GET /api/admin/games
 * List all games/studies with researcher info
 */
router.get("/games", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                g.id,
                g.name,
                g.description,
                g.game_type,
                g.status,
                g.irb_approval,
                g.target_sample_size,
                g.consent_form_url,
                g.experimental_conditions,
                g.group_id,
                g.staging_url,
                g.production_url,
                g.category,
                g.age_group,
                g.research_tags,
                g.ai_usage_type,
                g.created_at,
                g.updated_at,
                u.first_name || ' ' || u.last_name as researcher_name,
                u.email as researcher_email,
                g.researcher_id
            FROM games g
            JOIN users u ON g.researcher_id = u.id
            ORDER BY g.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching games" });
    }
});

/**
 * PUT /api/admin/games/:id/status
 * Update game status (approve, send back to draft, publish, etc.)
 * When publishing, accepts optional production_url.
 */
router.put("/games/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, production_url } = req.body;

    const validStatuses = ["draft", "pending_review", "approved", "published", "archived"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        // If publishing, also save production_url
        if (status === "published" && production_url) {
            await pool.query(
                "UPDATE games SET status = $1, production_url = $2, updated_at = NOW() WHERE id = $3",
                [status, production_url, id]
            );
        } else {
            await pool.query("UPDATE games SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
        }

        // Notify the researcher about the status change
        const gameRes = await pool.query("SELECT name, researcher_id FROM games WHERE id = $1", [id]);
        if (gameRes.rowCount > 0) {
            const game = gameRes.rows[0];
            const notifMsg = status === "approved"
                ? `Your study "${game.name}" has been approved!`
                : status === "published"
                    ? `Your study "${game.name}" is now live!`
                    : `Your study "${game.name}" status changed to: ${status}`;

            await pool.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
                 VALUES ($1, 'approval', $2, $3)`,
                [game.researcher_id, notifMsg, JSON.stringify({ game_id: id, status })]
            );

            req.io.to(`user_${game.researcher_id}`).emit("notification", {
                type: "approval",
                message: notifMsg,
                metadata: { game_id: id, status }
            });
        }

        res.json({ message: "Game status updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error updating game status" });
    }
});

/**
 * PUT /admin/games/:id/staging-url
 * Set or update the staging URL for a game
 */
router.put("/games/:id/staging-url", async (req, res) => {
    const { id } = req.params;
    const { staging_url } = req.body;

    if (!staging_url) {
        return res.status(400).json({ error: "staging_url is required" });
    }

    try {
        const result = await pool.query(
            "UPDATE games SET staging_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, staging_url",
            [staging_url, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Game not found" });
        }

        res.json({ message: "Staging URL updated", staging_url: result.rows[0].staging_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update staging URL" });
    }
});

/**
 * POST /admin/games/:id/generate-key
 * Generate a new development API key for a game (admin only)
 * Revokes any existing dev keys and returns the raw key once.
 */
router.post("/games/:id/generate-key", async (req, res) => {
    const gameId = req.params.id;
    const adminId = req.user.id;

    try {
        // Verify game exists
        const gameCheck = await pool.query("SELECT id, name FROM games WHERE id = $1", [gameId]);
        if (gameCheck.rows.length === 0) {
            return res.status(404).json({ error: "Game not found" });
        }

        // Revoke existing development keys
        await pool.query(
            `UPDATE api_keys SET is_active = FALSE, revoked_at = NOW()
             WHERE game_id = $1 AND environment = 'development' AND is_active = TRUE`,
            [gameId]
        );

        // Generate new key
        const rawKey = `tp_dev_${crypto.randomBytes(32).toString('hex')}`;
        const keyPrefix = rawKey.substring(0, 15);
        const keyHash = await bcrypt.hash(rawKey, 10);

        await pool.query(
            `INSERT INTO api_keys (game_id, key_hash, key_prefix, environment, created_by)
             VALUES ($1, $2, $3, 'development', $4)`,
            [gameId, keyHash, keyPrefix, adminId]
        );

        res.json({
            api_key: rawKey,
            key_prefix: keyPrefix,
            environment: "development",
            game_name: gameCheck.rows[0].name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate API key" });
    }
});

/**
 * GET /admin/games/:id/api-keys
 * List API keys for a game (prefixes only, not full keys)
 */
router.get("/games/:id/api-keys", async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, key_prefix, environment, is_active, created_at, last_used_at, revoked_at
             FROM api_keys WHERE game_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch API keys" });
    }
});

/**
 * GET /admin/audit
 * Return AI interaction logs + usage anomalies for admin monitoring.
 * Detects usage spikes: sessions with > threshold events.
 */
router.get("/audit", async (req, res) => {
    const SPIKE_THRESHOLD = 20; // events per session considered abnormal
    try {
        // 1. Recent AI interaction logs (last 500)
        const logsRes = await pool.query(`
            SELECT
                ail.id,
                ail.game_id,
                g.name AS game_name,
                ail.session_id,
                ail.event_type,
                ail.ai_model,
                ail.payload,
                ail.prompt_tokens,
                ail.completion_tokens,
                ail.latency_ms,
                ail.flagged,
                ail.flag_reason,
                ail.created_at,
                g.status AS game_status,
                g.researcher_id
            FROM ai_interaction_logs ail
            JOIN games g ON ail.game_id = g.id
            ORDER BY ail.created_at DESC
            LIMIT 500
        `);

        // 2. Usage spikes: sessions with unusually high event counts
        const spikesRes = await pool.query(`
            SELECT
                ail.session_id,
                ail.game_id,
                g.name AS game_name,
                COUNT(*)::int AS event_count,
                MAX(ail.created_at) AS last_event,
                SUM(ail.prompt_tokens)::int AS total_prompt_tokens,
                SUM(ail.completion_tokens)::int AS total_completion_tokens
            FROM ai_interaction_logs ail
            JOIN games g ON ail.game_id = g.id
            GROUP BY ail.session_id, ail.game_id, g.name
            HAVING COUNT(*) > $1
            ORDER BY COUNT(*) DESC
            LIMIT 50
        `, [SPIKE_THRESHOLD]);

        // 3. Flagged logs
        const flaggedRes = await pool.query(`
            SELECT
                ail.id,
                ail.game_id,
                g.name AS game_name,
                ail.session_id,
                ail.event_type,
                ail.ai_model,
                ail.payload,
                ail.flag_reason,
                ail.created_at
            FROM ai_interaction_logs ail
            JOIN games g ON ail.game_id = g.id
            WHERE ail.flagged = TRUE
            ORDER BY ail.created_at DESC
            LIMIT 100
        `);

        res.json({
            logs: logsRes.rows,
            spikes: spikesRes.rows,
            flagged: flaggedRes.rows,
            spike_threshold: SPIKE_THRESHOLD
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch audit data" });
    }
});

/**
 * PUT /admin/ai-logs/:id/flag
 * Flag or unflag a suspicious AI interaction log.
 * Body: { flagged: boolean, flag_reason?: string }
 */
router.put("/ai-logs/:id/flag", async (req, res) => {
    const { id } = req.params;
    const { flagged, flag_reason } = req.body;

    try {
        const result = await pool.query(
            `UPDATE ai_interaction_logs
             SET flagged = $1, flag_reason = $2
             WHERE id = $3
             RETURNING id, flagged, flag_reason`,
            [flagged !== false, flag_reason || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Log not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update flag" });
    }
});

/**
 * PUT /admin/games/:id/disable
 * Disable a game (sets status to 'disabled').
 */
router.put("/games/:id/disable", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE games SET status = 'disabled', updated_at = NOW()
             WHERE id = $1 RETURNING id, name, status`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Game not found" });

        // Also revoke all active API keys for this game
        await pool.query(
            `UPDATE api_keys SET is_active = FALSE, revoked_at = NOW()
             WHERE game_id = $1 AND is_active = TRUE`,
            [id]
        );

        // Notify researcher
        const game = result.rows[0];
        const gameInfo = await pool.query("SELECT researcher_id FROM games WHERE id = $1", [id]);
        if (gameInfo.rows[0]) {
            const notifMsg = `Your game "${game.name}" has been disabled by an administrator.`;
            await pool.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
                 VALUES ($1, 'system', $2, $3)`,
                [gameInfo.rows[0].researcher_id, notifMsg, JSON.stringify({ game_id: id })]
            );
        }

        res.json({ message: "Game disabled and API keys revoked", game: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to disable game" });
    }
});

/**
 * DELETE /admin/api-keys/:id
 * Revoke a specific API key by ID.
 */
router.delete("/api-keys/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE api_keys SET is_active = FALSE, revoked_at = NOW()
             WHERE id = $1 AND is_active = TRUE
             RETURNING id, key_prefix, game_id`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "API key not found or already revoked" });
        res.json({ message: "API key revoked", key: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to revoke API key" });
    }
});

/**
 * GET /admin/settings
 * Return current security settings.
 */
router.get("/settings", async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load settings" });
    }
});

/**
 * PUT /admin/settings
 * Update security settings (partial merge).
 * Body: { sessionTimeout?: number, passwordMinLength?: number, ... }
 */
router.put("/settings", async (req, res) => {
    try {
        const updated = await updateSettings(req.body, req.user.id);
        res.json({ message: "Settings updated", settings: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update settings" });
    }
});

export default router;
