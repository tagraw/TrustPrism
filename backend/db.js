// db.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch(err => {
    console.error("🔥 Failed to connect to PostgreSQL:", err);
    process.exit(1);
  });
