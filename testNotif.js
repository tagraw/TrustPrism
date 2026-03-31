import { pool } from "./backend/db.js";

async function test() {
    try {
        const res = await pool.query("SELECT * FROM notifications LIMIT 1");
        console.log("Success! Table exists");
    } catch (e) {
        console.error("Error from missing table?", e.message);
    } finally {
        pool.end();
    }
}
test();
