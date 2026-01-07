import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {loginLimiter, signupLimiter} from "../middleware/rateLimit.js";
import {loginValidation, signupValidation} from "../middleware/validation.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../util/email.js";
import { sendPasswordResetEmail } from "../util/email.js";

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
      return res.status(403).json({ 
        error: "Your email is not verified. Please check your inbox for the verification link." 
      });
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


// GET /auth/verify-email?token=...
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    // Check if the user is already verified with this token
    const userResult = await pool.query(
      "SELECT is_verified FROM users WHERE verification_token = $1",
      [token]
    );

    if (userResult.rowCount === 0) {
      // If the token isn't in verification_token, check if a user with that email is already verified
      // Or simply allow the error if the token is completely unknown.
      return res.status(400).json({ error: "Token invalid or already used." });
    }

    // Update the user
    await pool.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
      [token]
    );

    return res.json({ message: "Email verified successfully!" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
      [token, expires, email]
    );

    // FIX: Pass ONLY the raw token to the email utility
    await sendPasswordResetEmail(email, token); 

    res.json({ message: "Reset email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  console.log(token);
  try {
    // SECURITY: Pass the current JS date ($2) instead of using SQL NOW()
    const result = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > $2",
      [token, new Date()] 
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hash, result.rows[0].id]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
