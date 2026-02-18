import express from "express";
import { pool } from "../db.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// All telemetry routes require a valid API key
router.use(apiKeyAuth);

/**
 * POST /api/telemetry/session/start
 * Start a new game session for a participant.
 *
 * Body: { participantId }
 * Returns: { sessionId }
 */
router.post("/session/start", async (req, res) => {
    const { participantId } = req.body;
    const gameId = req.gameId;

    if (!participantId) {
        return res.status(400).json({ error: "participantId is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO game_sessions (game_id, participant_id)
             VALUES ($1, $2)
             RETURNING id, started_at`,
            [gameId, participantId]
        );

        const session = result.rows[0];

        res.status(201).json({
            sessionId: session.id,
            startedAt: session.started_at
        });
    } catch (err) {
        console.error("Session start error:", err);
        // Handle FK violation (participant doesn't exist)
        if (err.code === "23503") {
            return res.status(400).json({ error: "Invalid participantId — user does not exist" });
        }
        res.status(500).json({ error: "Failed to start session" });
    }
});

/**
 * POST /api/telemetry/session/end
 * End an active game session.
 *
 * Body: { sessionId, score? }
 */
router.post("/session/end", async (req, res) => {
    const { sessionId, score } = req.body;
    const gameId = req.gameId;

    if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
    }

    try {
        const result = await pool.query(
            `UPDATE game_sessions
             SET ended_at = NOW(), score = COALESCE($1, score)
             WHERE id = $2 AND game_id = $3 AND ended_at IS NULL
             RETURNING *`,
            [score, sessionId, gameId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Session not found or already ended" });
        }

        res.json({
            sessionId: result.rows[0].id,
            endedAt: result.rows[0].ended_at,
            score: result.rows[0].score
        });
    } catch (err) {
        console.error("Session end error:", err);
        res.status(500).json({ error: "Failed to end session" });
    }
});

/**
 * POST /api/telemetry/track
 * Track a game event → writes to activity_logs.
 *
 * Body: { sessionId, eventType, data? }
 */
router.post("/track", async (req, res) => {
    const { sessionId, eventType, data } = req.body;
    const gameId = req.gameId;

    if (!sessionId || !eventType) {
        return res.status(400).json({ error: "sessionId and eventType are required" });
    }

    try {
        // Verify session belongs to this game and is active
        const sessionCheck = await pool.query(
            `SELECT id, participant_id FROM game_sessions
             WHERE id = $1 AND game_id = $2`,
            [sessionId, gameId]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: "Session not found for this game" });
        }

        const participantId = sessionCheck.rows[0].participant_id;

        // Write to activity_logs
        const result = await pool.query(
            `INSERT INTO activity_logs (user_id, action_type, description, metadata)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
            [
                participantId,
                eventType,
                `Game event: ${eventType}`,
                {
                    game_id: gameId,
                    session_id: sessionId,
                    event_data: data || {},
                    source: "sdk"
                }
            ]
        );

        res.status(201).json({
            eventId: result.rows[0].id,
            trackedAt: result.rows[0].created_at
        });
    } catch (err) {
        console.error("Track event error:", err);
        res.status(500).json({ error: "Failed to track event" });
    }
});

export default router;
