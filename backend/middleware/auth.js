import jwt from "jsonwebtoken";
import { pool } from "../db.js";

console.log("🔥 auth middleware loaded");

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.token;

    // Fallback for frontend clients that haven't transitioned yet (if any)
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication token missing" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Sliding Session Window: Enforce 24-hour inactivity logout.
    // If the token was issued more than 15 minutes ago, generate a fresh 24-hour token.
    // This resets the 24-hour inactivity timer silently while protecting backend CPU overhead.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const ageMinutes = (nowEpoch - decoded.iat) / 60;
    
    if (ageMinutes >= 15) {
        const expiresIn = "24h";
        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn }
        );
        
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        // Also update the continuous activity timestamp to stave off the 120-day hard suspension.
        pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [decoded.id]).catch(err => {
            console.error("Failed to update last_login_at in sliding session", err.message);
        });
    }

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
