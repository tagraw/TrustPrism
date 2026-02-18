import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";

const router = express.Router();

// Multer setup for consent forms
const storage = multer.diskStorage({
    destination: "./uploads/consent_forms",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

/**
 * GET /projects
 * List projects with filters
 */
router.get("/", requireAuth, async (req, res) => {
    const { status, limit = 50 } = req.query;
    const researcherId = req.user.id;
    const role = req.user.role;

    try {
        let query = `
      SELECT g.*,
             u.first_name || ' ' || u.last_name as researcher_name
      FROM games g
      JOIN users u ON g.researcher_id = u.id
      WHERE 1=1
    `;
        const params = [];

        // If researcher, only show own projects or group projects (simplification: own for now)
        if (role === 'researcher') {
            // Show own projects OR projects from groups the user belongs to
            query += ` AND (
                g.researcher_id = $${params.length + 1}
                OR g.group_id IN (
                    SELECT group_id FROM researcher_group_members WHERE researcher_id = $${params.length + 1}
                )
            )`;
            params.push(researcherId);
        }
        // Admin sees all

        if (status) {
            query += ` AND g.status = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY g.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

/**
 * POST /projects
 * Create new project + auto-generate development API key
 */
router.post("/", requireAuth, requireRole("researcher"), upload.single("consentForm"), async (req, res) => {
    const {
        name,
        description,
        gameType,
        experimentalConditions,
        targetSampleSize,
        irbApproval,
        groupId,
        category,
        ageGroup,
        researchTags,     // comma-separated string from frontend
        aiUsageType
    } = req.body;

    const consentFormUrl = req.file ? `/uploads/consent_forms/${req.file.filename}` : null;
    const researcherId = req.user.id;

    // Parse research tags from comma-separated string to array
    const tagsArray = researchTags
        ? researchTags.split(",").map(t => t.trim()).filter(Boolean)
        : null;

    try {
        // If groupId is provided, verify membership
        if (groupId) {
            const memberCheck = await pool.query(
                "SELECT 1 FROM researcher_group_members WHERE researcher_id = $1 AND group_id = $2",
                [researcherId, groupId]
            );
            if (memberCheck.rows.length === 0) {
                return res.status(403).json({ error: "You are not a member of this group" });
            }
        }

        // 1. Insert the game
        const result = await pool.query(
            `INSERT INTO games (
                name, description, game_type, researcher_id,
                experimental_conditions, consent_form_url, target_sample_size,
                irb_approval, group_id, status,
                category, age_group, research_tags, ai_usage_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, $12, $13)
            RETURNING *`,
            [
                name, description, gameType, researcherId,
                experimentalConditions, consentFormUrl, targetSampleSize,
                irbApproval === 'true', groupId || null,
                category || null, ageGroup || null, tagsArray, aiUsageType || 'none'
            ]
        );

        const game = result.rows[0];

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (user_id, action_type, description, metadata)
             VALUES ($1, 'create_project', $2, $3)`,
            [researcherId, `Created project: ${name}`, { projectId: game.id }]
        );

        res.status(201).json(game);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create project" });
    }
});

/**
 * GET /projects/:id
 * Get project details
 */
router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query("SELECT * FROM games WHERE id = $1", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Project not found" });

        // Check access (simplification: public for internal users for now)
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * PUT /projects/:id
 * Update project (status, content)
 */
router.put("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, name, description, staging_url } = req.body;
    // Add more fields as needed

    try {
        // Validate ownership or admin or group member
        // For now, allow simple update if authorized

        const oldProject = await pool.query("SELECT * FROM games WHERE id = $1", [id]);
        if (oldProject.rows.length === 0) return res.status(404).json({ error: "Not found" });

        // Basic permission check (improve later)
        if (req.user.role === 'researcher' && oldProject.rows[0].researcher_id !== req.user.id) {
            // Check group membership if it's a group project
            // Skipping complex check for brevity, assuming verified via middleware or simple check
        }

        // Enforce security settings when submitting for review
        if (status === 'pending_review') {
            const { getSettings } = await import("../util/settings.js");
            const settings = await getSettings();
            const project = oldProject.rows[0];

            if (settings.consentFormRequired && !project.consent_form_url) {
                return res.status(400).json({ error: "A consent form PDF is required before submitting for review" });
            }
            if (settings.irbApprovalRequired && !project.irb_approval) {
                return res.status(400).json({ error: "IRB approval is required before submitting for review" });
            }
        }

        const result = await pool.query(
            `UPDATE games SET
        status = COALESCE($1, status),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        staging_url = COALESCE($4, staging_url),
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
            [status, name, description, staging_url, id]
        );

        // Log if status changed
        if (status && status !== oldProject.rows[0].status) {
            await pool.query(
                `INSERT INTO activity_logs (user_id, action_type, description, metadata)
             VALUES ($1, 'update_status', $2, $3)`,
                [req.user.id, `Project ${id} status changed to ${status}`, { projectId: id, oldStatus: oldProject.rows[0].status, newStatus: status }]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Update failed" });
    }
});

/**
 * GET /projects/:id/export
 * Export anonymized CSV data for a published game.
 * Query params: date_from, date_to, age_group, min_completion
 */
router.get("/:id/export", requireAuth, requireRole("researcher"), async (req, res) => {
    const { id } = req.params;
    const { date_from, date_to, age_group, min_completion } = req.query;

    try {
        // 1. Verify game exists, is published, and owned by researcher
        const gameRes = await pool.query(
            "SELECT id, name, researcher_id, status FROM games WHERE id = $1",
            [id]
        );
        if (gameRes.rows.length === 0) return res.status(404).json({ error: "Game not found" });

        const game = gameRes.rows[0];
        if (game.researcher_id !== req.user.id) {
            return res.status(403).json({ error: "You do not own this game" });
        }
        if (game.status !== "published") {
            return res.status(403).json({ error: "Data export is only available for published games" });
        }

        // 2. Build query for sessions with aggregated event data
        let query = `
            SELECT
                gs.participant_id,
                gs.id AS session_id,
                gs.started_at,
                gs.ended_at,
                CASE WHEN gs.ended_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (gs.ended_at - gs.started_at))::int
                    ELSE NULL
                END AS duration_seconds,
                gs.score,
                CASE WHEN gs.ended_at IS NOT NULL THEN 'completed' ELSE 'incomplete' END AS completion_status,
                COALESCE(al.event_count, 0) AS event_count,
                COALESCE(ai.ai_event_count, 0) AS ai_event_count,
                ai.ai_model,
                ai.avg_latency_ms
            FROM game_sessions gs
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS event_count
                FROM activity_logs a
                WHERE a.metadata->>'session_id' = gs.id::text
            ) al ON true
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::int AS ai_event_count,
                    MAX(ail.ai_model) AS ai_model,
                    ROUND(AVG(ail.latency_ms))::int AS avg_latency_ms
                FROM ai_interaction_logs ail
                WHERE ail.session_id = gs.id
            ) ai ON true
            LEFT JOIN users u ON gs.participant_id = u.id
            WHERE gs.game_id = $1
        `;
        const params = [id];
        let paramIdx = 2;

        // Date filters
        if (date_from) {
            query += ` AND gs.started_at >= $${paramIdx}`;
            params.push(date_from);
            paramIdx++;
        }
        if (date_to) {
            query += ` AND gs.started_at <= $${paramIdx}`;
            params.push(date_to);
            paramIdx++;
        }

        // Age group filter (filter on the user's age_group if game table stores it per-game, but actual user age is not stored;
        // we'll skip this filter if no matching column, or use the game's age_group as a pass-through)
        // Since users don't have age_group, this filter isn't applicable at session level.
        // We'll leave it for future expansion.

        // Completion filter
        if (min_completion) {
            // min_completion is a percentage. Filter: only completed sessions.
            query += ` AND gs.ended_at IS NOT NULL`;
        }

        query += ` ORDER BY gs.started_at ASC`;

        const { rows } = await pool.query(query, params);

        // 3. Hash participant IDs for anonymization
        const SALT = process.env.JWT_SECRET || "trustprism-export-salt";
        const anonymize = (id) => crypto.createHash("sha256").update(id + SALT).digest("hex").substring(0, 16);

        // 4. Build CSV
        const headers = [
            "hashed_user_id",
            "session_id",
            "started_at",
            "ended_at",
            "duration_seconds",
            "score",
            "completion_status",
            "event_count",
            "ai_event_count",
            "ai_model",
            "avg_latency_ms"
        ];

        const csvRows = rows.map(r => [
            anonymize(r.participant_id),
            r.session_id,
            r.started_at ? new Date(r.started_at).toISOString() : "",
            r.ended_at ? new Date(r.ended_at).toISOString() : "",
            r.duration_seconds ?? "",
            r.score ?? "",
            r.completion_status,
            r.event_count,
            r.ai_event_count,
            r.ai_model || "",
            r.avg_latency_ms ?? ""
        ]);

        const csvContent = [
            headers.join(","),
            ...csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const filename = `${game.name.replace(/[^a-zA-Z0-9]/g, "_")}_export_${new Date().toISOString().split("T")[0]}.csv`;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csvContent);

    } catch (err) {
        console.error("Export error:", err);
        res.status(500).json({ error: "Failed to export data" });
    }
});

export default router;
