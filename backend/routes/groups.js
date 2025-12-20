import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * CREATE GROUP
 * Only verified researchers
 */
router.post("/", requireAuth, requireRole("researcher"), async (req, res) => {
  const { name, description } = req.body;
  const researcherId = req.user.id;

  try {
    // Check verified researcher
    const { rows } = await pool.query(
      "SELECT verified FROM researchers WHERE user_id = $1",
      [researcherId]
    );

    if (!rows[0] || !rows[0].verified) {
      return res.status(403).json({ error: "Researcher not verified" });
    }

    // Insert group
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
});

/**
 * JOIN GROUP
 * Only verified researchers
 */
router.post("/:groupId/join", requireAuth, requireRole("researcher"), async (req, res) => {
  const researcherId = req.user.id;
  const { groupId } = req.params;

  try {
    // Check verified
    const { rows } = await pool.query(
      "SELECT verified FROM researchers WHERE user_id = $1",
      [researcherId]
    );

    if (!rows[0] || !rows[0].verified) {
      return res.status(403).json({ error: "Researcher not verified" });
    }

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

export default router;
