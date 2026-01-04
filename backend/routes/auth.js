import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {loginLimiter, signupLimiter} from "../middleware/rateLimit.js";
import {loginValidation, signupValidation} from "../middleware/validation.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../util/email.js";

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

    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 3. Prepare Query
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        role,
        first_name,
        last_name,
        verification_token
        ${role === "user" ? ", dob" : ""}
      )
      VALUES ($1, $2, $3, $4, $5, $6${role === "user" ? ", $7" : ""})
      RETURNING id, email, role
    `;

    // 4. FIX: Include verificationToken in the params array
    const params = [email, hash, role, first_name, last_name, verificationToken];
    
    // If it's a user, dob becomes the 7th parameter ($7)
    if (role === "user") params.push(dob);

    const result = await pool.query(query, params);
    const user = result.rows[0];

    // 5. Send Email (ensure variable name matches: verificationToken)
    try {
        await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
        console.error("Email failed to send:", emailErr);
    }

    

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

    return res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
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

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

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


router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    const result = await pool.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id",
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
