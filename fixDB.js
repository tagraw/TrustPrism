import { pool } from "./backend/db.js";

async function fix() {
    try {
        const res = await pool.query("UPDATE tickets SET status = 'open' WHERE status IS NULL RETURNING id");
        console.log("Fixed tickets:", res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
fix();
