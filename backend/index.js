import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { apiLimiter } from "./middleware/rateLimit.js";
import { csrfProtection } from "./middleware/security.js";
import { pool } from "./db.js";
import { logSIEMEvent } from "./util/siem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import sessionRoutes from "./routes/sessions.js";
import projectRoutes from "./routes/projects.js";
import dashboardRoutes from "./routes/dashboard.js";
import insightsRoutes from "./routes/insights.js";
import ticketRoutes from "./routes/tickets.js";
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "X-Requested-With", "X-TrustPrism-CSRF"],
    credentials: true
  }
});
app.use(cors({
  origin: ["http://localhost:5175", "http://localhost:5174", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "X-Requested-With", "X-TrustPrism-CSRF"],
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

app.use(express.json());
app.use(cookieParser());

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-ancestors": ["'self'", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(hpp());

// CSRF Protection (Requires X-TrustPrism-CSRF or X-Requested-With header on all POST/PUT/DELETE)
app.use(csrfProtection);

// Logging: skip capturing sensitive request bodies
morgan.token('body', (req) => {
  return JSON.stringify(req.body) === '{}' ? '' : 'BODY-REDACTED';
});
app.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms :body'));

// Global API rate limiting (apply to non-auth API routes)
app.use("/api", apiLimiter);
app.use("/projects", apiLimiter);
app.use("/groups", apiLimiter);
app.use("/sessions", apiLimiter);
app.use("/dashboard", apiLimiter);
app.use("/insights", apiLimiter);
app.use("/admin", apiLimiter);
app.use("/participant", apiLimiter);
app.use("/notifications", apiLimiter);

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
app.use("/api/tickets", ticketRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/ai", aiProxyRoutes);
app.use("/participant", participantRoutes);

// TACC 3.03.03 — Category 14: Application Failures & Resource Issues
// Global error handler — catches all unhandled errors forwarded via next(err)
app.use(async (err, req, res, next) => {
  console.error("[UNHANDLED SERVER ERROR]", err);
  try {
    let userId = null;
    const tkn = req.cookies?.token;
    if (tkn) {
      const { default: jwt } = await import("jsonwebtoken");
      try { userId = jwt.verify(tkn, process.env.JWT_SECRET)?.id; } catch (_) {}
    }
    await logSIEMEvent(userId, "SYSTEM_ERROR", req.ip, {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 4).join(" | ")
    });
  } catch (siemErr) {
    console.error("[SIEM ERROR in global handler]", siemErr.message);
  }
  res.status(500).json({ error: "Internal server error" });
});

// Catch-all unmatched route
app.use((req, res) => {
  console.log("\u26a0\ufe0f UNMATCHED ROUTE:", req.method, req.url);
  res.status(404).json({ error: "Route not found" });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT} on 0.0.0.0`);
});