import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { loginLimiter, signupLimiter, passwordResetLimiter } from "../middleware/rateLimit.js";
import { loginValidation, signupValidation } from "../middleware/validation.js";
import crypto from "crypto";
import { sendVerificationEmail, sendMfaEmail } from "../util/email.js";
import { sendPasswordResetEmail } from "../util/email.js";
import { body, validationResult } from "express-validator";
import { validatePassword, checkLockout, recordLoginAttempt, getSettings } from "../util/settings.js";
import { logSIEMEvent } from "../util/siem.js";

const router = express.Router();

// TACC Sanctioned Countries of Concern List
const COUNTRIES_OF_CONCERN = ["CU", "IR", "KP", "SY", "RU"];

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
    createGroupName,
    terms_accepted,
    country
  } = req.body;

  // NIST 800-171: TACC Countries of Concern constraint
  if (country && COUNTRIES_OF_CONCERN.includes(country.toUpperCase())) {
    await logSIEMEvent(null, "REGISTER_REJECTED_COC", req.ip, { email, country });
    return res.status(403).json({ error: "Access denied due to Country of Concern regulations." });
  }


  if (!["user", "researcher"].includes(role)) {
    return res.status(403).json({ error: "Invalid role" });
  }

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!terms_accepted) {
    return res.status(400).json({ error: "You must accept the Terms and Conditions to register" });
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

  // Password policy validation from security settings
  const pwCheck = await validatePassword(password);
  if (!pwCheck.valid) {
    return res.status(400).json({ error: pwCheck.errors.join(". ") });
  }

  try {
    // Hash password
    const hash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 3. Prepare Query
    const dobParam = role === "user" ? ", dob" : "";
    const dobVal = role === "user" ? ", $9" : "";
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        role,
        first_name,
        last_name,
        verification_token,
        terms_accepted_at,
        country
        ${dobParam}
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8${dobVal})
      RETURNING id, email, role
    `;

    // 4. Include verificationToken, terms_accepted_at, country in the params array
    const params = [email, hash, role, first_name, last_name, verificationToken, new Date(), (country || "US").toUpperCase()];

    // If it's a user, dob becomes the 9th parameter ($9)
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

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Add the initial email to the user_emails table
    await pool.query(
      `INSERT INTO user_emails (user_id, email, is_primary, is_verified, verification_token)
      VALUES ($1, $2, TRUE, FALSE, $3)`,
      [user.id, email, verificationToken]
    );

    // Logging event
    await logSIEMEvent(user.id, "REGISTER_SUCCESS", req.ip, { role });

    return res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
      id: user.id,
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
    // Check lockout before anything else
    const lockout = await checkLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Account temporarily locked due to too many failed attempts. Try again in ${lockout.remainingMinutes} minutes.`
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      await recordLoginAttempt(email, req.ip, false);
      // Wait to log SIEM because we don't have user.id, but let's log failed access via email
      await logSIEMEvent(null, "LOGIN_FAILED", req.ip, { email, reason: "Invalid user" });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.status === "disabled") {
      await logSIEMEvent(user.id, "LOGIN_FAILED_DISABLED", req.ip, { email });
      return res.status(403).json({ error: "Your account has been administratively disabled." });
    }

    // ACC POLICY: 120-Days idle Suspension Check
    if (user.last_login_at) {
        const daysIdle = (new Date() - new Date(user.last_login_at)) / (1000 * 60 * 60 * 24);
        if (daysIdle > 120 && user.status !== "suspended") {
            // Force suspend
            await pool.query("UPDATE users SET status = 'suspended', is_verified = FALSE WHERE id = $1", [user.id]);
            await logSIEMEvent(user.id, "USER_SUSPENDED_INACTIVE", req.ip, { daysIdle });
            
            // Generate verification token and assign locally
            const vToken = crypto.randomBytes(32).toString("hex");
            await pool.query("UPDATE users SET verification_token = $1 WHERE id = $2", [vToken, user.id]);
            await pool.query("UPDATE user_emails SET verification_token = $1, is_verified = FALSE WHERE user_id = $2 AND email = $3", [vToken, user.id, user.email]);

            try { await sendVerificationEmail(user.email, vToken); } catch (e) { }
            return res.status(403).json({ error: "Account suspended due to 120 days of inactivity. A verification email has been sent." });
        }
    }

    if (user.status === "suspended") {
        await logSIEMEvent(user.id, "LOGIN_FAILED_SUSPENDED", req.ip, { email });
        return res.status(403).json({ error: "Your account is suspended. Check your email for verification instructions." });
    }

    if (!user.is_verified) {
      await logSIEMEvent(user.id, "LOGIN_FAILED_UNVERIFIED", req.ip, { email });
      return res.status(403).json({
        error: "Your email is not verified. Please check your inbox for the verification link."
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt(email, req.ip, false);
      await logSIEMEvent(user.id, "LOGIN_FAILED_PASSWORD", req.ip, { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Successful login — record it and clear lockout concern
    await recordLoginAttempt(email, req.ip, true);

    // Hard Token Validation interception step
    // TACC NIST Requires a Hard Token for privileged accounts. We're mocking an MFA flow here.
    if (user.role === "admin" || user.is_tiso) {
        // If the user hasn't supplied a code in this request, trigger it
        const providedMfa = req.body.mfa_token;
        if (!providedMfa) {
             const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
             
             await pool.query("UPDATE users SET mfa_token = $1, mfa_token_expires = NOW() + INTERVAL '10 minutes' WHERE id = $2", [mfaCode, user.id]);

             try {
                await sendMfaEmail(email, mfaCode);
             } catch (emailErr) {
                console.error("MFA Email Error:", emailErr);
             }

             return res.status(202).json({ requires_mfa: true, message: "A 6-digit PIN has been transmitted." });
        } else {
             // Verify MFA
             const mfaCheck = await pool.query("SELECT id FROM users WHERE id = $1 AND mfa_token = $2 AND mfa_token_expires > NOW()", [user.id, providedMfa]);
             if (mfaCheck.rowCount === 0) {
                 await logSIEMEvent(user.id, "MFA_FAILED", req.ip, { email });
                 return res.status(401).json({ error: "Invalid or expired Hard Token (MFA)." });
             }
             // Wipe token
             await pool.query("UPDATE users SET mfa_token = NULL, mfa_token_expires = NULL WHERE id = $1", [user.id]);
             await logSIEMEvent(user.id, "MFA_SUCCESS", req.ip, { email });
        }
    }

    // ACC POLICY: Force exactly 24 hours of limits.
    const expiresIn = "24h";

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // Force 24 hours strictly
    });

    // Mark current login activity and log event
    await pool.query("UPDATE users SET last_login_at = NOW(), status = 'active' WHERE id = $1", [user.id]);
    await logSIEMEvent(user.id, "LOGIN_SUCCESS", req.ip, { role: user.role });

    res.json({ id: user.id, role: user.role, is_tiso: user.is_tiso });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// backend/routes/auth.js

router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    // 1. Check the user_emails table first since that's where multiple emails live
    const emailResult = await pool.query(
      "SELECT user_id, email FROM user_emails WHERE verification_token = $1",
      [token]
    );

    if (emailResult.rowCount === 0) {
      return res.status(400).json({ error: "Token invalid or already used." });
    }

    const { user_id, email } = emailResult.rows[0];

    // 2. Start a transaction to ensure both tables update together
    await pool.query("BEGIN");

    // Update the specific email record
    await pool.query(
      "UPDATE user_emails SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
      [token]
    );

    // Update the main user record
    await pool.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1",
      [user_id]
    );

    // If it's a researcher, verify their profile too (based on your existing logic)
    const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [user_id]);
    if (userCheck.rows[0].role === 'researcher') {
      await pool.query(
        "UPDATE researchers SET verified = TRUE WHERE user_id = $1",
        [user_id]
      );
    }

    await pool.query("COMMIT");
    return res.json({ message: "Email verified successfully!" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Verification error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", passwordResetLimiter,
  body("email").isEmail().normalizeEmail(), // This handles the dots/casing automatically
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { email } = req.body; // This will now be the normalized email
    console.log("Searching for normalized email:", email);
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
router.post("/reset-password", passwordResetLimiter, async (req, res) => {
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

// backend/routes/auth.js (or similar)

router.get("/profile-stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get User Name
    const userRes = await pool.query(
      "SELECT first_name, role FROM users WHERE id = $1",
      [userId]
    );

    // 2. Count Completed Sessions (where ended_at is not null)
    const sessionsRes = await pool.query(
      "SELECT COUNT(*) FROM game_sessions WHERE participant_id = $1 AND ended_at IS NOT NULL",
      [userId]
    );

    // 3. Count Available Games (status 'published' or similar)
    const gamesRes = await pool.query(
      "SELECT COUNT(*) FROM games WHERE status = 'published'"
    );

    res.json({
      userId: userId,
      firstName: userRes.rows[0].first_name,
      role: userRes.rows[0].role,
      sessionsCompleted: parseInt(sessionsRes.rows[0].count),
      availableGames: parseInt(gamesRes.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Add a secondary email
router.post("/settings/emails", requireAuth, async (req, res) => {
  const { email } = req.body;
  const userId = req.user.id;
  const verificationToken = crypto.randomBytes(32).toString("hex");

  try {
    await pool.query(
      "INSERT INTO user_emails (user_id, email, verification_token) VALUES ($1, $2, $3)",
      [userId, email, verificationToken]
    );

    // Send verification for the new email
    await sendVerificationEmail(email, verificationToken);

    res.json({ message: "Secondary email added. Please verify it." });
  } catch (err) {
    res.status(400).json({ error: "Email already in use" });
  }
});

// Get all emails for the settings page
router.get("/settings/emails", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT email, is_primary, is_verified FROM user_emails WHERE user_id = $1",
    [req.user.id]
  );
  res.json(result.rows);
});

// backend/routes/auth.js

// Update basic profile info + extended fields
router.put("/settings/profile", requireAuth, async (req, res) => {
  const {
    first_name,
    last_name,
    affiliation,
    research_interests,
    api_key,
    notification_prefs
  } = req.body;

  try {
    await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           affiliation = $3,
           research_interests = $4,
           api_key = $5,
           notification_prefs = $6
       WHERE id = $7`,
      [
        first_name,
        last_name,
        affiliation,
        research_interests, // Expected to be an array or null
        api_key,
        notification_prefs, // Expected to be JSON object
        req.user.id
      ]
    );
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get full settings profile
router.get("/settings/profile", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, email, affiliation, research_interests, api_key, notification_prefs
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update password from settings
router.put("/settings/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);

    if (!isMatch) return res.status(401).json({ error: "Current password incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  // If user is logged in (has cookie), log it. Wait, the route doesn't have requireAuth, so we might need to parse.
  // We'll just clear the cookie.
  // Let's grab user from cookie specifically for logging logic.
  let loggedUserId = null;
  const tkn = req.cookies?.token;
  if (tkn) {
      try {
          const payload = jwt.verify(tkn, process.env.JWT_SECRET);
          loggedUserId = payload.id;
      } catch (e) { }
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  if (loggedUserId) await logSIEMEvent(loggedUserId, "LOGOUT_SUCCESS", req.ip);

  res.json({ message: "Logged out successfully" });
});

export default router;
