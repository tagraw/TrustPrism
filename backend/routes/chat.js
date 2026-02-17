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

        const newMsg = result.rows[0];

        // Emit real-time event to the project room
        req.io.to(`project_${projectId}`).emit("new_message", {
            ...newMsg,
            first_name: newMsg.first_name,
            last_name: newMsg.last_name,
            role: newMsg.role
        });

        // --- Notifications: notify researcher + group members ---
        const senderName = `${newMsg.first_name} ${newMsg.last_name}`;

        // 1. Get the game info (researcher_id, group_id, name)
        const gameRes = await pool.query(
            "SELECT researcher_id, group_id, name FROM games WHERE id = $1",
            [projectId]
        );

        if (gameRes.rowCount > 0) {
            const game = gameRes.rows[0];
            const notifMsg = `${senderName} sent a message in "${game.name}"`;
            const metadata = JSON.stringify({ game_id: projectId });

            // Collect user IDs to notify (exclude sender)
            const recipientIds = new Set();

            // Always notify the researcher
            if (game.researcher_id && game.researcher_id !== userId) {
                recipientIds.add(game.researcher_id);
            }

            // If game belongs to a group, notify all group members
            if (game.group_id) {
                const membersRes = await pool.query(
                    "SELECT researcher_id FROM researcher_group_members WHERE group_id = $1",
                    [game.group_id]
                );
                for (const row of membersRes.rows) {
                    if (row.researcher_id !== userId) {
                        recipientIds.add(row.researcher_id);
                    }
                }
            }

            // Also notify all admin users (except sender)
            const adminsRes = await pool.query(
                "SELECT id FROM users WHERE role = 'admin' AND id != $1",
                [userId]
            );
            for (const row of adminsRes.rows) {
                recipientIds.add(row.id);
            }

            // Insert notifications and emit real-time events
            for (const recipientId of recipientIds) {
                const notifResult = await pool.query(
                    `INSERT INTO notifications (user_id, type, message, metadata)
                     VALUES ($1, 'message', $2, $3)
                     RETURNING *`,
                    [recipientId, notifMsg, metadata]
                );

                req.io.to(`user_${recipientId}`).emit("notification", notifResult.rows[0]);
            }
        }

        res.status(201).json(newMsg);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
