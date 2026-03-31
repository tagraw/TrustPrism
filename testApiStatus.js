import fetch from "node-fetch"; // Node 18 built-in `fetch` or use https
import { pool } from "./backend/db.js";

async function test() {
    try {
        // Step 1: get an admin user
        const adminRes = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rowCount === 0) return console.error("No admin found");
        const adminId = adminRes.rows[0].id;
        
        // Step 2: create a mock ticket token or bypass auth...
        // Actually, just execute what the route does directly using pool to see if it throws any DB errors!
        const ticketRes = await pool.query("SELECT id FROM tickets WHERE status = 'open' LIMIT 1");
        if (ticketRes.rowCount === 0) return console.log("No open tickets found");
        const ticketId = ticketRes.rows[0].id;

        console.log("Found open ticket:", ticketId);

        // the query from PATCH /api/tickets/:id/status
        const result = await pool.query(
            `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            ["in_progress", ticketId]
        );
        console.log("UPDATE result:", result.rows[0]);
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        pool.end();
    }
}
test();
