import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
console.log("✅ .env loaded:", {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_PORT: process.env.DB_PORT
});
console.log("🔥 INDEX.JS LOADED FROM:", import.meta.url);

const app = express();

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Backend alive');
});


app.get("/test", (req, res) => res.send("Backend works!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));


// Routes
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);

// Catch-all unmatched route
app.use((req, res) => {
  console.log("⚠️ UNMATCHED ROUTE:", req.method, req.url);
  res.status(404).json({ error: "Route not found" });
});
app.listen(5000, '0.0.0.0', () => {
  console.log('Backend running on port 5000 on 0.0.0.0');
});