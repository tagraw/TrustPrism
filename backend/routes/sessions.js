import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Start a new session
router.post("/", requireAuth, async (req, res) => {
  try {
    const { experimentType } = req.body;
    const result = await pool.query(
      `INSERT INTO sessions (user_id, experiment_type) 
       VALUES ($1, $2) RETURNING *`,
      [req.user.id, experimentType]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to start session" });
  }
});

// Log an AI interaction
router.post("/interactions", requireAuth, async (req, res) => {
  try {
    const { sessionId, prompt, aiResponse, hintLevel, confidenceScore } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_interactions 
       (session_id, prompt, ai_response, hint_level, confidence_score)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, prompt, aiResponse, hintLevel, confidenceScore]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to log interaction" });
  }
});

export default router;