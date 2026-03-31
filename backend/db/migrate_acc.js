import { pool } from "../db.js";

async function migrate() {
    try {
        console.log("Connecting to PostgreSQL...");

        console.log("Adding columns to users table...");

        // 1. last_login_at
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `);

        // 2. country
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US';
        `);

        // 3. is_tiso
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_tiso BOOLEAN DEFAULT FALSE;
        `);

        console.log("Creating siem_logs table for auditing...");
        // 4. siem_logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS siem_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                event_type VARCHAR(100) NOT NULL,
                ip_address VARCHAR(45),
                details JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        // 5. mfa_secret or mfa_token for MFA verification
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS mfa_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS mfa_token_expires TIMESTAMP WITH TIME ZONE;
        `);

        console.log("Migrations applied successfully.");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
