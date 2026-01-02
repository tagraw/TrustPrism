import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {loginLimiter, signupLimiter} from "../middleware/rateLimit.js";
import {loginValidation, signupValidation} from "../middleware/validation.js";

const router = express.Router();

/**
 * REGISTER
 * Only "user" and "researcher"
 */
router.post("/register", signupLimiter, signupValidation, async (req, res) => {
  const {
    email,
    password,
    role,
    first_name,
    last_name,
    dob,
    groupId,
    createGroupName
  } = req.body;


  if (!["user", "researcher"].includes(role)) {
    return res.status(403).json({ error: "Invalid role" });
  }

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // DOB validation only for users
  if (role === "user") {
    if (!dob) {
      return res.status(400).json({ error: "Date of birth is required for users" });
    }

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      return res.status(400).json({
        error: "You must be at least 13 years old to register",
      });
    }
  }

  try {
    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Insert user
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        role,
        first_name,
        last_name
        ${role === "user" ? ", dob" : ""}
      )
      VALUES ($1, $2, $3, $4, $5${role === "user" ? ", $6" : ""})
      RETURNING id, email, role
    `;

    const params = [email, hash, role, first_name, last_name];
    if (role === "user") params.push(dob);

    const result = await pool.query(query, params);

    const user = result.rows[0];

    // If researcher, create profile
    if (role === "researcher") {
  // Create researcher profile
  await pool.query(
    `INSERT INTO researchers (user_id) VALUES ($1)`,
    [user.id]
  );

  let createdGroupId = null;

  // CREATE NEW GROUP
  if (createGroupName && createGroupName.trim() !== "") {
      const groupResult = await pool.query(
        `INSERT INTO researcher_groups (name, description, created_by)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [createGroupName, "", user.id]
      );

      createdGroupId = groupResult.rows[0].id;

      // Add creator as owner
      await pool.query(
        `INSERT INTO researcher_group_members (researcher_id, group_id, role)
        VALUES ($1, $2, 'owner')`,
        [user.id, createdGroupId]
      );
    }

    // JOIN EXISTING GROUP
    if (groupId && groupId.trim() !== "") {
      await pool.query(
        `INSERT INTO researcher_group_members (researcher_id, group_id)
        VALUES ($1, $2)`,
        [user.id, groupId]
      );
    }

    user.createdGroup = createdGroupId;
  }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      role: user.role,
      createdGroup: user.createdGroup ?? null
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

/**
 * LOGIN
 * All roles (including admin)
 * Optional: check verified for researchers
 */
router.post("/login", loginLimiter, loginValidation, async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // // Optional: prevent unverified researchers from logging in
    // if (user.role === "researcher") {
    //   const resCheck = await pool.query(
    //     "SELECT verified FROM researchers WHERE user_id = $1",
    //     [user.id]
    //   );

    //   if (!resCheck.rows[0].verified) {
    //     return res.status(403).json({ error: "Researcher not verified yet" });
    //   }
    // }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});


export default router;
