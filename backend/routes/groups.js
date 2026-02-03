import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";

const router = express.Router();

const createGroupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many groups created, please try again later."
});

/**
 * CREATE GROUP
 * Only verified researchers
 */
router.post(
  "/",
  requireAuth,
  requireRole("researcher"),
  createGroupLimiter,
  [
    body("name").trim().isLength({ min: 3 }).withMessage("Group name must be at least 3 characters"),
    body("description").optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const researcherId = req.user.id;

    try {
      // Check verified researcher (using users table)
      const { rows } = await pool.query(
        "SELECT is_verified FROM users WHERE id = $1",
        [researcherId]
      );

      if (!rows[0] || !rows[0].is_verified) {
        return res.status(403).json({ error: "Researcher not verified" });
      }

      // Insert group (Logic moved after FK check)

      // Ensure researcher record exists for FK to avoid constraint violation
      await pool.query(`
        INSERT INTO researchers (user_id, verified)
        VALUES ($1, (SELECT is_verified FROM users WHERE id = $1))
        ON CONFLICT (user_id) DO UPDATE SET verified = EXCLUDED.verified
      `, [researcherId]);

      // Now insert group
      const groupResult = await pool.query(
        `INSERT INTO researcher_groups (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description, researcherId]
      );

      const group = groupResult.rows[0];

      // Add creator as 'owner'
      await pool.query(
        `INSERT INTO researcher_group_members (researcher_id, group_id, role)
         VALUES ($1, $2, 'owner')`,
        [researcherId, group.id]
      );

      res.status(201).json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create group" });
    }
  }
);

/**
 * JOIN GROUP
 * Only verified researchers
 */
router.post("/:groupId/join", requireAuth, requireRole("researcher"), async (req, res) => {
  const researcherId = req.user.id;
  const { groupId } = req.params;

  try {
    // Check verified
    // const { rows } = await pool.query(
    //   "SELECT verified FROM researchers WHERE user_id = $1",
    //   [researcherId]
    // );

    // if (!rows[0] || !rows[0].verified) {
    //   return res.status(403).json({ error: "Researcher not verified" });
    // }

    // Add to group members
    await pool.query(
      `INSERT INTO researcher_group_members (researcher_id, group_id)
       VALUES ($1, $2)`,
      [researcherId, groupId]
    );

    res.json({ message: "Joined group successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Already a member or invalid group" });
  }
});

/**
 * LIST GROUPS WITH MEMBERS
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rg.id, rg.name, rg.description, rg.created_by, rg.created_at,
              json_agg(json_build_object(
                'researcher_id', rgm.researcher_id,
                'role', rgm.role
              )) AS members
       FROM researcher_groups rg
       LEFT JOIN researcher_group_members rgm ON rg.id = rgm.group_id
       GROUP BY rg.id`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

/**
 * GET researcher groups that the logged-in researcher belongs to
 */
router.get("/my-groups", requireAuth, requireRole("researcher"), async (req, res) => {
  const researcherId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT rg.id, rg.name, rg.description
      FROM researcher_groups rg
      JOIN researcher_group_members rgm
        ON rg.id = rgm.group_id
      WHERE rgm.researcher_id = $1
      `,
      [researcherId]
    );

    res.json(result.rows); // returns array of groups
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your groups" });
  }
});


/**
 * GET /groups/:groupId
 * Get details + members
 */
router.get("/:groupId", requireAuth, async (req, res) => {
  const { groupId } = req.params;
  try {
    // Fetch group info
    const groupRes = await pool.query("SELECT * FROM researcher_groups WHERE id = $1", [groupId]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: "Group not found" });

    // Fetch members with User details
    const membersRes = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, rgm.role
            FROM researcher_group_members rgm
            JOIN researchers r ON rgm.researcher_id = r.user_id
            JOIN users u ON r.user_id = u.id
            WHERE rgm.group_id = $1
        `, [groupId]);

    res.json({
      ...groupRes.rows[0],
      members: membersRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

/**
 * GET /groups/:groupId/games
 * Get games for this group
 */
router.get("/:groupId/games", requireAuth, async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM games WHERE group_id = $1 ORDER BY created_at DESC",
      [groupId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group games" });
  }
});

/**
 * POST /groups/:groupId/invite
 * Invite a user by email
 */
router.post("/:groupId/invite", requireAuth, requireRole("researcher"), async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  // In a real app, generate a unique token, store in DB, email it.
  // For MVP/Demo: Just log it.
  console.log(`[INVITE SYSTEM] Sending invite to ${email} for group ${groupId}`);
  console.log(`[INVITE LINK] http://localhost:5173/join?group=${groupId}&email=${encodeURIComponent(email)}`);

  // Simulate success
  res.json({ message: `Invitation sent to ${email}` });
});


export default router;
