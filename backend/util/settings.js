/**
 * Centralized Security Settings Helper
 *
 * Loads settings from the system_settings table with a short TTL cache
 * so every request doesn't hit the database.
 */
import { pool } from "../db.js";

const DEFAULTS = {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    mfaEnabled: false,
    apiRateLimit: 100,
    apiRateWindow: 60,
    maxApiKeysPerGame: 3,
    autoRevokeInactiveKeys: true,
    autoRevokeDays: 90,
    auditLogRetentionDays: 365,
    consentFormRequired: true,
    irbApprovalRequired: true,
    dataExportApproval: false
};

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 10_000; // 10 seconds

/**
 * Get the current security settings. Cached for 10s.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
    const now = Date.now();
    if (_cache && (now - _cacheTime) < CACHE_TTL) return _cache;

    try {
        const { rows } = await pool.query("SELECT settings FROM system_settings WHERE id = 1");
        _cache = rows.length > 0 ? { ...DEFAULTS, ...rows[0].settings } : { ...DEFAULTS };
    } catch (err) {
        console.error("Failed to load settings, using defaults:", err.message);
        _cache = { ...DEFAULTS };
    }
    _cacheTime = now;
    return _cache;
}

/**
 * Update settings. Merges with existing settings.
 * @param {Object} updates - Partial settings to merge
 * @param {string} [userId] - Admin user ID who made the change
 * @returns {Promise<Object>} The full updated settings
 */
export async function updateSettings(updates, userId = null) {
    const current = await getSettings();
    const merged = { ...current, ...updates };

    await pool.query(
        `INSERT INTO system_settings (id, settings, updated_at, updated_by)
         VALUES (1, $1, NOW(), $2)
         ON CONFLICT (id) DO UPDATE SET settings = $1, updated_at = NOW(), updated_by = $2`,
        [JSON.stringify(merged), userId]
    );

    // Bust cache
    _cache = merged;
    _cacheTime = Date.now();
    return merged;
}

/** Invalidate cache so next call re-reads from DB */
export function bustCache() {
    _cache = null;
    _cacheTime = 0;
}

/**
 * Validate a password against the current security policy.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export async function validatePassword(password) {
    const s = await getSettings();
    const errors = [];

    if (!password || password.length < s.passwordMinLength) {
        errors.push(`Password must be at least ${s.passwordMinLength} characters`);
    }
    if (s.passwordRequireUppercase && !/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }
    if (s.passwordRequireNumber && !/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    }
    if (s.passwordRequireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Check if an email is currently locked out due to too many failed login attempts.
 * @param {string} email
 * @returns {Promise<{ locked: boolean, remainingMinutes: number }>}
 */
export async function checkLockout(email) {
    const s = await getSettings();
    const windowStart = new Date(Date.now() - s.lockoutDuration * 60 * 1000);

    const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS failed_count
         FROM login_attempts
         WHERE email = $1 AND success = FALSE AND attempted_at > $2`,
        [email, windowStart]
    );

    const failedCount = rows[0]?.failed_count || 0;
    const locked = failedCount >= s.maxLoginAttempts;

    return { locked, remainingMinutes: locked ? s.lockoutDuration : 0, failedCount };
}

/**
 * Record a login attempt.
 * @param {string} email
 * @param {string} ip
 * @param {boolean} success
 */
export async function recordLoginAttempt(email, ip, success) {
    await pool.query(
        `INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)`,
        [email, ip, success]
    );
}
