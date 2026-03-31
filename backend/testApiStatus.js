import { pool } from "./db.js";

async function notify(io, userId, type, message, metadata) {
    const result = await pool.query(
        `INSERT INTO notifications (user_id, type, message, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, type, message, JSON.stringify(metadata)]
    );
    console.log("Mock emit to", `user_${userId}`, result.rows[0]);
}

async function testStatusPatch() {
    try {
        // Find admin user
        const adminRes = await pool.query("SELECT id, first_name, last_name FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rowCount === 0) throw new Error("No admin");
        const adminId = adminRes.rows[0].id;
        const adminName = `${adminRes.rows[0].first_name} ${adminRes.rows[0].last_name}`;

        // Find open ticket not created by admin
        const ticketRes = await pool.query(`SELECT id, title, game_id, created_by FROM tickets WHERE status = 'open' AND created_by != $1 LIMIT 1`, [adminId]);
        if (ticketRes.rowCount === 0) throw new Error("No such ticket");
        const ticket = ticketRes.rows[0];
        const id = ticket.id;
        const status = "in_progress";

        console.log("Patching ticket", id);

        // Core logic of PATCH /status
        const result = await pool.query(
            `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );

        const updatedTicket = result.rows[0];

        // Notify
        const statusLabel = status.replace("_", " ");
        await notify(null, ticket.created_by, "ticket",
            `${adminName} marked your ticket "${ticket.title}" as ${statusLabel}`,
            { ticket_id: id, game_id: ticket.game_id }
        );

        console.log("Success! Ticket status:", updatedTicket.status);
    } catch (e) {
        console.error("Fail:", e);
    } finally {
        pool.end();
    }
}

testStatusPatch();
