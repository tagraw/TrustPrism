import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

/**
 * REGISTER
 * Only "user" and "researcher"
 */
router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!["user", "researcher"].includes(role)) {
    return res.status(403).json({ error: "Invalid role" });
  }

  try {
    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, hash, role]
    );

    const user = result.rows[0];

    // If researcher, create profile
    if (role === "researcher") {
      await pool.query(
        `INSERT INTO researchers (user_id) VALUES ($1)`,
        [user.id]
      );
    }

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Email already exists" });
  }
});

/**
 * LOGIN
 * All roles (including admin)
 * Optional: check verified for researchers
 */
router.post("/login", async (req, res) => {
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
      { expiresIn: "1h" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
