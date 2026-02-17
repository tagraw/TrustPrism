import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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
 * Update game status (approve, send back to draft, etc.)
 */
router.put("/games/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "pending_review", "approved", "published", "archived"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        await pool.query("UPDATE games SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);

        // Notify the researcher about the status change
        const gameRes = await pool.query("SELECT name, researcher_id FROM games WHERE id = $1", [id]);
        if (gameRes.rowCount > 0) {
            const game = gameRes.rows[0];
            const notifMsg = status === "approved"
                ? `Your study "${game.name}" has been approved!`
                : `Your study "${game.name}" status changed to: ${status}`;

            await pool.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
                 VALUES ($1, 'approval', $2, $3)`,
                [game.researcher_id, notifMsg, JSON.stringify({ game_id: id, status })]
            );

            // Emit real-time notification
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

export default router;

