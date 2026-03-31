import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "./backend/db.js";

async function createAdmin() {
    try {
        const email = "tanviagrawal@utexas.edu";
        const password = "admin123";
        const hash = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const result = await pool.query(`
            INSERT INTO users (
                email, password_hash, role, first_name, last_name, 
                verification_token, terms_accepted_at, is_verified, is_tiso
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE 
            SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_verified = TRUE, is_tiso = TRUE
            RETURNING id, email, role;
        `, [
            email, hash, "admin", "Tanvi", "Agrawal", 
            verificationToken, new Date(), true, true
        ]);

        console.log("Admin created successfully:", result.rows[0]);
    } catch (e) {
        console.error("Failed to create admin:", e);
    } finally {
        pool.end();
    }
}

createAdmin();
