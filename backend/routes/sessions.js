import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logSIEMEvent } from "../util/siem.js";

const router = express.Router();

/**
 * POST /sessions
 * Start a new game session.
 * req.body: { gameId }
 */
router.post("/", requireAuth, async (req, res) => {
  const { gameId } = req.body;
  if (!gameId) return res.status(400).json({ error: "gameId is required" });

  try {
    const result = await pool.query(
      `INSERT INTO game_sessions (game_id, participant_id, started_at) 
       VALUES ($1, $2, NOW()) RETURNING *`,
      [gameId, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to start game session:", err.message);
    res.status(500).json({ error: "Failed to start session" });
  }
});

/**
 * POST /sessions/interactions
 * Log an AI interaction for an active session.
 * req.body: { sessionId, gameId, eventType, payload }
 * 
 * TACC Security: Verifies that the sessionId belongs to the authenticated participant.
 */
router.post("/interactions", requireAuth, async (req, res) => {
  const { sessionId, gameId, eventType, payload } = req.body;
  
  if (!sessionId || !gameId || !eventType) {
    return res.status(400).json({ error: "Missing required fields (sessionId, gameId, eventType)" });
  }

  try {
    // 1. Verify Session Ownership (BOLA Prevention)
    const sessionCheck = await pool.query(
      "SELECT participant_id FROM game_sessions WHERE id = $1",
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (sessionCheck.rows[0].participant_id !== req.user.id) {
        await logSIEMEvent(req.user.id, "SUSPICIOUS_ACTIVITY", req.ip, {
            reason: "ATTEMPTED_INTERACTION_SPOOF",
            sessionId,
            target_participant: sessionCheck.rows[0].participant_id
        });
        return res.status(403).json({ error: "Access Denied: unauthorized session interaction" });
    }

    // 2. Insert into ai_interaction_logs (aligned with schema.sql)
    const result = await pool.query(
      `INSERT INTO ai_interaction_logs 
       (game_id, session_id, participant_id, event_type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [gameId, sessionId, req.user.id, eventType, payload || {}]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to log interaction:", err.message);
    res.status(500).json({ error: "Failed to log interaction" });
  }
});

export default router;