import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/stats", requireAuth, async (req, res) => {
    const researcherId = req.user.id;

    try {
        // Fetch all projects for the researcher (to display in lists and calculate counts)
        const projectsRes = await pool.query(
            `SELECT * FROM games WHERE researcher_id = $1 ORDER BY created_at DESC`,
            [researcherId]
        );

        // Pending admin review count (for admins, or user's own)
        // Recent activity
        const activity = await pool.query(
            `SELECT * FROM activity_logs
       ORDER BY created_at DESC
       LIMIT 10`
        );

        res.json({
            projects: projectsRes.rows,
            activity: activity.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

export default router;
