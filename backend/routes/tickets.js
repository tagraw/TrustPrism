import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logSIEMEvent } from "../util/siem.js";

const router = express.Router();

// ─── Helper: send notification + socket event ───
async function notify(req, userId, type, message, metadata) {
    const result = await pool.query(
        `INSERT INTO notifications (user_id, type, message, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, type, message, JSON.stringify(metadata)]
    );
    req.io.to(`user_${userId}`).emit("notification", result.rows[0]);
}

// ─── POST / — Create a ticket (researcher) ───
router.post("/", requireAuth, async (req, res) => {
    const { title, description, game_id, priority, category } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (!description || !description.trim()) return res.status(400).json({ error: "Description is required" });
    if (!game_id) return res.status(400).json({ error: "Game ID is required" });

    const validPriorities = ["low", "medium", "high"];
    const validCategories = ["bug", "feature_request", "data_issue", "other"];
    if (priority && !validPriorities.includes(priority)) return res.status(400).json({ error: "Invalid priority" });
    if (category && !validCategories.includes(category)) return res.status(400).json({ error: "Invalid category" });

    try {
        // Verify game exists
        const gameRes = await pool.query("SELECT id, name FROM games WHERE id = $1", [game_id]);
        if (gameRes.rowCount === 0) return res.status(404).json({ error: "Game not found" });

        const result = await pool.query(
            `INSERT INTO tickets (title, description, game_id, created_by, priority, category)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title.trim(), description.trim(), game_id, userId, priority || "medium", category || "other"]
        );

        const ticket = result.rows[0];

        // Notify all admins
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const creatorName = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [userId]);
        const name = creatorName.rows[0] ? `${creatorName.rows[0].first_name} ${creatorName.rows[0].last_name}` : "A researcher";

        for (const admin of adminsRes.rows) {
            await notify(req, admin.id, "ticket", `${name} created ticket: "${ticket.title}"`, { ticket_id: ticket.id, game_id });
        }

        res.status(201).json(ticket);
    } catch (err) {
        console.error("Create ticket error:", err);
        res.status(500).json({ error: "Failed to create ticket" });
    }
});

// ─── GET / — List tickets ───
router.get("/", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, game_id, priority } = req.query;

    try {
        let query;
        let params = [];
        let paramIdx = 1;

        if (userRole === "admin") {
            // Admins see all tickets
            query = `
                SELECT t.*,
                       g.name AS game_name,
                       u.first_name AS creator_first_name,
                       u.last_name AS creator_last_name,
                       a.first_name AS assignee_first_name,
                       a.last_name AS assignee_last_name
                FROM tickets t
                JOIN games g ON t.game_id = g.id
                JOIN users u ON t.created_by = u.id
                LEFT JOIN users a ON t.assigned_to = a.id
                WHERE 1=1
            `;
        } else {
            // Researchers see own tickets + tickets from same research group
            query = `
                SELECT t.*,
                       g.name AS game_name,
                       u.first_name AS creator_first_name,
                       u.last_name AS creator_last_name,
                       a.first_name AS assignee_first_name,
                       a.last_name AS assignee_last_name
                FROM tickets t
                JOIN games g ON t.game_id = g.id
                JOIN users u ON t.created_by = u.id
                LEFT JOIN users a ON t.assigned_to = a.id
                WHERE (
                    t.created_by = $${paramIdx}
                    OR g.group_id IN (
                        SELECT group_id FROM researcher_group_members WHERE researcher_id = $${paramIdx}
                    )
                )
            `;
            params.push(userId);
            paramIdx++;
        }

        if (status) {
            query += ` AND t.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }
        if (game_id) {
            query += ` AND t.game_id = $${paramIdx}`;
            params.push(game_id);
            paramIdx++;
        }
        if (priority) {
            query += ` AND t.priority = $${paramIdx}`;
            params.push(priority);
            paramIdx++;
        }

        query += ` ORDER BY t.created_at DESC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("List tickets error:", err);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// ─── GET /:id — Get ticket detail with messages ───
router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const ticketRes = await pool.query(
            `SELECT t.*,
                    g.name AS game_name,
                    u.first_name AS creator_first_name,
                    u.last_name AS creator_last_name,
                    a.first_name AS assignee_first_name,
                    a.last_name AS assignee_last_name
             FROM tickets t
             JOIN games g ON t.game_id = g.id
             JOIN users u ON t.created_by = u.id
             LEFT JOIN users a ON t.assigned_to = a.id
             WHERE t.id = $1`,
            [id]
        );

        if (ticketRes.rowCount === 0) return res.status(404).json({ error: "Ticket not found" });

        const ticket = ticketRes.rows[0];

        // Researchers can only see their own or group tickets
        if (userRole === "researcher") {
            const groupCheck = await pool.query(
                `SELECT 1 FROM games g
                 LEFT JOIN researcher_group_members rgm ON g.group_id = rgm.group_id
                 WHERE g.id = $1 AND (g.researcher_id = $2 OR rgm.researcher_id = $2)`,
                [ticket.game_id, userId]
            );
            if (ticket.created_by !== userId && groupCheck.rowCount === 0) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        res.json(ticket);
    } catch (err) {
        console.error("Get ticket error:", err);
        res.status(500).json({ error: "Failed to fetch ticket" });
    }
});


// ─── PATCH /:id/status — Change ticket status (admin only) ───
router.patch("/:id/status", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admins can change ticket status" });

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });

    try {
        const result = await pool.query(
            `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "Ticket not found" });

        const ticket = result.rows[0];

        // Get admin name
        const adminRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [userId]);
        const adminName = adminRes.rows[0] ? `${adminRes.rows[0].first_name} ${adminRes.rows[0].last_name}` : "Admin";

        // Notify ticket creator
        if (ticket.created_by !== userId) {
            const statusLabel = status.replace("_", " ");
            await notify(req, ticket.created_by, "ticket",
                `${adminName} marked your ticket "${ticket.title}" as ${statusLabel}`,
                { ticket_id: id, game_id: ticket.game_id }
            );
        }

        // Emit real-time update for status changes
        req.io.emit("ticket_status_update", { ticket_id: id, status });

        // TACC 3.03.03 — Category 13: Managing Application Processes
        await logSIEMEvent(userId, "ADMIN_TICKET_STATUS_CHANGED", req.ip, {
            ticket_id: id, new_status: status, ticket_title: ticket.title
        });

        res.json(ticket);
    } catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({ error: "Failed to update ticket status" });
    }
});

// ─── PATCH /:id/assign — Assign ticket to admin ───
router.patch("/:id/assign", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admins can assign tickets" });

    try {
        const result = await pool.query(
            `UPDATE tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [userId, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "Ticket not found" });

        const ticket = result.rows[0];

        // Get admin name
        const adminRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [userId]);
        const adminName = adminRes.rows[0] ? `${adminRes.rows[0].first_name} ${adminRes.rows[0].last_name}` : "Admin";

        // Notify ticket creator
        if (ticket.created_by !== userId) {
            await notify(req, ticket.created_by, "ticket",
                `${adminName} is now assigned to your ticket: "${ticket.title}"`,
                { ticket_id: id, game_id: ticket.game_id }
            );
        }

        // TACC 3.03.03 — Category 2: Privileged Account Activity
        await logSIEMEvent(userId, "ADMIN_TICKET_ASSIGNED", req.ip, {
            ticket_id: id, ticket_title: ticket.title, assigned_to: userId
        });

        res.json(ticket);
    } catch (err) {
        console.error("Assign ticket error:", err);
        res.status(500).json({ error: "Failed to assign ticket" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION CHANGE REQUESTS (CCR) — TACC §3.04 Configuration Management
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CHANGE_TYPES = [
    "security_config", "access_rights", "system_config",
    "game_lifecycle", "account_management", "infrastructure"
];

const CHANGE_TYPE_LABELS = {
    security_config:    "Security Configuration",
    access_rights:      "Access Rights",
    system_config:      "System Configuration",
    game_lifecycle:     "Game / Study Lifecycle",
    account_management: "Account Management",
    infrastructure:     "Infrastructure",
};

// ─── POST /api/tickets/change-requests — Submit a CCR ─────────────────────
router.post("/change-requests", requireAuth, async (req, res) => {
    const { title, description, change_type, security_impact, game_id, priority } = req.body;
    const userId = req.user.id;

    if (!title?.trim())           return res.status(400).json({ error: "Title is required" });
    if (!description?.trim())     return res.status(400).json({ error: "Description is required" });
    if (!change_type || !VALID_CHANGE_TYPES.includes(change_type))
                                  return res.status(400).json({ error: "Valid change_type is required" });
    if (!security_impact?.trim()) return res.status(400).json({ error: "Security impact assessment is required" });

    try {
        const result = await pool.query(
            `INSERT INTO tickets
                (title, description, game_id, created_by, priority, category,
                 is_change_request, change_type, security_impact, approval_status)
             VALUES ($1, $2, $3, $4, $5, 'other', TRUE, $6, $7, 'pending')
             RETURNING *`,
            [title.trim(), description.trim(), game_id || null, userId,
             priority || "medium", change_type, security_impact.trim()]
        );
        const ccr = result.rows[0];

        // Notify all admins
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const creatorRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [userId]);
        const name = creatorRes.rows[0]
            ? `${creatorRes.rows[0].first_name} ${creatorRes.rows[0].last_name}` : "A user";

        for (const admin of adminsRes.rows) {
            await notify(req, admin.id, "system",
                `${name} submitted a Change Request: "${ccr.title}" [${CHANGE_TYPE_LABELS[change_type]}]`,
                { ticket_id: ccr.id, change_type }
            );
        }

        // TACC §3.04 — SIEM: Category 5/12 — CCR submitted
        await logSIEMEvent(userId, "CCR_SUBMITTED", req.ip, {
            ccr_id: ccr.id, title: ccr.title, change_type, game_id: game_id || null
        });

        res.status(201).json(ccr);
    } catch (err) {
        console.error("CCR submit error:", err);
        res.status(500).json({ error: "Failed to submit change request" });
    }
});

// ─── GET /api/tickets/change-requests — List CCRs ─────────────────────────
router.get("/change-requests", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { approval_status, change_type } = req.query;

    try {
        let query = `
            SELECT t.*,
                   g.name                              AS game_name,
                   u.first_name                        AS creator_first_name,
                   u.last_name                         AS creator_last_name,
                   u.email                             AS creator_email,
                   a.first_name                        AS approver_first_name,
                   a.last_name                         AS approver_last_name
            FROM tickets t
            LEFT JOIN games g ON t.game_id = g.id
            JOIN users u ON t.created_by = u.id
            LEFT JOIN users a ON t.approved_by = a.id
            WHERE t.is_change_request = TRUE
        `;
        const params = [];
        let idx = 1;

        // Non-admins only see their own CCRs
        if (userRole !== "admin") {
            query += ` AND t.created_by = $${idx++}`;
            params.push(userId);
        }
        if (approval_status) { query += ` AND t.approval_status = $${idx++}`; params.push(approval_status); }
        if (change_type)     { query += ` AND t.change_type     = $${idx++}`; params.push(change_type); }

        query += " ORDER BY t.created_at DESC";

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("List CCRs error:", err);
        res.status(500).json({ error: "Failed to fetch change requests" });
    }
});

// ─── PATCH /api/tickets/:id/approve — Approve a CCR (admin only) ──────────
router.patch("/:id/approve", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admins can approve change requests" });

    const { id } = req.params;
    const { approval_notes } = req.body;
    const adminId = req.user.id;

    try {
        const ccrRes = await pool.query(
            "SELECT * FROM tickets WHERE id = $1 AND is_change_request = TRUE", [id]
        );
        if (ccrRes.rowCount === 0) return res.status(404).json({ error: "Change request not found" });

        const ccr = ccrRes.rows[0];
        if (ccr.approval_status !== "pending")
            return res.status(400).json({ error: "Only pending change requests can be approved" });

        const result = await pool.query(
            `UPDATE tickets
             SET approval_status = 'approved', approved_by = $1, approved_at = NOW(),
                 approval_notes = $2, status = 'in_progress', updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [adminId, approval_notes || null, id]
        );

        // Notify submitter
        const adminRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [adminId]);
        const adminName = adminRes.rows[0] ? `${adminRes.rows[0].first_name} ${adminRes.rows[0].last_name}` : "Admin";
        await notify(req, ccr.created_by, "system",
            `✅ Your Change Request "${ccr.title}" was APPROVED by ${adminName}`,
            { ticket_id: id, change_type: ccr.change_type, approval_status: "approved" }
        );

        // TACC §3.04 — SIEM: Category 5/12 — CCR approved
        await logSIEMEvent(adminId, "CCR_APPROVED", req.ip, {
            ccr_id: id, title: ccr.title, change_type: ccr.change_type,
            submitter_id: ccr.created_by, approval_notes: approval_notes || null
        });

        res.json(result.rows[0]);
    } catch (err) {
        console.error("CCR approve error:", err);
        res.status(500).json({ error: "Failed to approve change request" });
    }
});

// ─── PATCH /api/tickets/:id/disapprove — Disapprove a CCR (admin only) ────
router.patch("/:id/disapprove", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admins can disapprove change requests" });

    const { id } = req.params;
    const { approval_notes } = req.body;
    const adminId = req.user.id;

    if (!approval_notes?.trim())
        return res.status(400).json({ error: "Approval notes (rationale) are required when disapproving" });

    try {
        const ccrRes = await pool.query(
            "SELECT * FROM tickets WHERE id = $1 AND is_change_request = TRUE", [id]
        );
        if (ccrRes.rowCount === 0) return res.status(404).json({ error: "Change request not found" });

        const ccr = ccrRes.rows[0];
        if (ccr.approval_status !== "pending")
            return res.status(400).json({ error: "Only pending change requests can be disapproved" });

        const result = await pool.query(
            `UPDATE tickets
             SET approval_status = 'disapproved', approved_by = $1, approved_at = NOW(),
                 approval_notes = $2, status = 'closed', updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [adminId, approval_notes.trim(), id]
        );

        // Notify submitter
        const adminRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [adminId]);
        const adminName = adminRes.rows[0] ? `${adminRes.rows[0].first_name} ${adminRes.rows[0].last_name}` : "Admin";
        await notify(req, ccr.created_by, "system",
            `❌ Your Change Request "${ccr.title}" was DISAPPROVED by ${adminName}. Reason: ${approval_notes.trim()}`,
            { ticket_id: id, change_type: ccr.change_type, approval_status: "disapproved" }
        );

        // TACC §3.04 — SIEM: Category 5/12 — CCR disapproved
        await logSIEMEvent(adminId, "CCR_DISAPPROVED", req.ip, {
            ccr_id: id, title: ccr.title, change_type: ccr.change_type,
            submitter_id: ccr.created_by, approval_notes: approval_notes.trim()
        });

        res.json(result.rows[0]);
    } catch (err) {
        console.error("CCR disapprove error:", err);
        res.status(500).json({ error: "Failed to disapprove change request" });
    }
});

export default router;

