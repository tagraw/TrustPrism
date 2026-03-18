import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

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

        // Fetch messages
        const messagesRes = await pool.query(
            `SELECT tm.*, u.first_name, u.last_name
             FROM ticket_messages tm
             JOIN users u ON tm.sender_id = u.id
             WHERE tm.ticket_id = $1
             ORDER BY tm.created_at ASC`,
            [id]
        );

        res.json({ ...ticket, messages: messagesRes.rows });
    } catch (err) {
        console.error("Get ticket error:", err);
        res.status(500).json({ error: "Failed to fetch ticket" });
    }
});

// ─── POST /:id/messages — Add message to ticket thread ───
router.post("/:id/messages", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || !message.trim()) return res.status(400).json({ error: "Message is required" });

    try {
        // Verify ticket exists
        const ticketRes = await pool.query(
            "SELECT t.*, g.name AS game_name FROM tickets t JOIN games g ON t.game_id = g.id WHERE t.id = $1",
            [id]
        );
        if (ticketRes.rowCount === 0) return res.status(404).json({ error: "Ticket not found" });

        const ticket = ticketRes.rows[0];

        const result = await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, userId, userRole, message.trim()]
        );

        // Update ticket's updated_at
        await pool.query("UPDATE tickets SET updated_at = NOW() WHERE id = $1", [id]);

        const newMsg = result.rows[0];

        // Get sender name
        const senderRes = await pool.query("SELECT first_name, last_name FROM users WHERE id = $1", [userId]);
        const senderName = senderRes.rows[0] ? `${senderRes.rows[0].first_name} ${senderRes.rows[0].last_name}` : "Someone";

        // Notify: if admin replies → notify ticket creator; if researcher replies → notify admins
        if (userRole === "admin") {
            if (ticket.created_by !== userId) {
                await notify(req, ticket.created_by, "ticket", `${senderName} replied to your ticket: "${ticket.title}"`, { ticket_id: id, game_id: ticket.game_id });
            }
        } else {
            // Notify all admins
            const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin' AND id != $1", [userId]);
            for (const admin of adminsRes.rows) {
                await notify(req, admin.id, "ticket", `${senderName} replied in ticket: "${ticket.title}"`, { ticket_id: id, game_id: ticket.game_id });
            }
        }

        // Return with sender info
        res.status(201).json({
            ...newMsg,
            first_name: senderRes.rows[0]?.first_name,
            last_name: senderRes.rows[0]?.last_name
        });
    } catch (err) {
        console.error("Add message error:", err);
        res.status(500).json({ error: "Failed to add message" });
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

        res.json(ticket);
    } catch (err) {
        console.error("Assign ticket error:", err);
        res.status(500).json({ error: "Failed to assign ticket" });
    }
});

export default router;
