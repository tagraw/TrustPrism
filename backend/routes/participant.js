import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /participant/games
 * List all published games for participants to browse & play.
 * Supports ?search=<term> and ?sort=latest|oldest
 */
router.get("/games", requireAuth, async (req, res) => {
    const { search, sort = "latest" } = req.query;
    const userId = req.user.id;

    try {
        let query = `
            SELECT g.id, g.name, g.description, g.game_type, g.category,
                   g.age_group, g.research_tags, g.ai_usage_type,
                   g.production_url, g.consent_form_url, g.created_at,
                   u.first_name || ' ' || u.last_name AS researcher_name,
                   COALESCE(s.session_count, 0)::int AS my_sessions,
                   s.best_score AS my_best_score,
                   s.last_played
            FROM games g
            JOIN users u ON g.researcher_id = u.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS session_count,
                       MAX(gs.score) AS best_score,
                       MAX(gs.started_at) AS last_played
                FROM game_sessions gs
                WHERE gs.game_id = g.id AND gs.participant_id = $1
            ) s ON true
            WHERE g.status = 'published'
        `;
        const params = [userId];
        let paramIdx = 2;

        if (search) {
            query += ` AND (g.name ILIKE $${paramIdx} OR g.description ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        query += sort === "oldest"
            ? ` ORDER BY g.created_at ASC`
            : ` ORDER BY g.created_at DESC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Failed to fetch published games:", err);
        res.status(500).json({ error: "Failed to fetch games" });
    }
});

/**
 * GET /participant/games/:id
 * Get a single published game with full details for the participant.
 */
router.get("/games/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(`
            SELECT g.*,
                   u.first_name || ' ' || u.last_name AS researcher_name
            FROM games g
            JOIN users u ON g.researcher_id = u.id
            WHERE g.id = $1 AND g.status = 'published'
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Game not found or not published" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch game" });
    }
});

/**
 * GET /participant/my-stats
 * Overall stats for the current user across all games.
 */
router.get("/my-stats", requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS total_sessions,
                COUNT(DISTINCT game_id)::int AS games_played,
                COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::int AS completed_sessions,
                COALESCE(MAX(score), 0) AS best_score,
                COALESCE(ROUND(AVG(score) FILTER (WHERE score IS NOT NULL))::int, 0) AS avg_score,
                COALESCE(
                    SUM(
                        CASE WHEN ended_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
                            ELSE 0
                        END
                    ), 0
                ) AS total_play_time_seconds
            FROM game_sessions
            WHERE participant_id = $1
        `, [userId]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/**
 * GET /participant/games/:id/my-stats
 * Per-game stats for the current user.
 */
router.get("/games/:id/my-stats", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS session_count,
                COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::int AS completed_sessions,
                COALESCE(MAX(score), 0) AS best_score,
                COALESCE(ROUND(AVG(score) FILTER (WHERE score IS NOT NULL))::int, 0) AS avg_score,
                COALESCE(
                    SUM(
                        CASE WHEN ended_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
                            ELSE 0
                        END
                    ), 0
                ) AS total_play_time_seconds,
                MAX(started_at) AS last_played
            FROM game_sessions
            WHERE game_id = $1 AND participant_id = $2
        `, [id, userId]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch game stats" });
    }
});

/**
 * POST /participant/consents
 * Record that the current user has accepted consent for a specific game.
 */
router.post("/consents", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { gameId, consentFormUrl } = req.body;

    if (!gameId) {
        return res.status(400).json({ error: "gameId is required" });
    }

    try {
        await pool.query(`
            INSERT INTO user_consents (user_id, game_id, consent_form_url)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, game_id) DO NOTHING
        `, [userId, gameId, consentFormUrl || null]);

        res.json({ message: "Consent recorded" });
    } catch (err) {
        console.error("Failed to record consent:", err);
        res.status(500).json({ error: "Failed to record consent" });
    }
});

/**
 * GET /participant/consents
 * Return all game IDs the current user has consented to.
 * Used by the dashboard to skip showing consent modal for already-consented games.
 */
router.get("/consents", requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            "SELECT game_id FROM user_consents WHERE user_id = $1",
            [userId]
        );
        res.json(rows.map(r => r.game_id));
    } catch (err) {
        console.error("Failed to fetch consents:", err);
        res.status(500).json({ error: "Failed to fetch consents" });
    }
});

/**
 * GET /participant/my-consents
 * Return detailed consent history with game names, URLs, and timestamps.
 * Used by the settings view to display accepted consents.
 */
router.get("/my-consents", requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(`
            SELECT uc.id, uc.game_id, g.name AS game_name,
                   uc.consent_form_url, uc.accepted_at
            FROM user_consents uc
            JOIN games g ON g.id = uc.game_id
            WHERE uc.user_id = $1
            ORDER BY uc.accepted_at DESC
        `, [userId]);

        res.json(rows);
    } catch (err) {
        console.error("Failed to fetch consent history:", err);
        res.status(500).json({ error: "Failed to fetch consent history" });
    }
});

export default router;
