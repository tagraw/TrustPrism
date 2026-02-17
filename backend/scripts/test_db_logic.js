
import { pool } from "../db.js";
import fetch from "node-fetch";

// Mock auth token not needed if we bypass auth middleware or simulation
// But since the server is running, we should hit the endpoint.
// However, to hit the endpoint we need a token.
// Instead, let's test the database logic directly first to rule out DB issues,
// AND then if that passes, we might need to test the API with a token.

// Actually, let's just make a script that runs the DB queries exactly as the route does
// to see if the transaction logic holds up.

async function testRoleUpdate() {
    console.log("Starting test...");

    // 1. Create a dummy user
    const email = `test_role_${Date.now()}@test.com`;
    const res = await pool.query(
        "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ($1, 'hash', 'user', 'Test', 'User') RETURNING id",
        [email]
    );
    const userId = res.rows[0].id;
    console.log(`Created test user: ${userId}`);

    try {
        // 2. Simulate promoting to researcher
        console.log("Promoting to researcher...");
        await pool.query("BEGIN");
        await pool.query("UPDATE users SET role = $1 WHERE id = $2", ['researcher', userId]);

        const resCheck = await pool.query("SELECT user_id FROM researchers WHERE user_id = $1", [userId]);
        if (resCheck.rowCount === 0) {
            console.log("Creating researcher profile...");
            await pool.query("INSERT INTO researchers (user_id) VALUES ($1)", [userId]);
        }
        await pool.query("COMMIT");
        console.log("Promotion successful.");

        // Verify
        const verifyRes = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
        console.log(`New Role: ${verifyRes.rows[0].role}`);

        const verifyProfile = await pool.query("SELECT * FROM researchers WHERE user_id = $1", [userId]);
        console.log(`Researcher Profile Exists: ${verifyProfile.rowCount > 0}`);

        if (verifyRes.rows[0].role !== 'researcher' || verifyProfile.rowCount === 0) {
            throw new Error("Promotion failed verification");
        }

    } catch (err) {
        await pool.query("ROLLBACK");
        console.error("Transaction failed:", err);
    } finally {
        // Cleanup
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        pool.end();
    }
}

testRoleUpdate();
