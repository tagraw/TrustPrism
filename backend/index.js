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
import sessionRoutes from "./routes/sessions.js";
import projectRoutes from "./routes/projects.js";
import dashboardRoutes from "./routes/dashboard.js";
import insightsRoutes from "./routes/insights.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import telemetryRoutes from "./routes/telemetry.js";
import aiProxyRoutes from "./routes/aiProxy.js";
import participantRoutes from "./routes/participant.js";
console.log("✅ .env loaded:", {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_PORT: process.env.DB_PORT
});
console.log("🔥 INDEX.JS LOADED FROM:", import.meta.url);

import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5175", "http://localhost:5174", "http://localhost:3000"], // Explicitly allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true
  }
});
app.use(cors({
  origin: ["http://localhost:5175", "http://localhost:5174", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  credentials: true
}));

// Attach io to req for usage in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket connection handler
io.on("connection", (socket) => {
  console.log("Websocket connected:", socket.id);

  socket.on("join_project", (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`Socket ${socket.id} joined project_${projectId}`);
  });

  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("Websocket disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());

// Serve uploaded files (consent forms, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/', (req, res) => {
  res.send('Backend alive');
});


app.get("/test", (req, res) => res.send("Backend works!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));


// Routes
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/sessions", sessionRoutes);
app.use("/projects", projectRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/insights", insightsRoutes);
app.use("/chat", chatRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/ai", aiProxyRoutes);
app.use("/participant", participantRoutes);

// Catch-all unmatched route
app.use((req, res) => {
  console.log("⚠️ UNMATCHED ROUTE:", req.method, req.url);
  res.status(404).json({ error: "Route not found" });
});
server.listen(5000, '0.0.0.0', () => {
  console.log('Backend running on port 5000 on 0.0.0.0');
});