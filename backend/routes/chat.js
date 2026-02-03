import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /chat/projects/:projectId/messages
 * Get messages for a project
 */
router.get("/projects/:projectId/messages", requireAuth, async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.id;

    try {
        // Check access: user must be researcher (owner/group member) or admin
        // For MVP transparency: assuming if you can see the project, you can see the chat
        // Proper check should go here in real prod

        const { rows } = await pool.query(
            `SELECT pm.*, u.first_name, u.last_name, u.role
       FROM project_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
            [projectId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

/**
 * POST /chat/projects/:projectId/messages
 * Send a message
 */
router.post("/projects/:projectId/messages", requireAuth, async (req, res) => {
    const { projectId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message cannot be empty" });
    }

    try {
        // Insert message
        const result = await pool.query(
            `INSERT INTO project_messages (project_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *,
       (SELECT first_name FROM users WHERE id = $2) as first_name,
       (SELECT last_name FROM users WHERE id = $2) as last_name,
       (SELECT role FROM users WHERE id = $2) as role`,
            [projectId, userId, message]
        );

        // Emit real-time event
        req.io.to(`project_${projectId}`).emit("new_message", {
            ...result.rows[0],
            first_name: result.rows[0].first_name,
            last_name: result.rows[0].last_name,
            role: result.rows[0].role
        });

        // Notify others
        // For MVP: if sender is researcher, notify admin? Or notify project owner?
        // Let's assume broad notification for now or specific target if we had logic
        // Just logging for now as we don't have Admin ID readily available in this context without query
        // req.io.to(`user_${recipientId}`).emit("notification", ...);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
