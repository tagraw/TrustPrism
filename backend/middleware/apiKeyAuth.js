import { pool } from "../db.js";
import bcrypt from "bcrypt";

/**
 * API Key Authentication Middleware
 *
 * Reads `x-api-key` header, validates against hashed keys in the DB.
 * On success, attaches req.gameId and req.apiKeyId.
 *
 * This is used for SDK/external game endpoints (telemetry, AI proxy)
 * instead of JWT auth — the API key IS the auth.
 */
export async function apiKeyAuth(req, res, next) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({ error: "Missing x-api-key header" });
    }

    // Extract prefix for fast lookup (first 15 chars)
    const prefix = apiKey.substring(0, 15);

    try {
        // Find active keys matching this prefix
        const { rows } = await pool.query(
            `SELECT id, game_id, key_hash, environment
             FROM api_keys
             WHERE key_prefix = $1 AND is_active = TRUE`,
            [prefix]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        // Verify the full key against stored hash
        let matchedKey = null;
        for (const row of rows) {
            const isMatch = await bcrypt.compare(apiKey, row.key_hash);
            if (isMatch) {
                matchedKey = row;
                break;
            }
        }

        if (!matchedKey) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        // Attach context to request
        req.gameId = matchedKey.game_id;
        req.apiKeyId = matchedKey.id;
        req.apiKeyEnv = matchedKey.environment;

        // Update last_used_at (fire-and-forget, don't block the request)
        pool.query(
            "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
            [matchedKey.id]
        ).catch(err => console.error("Failed to update last_used_at:", err));

        next();
    } catch (err) {
        console.error("API key auth error:", err);
        res.status(500).json({ error: "Authentication failed" });
    }
}
