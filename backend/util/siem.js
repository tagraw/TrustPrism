import { pool } from "../db.js";

/**
 * TACC 3.03.03 — Policy Category mapping.
 * Maps every SIEM event_type to one of the 15 required audit categories.
 * Used by the admin SIEM viewer for filtering and compliance reporting.
 */
export const SIEM_EVENT_CATEGORY = {
    // Category 1 — Unsuccessful Logon Attempts
    LOGIN_FAILED:                   "UNSUCCESSFUL_LOGON",
    LOGIN_FAILED_PASSWORD:          "UNSUCCESSFUL_LOGON",
    LOGIN_FAILED_DISABLED:          "UNSUCCESSFUL_LOGON",
    LOGIN_FAILED_SUSPENDED:         "UNSUCCESSFUL_LOGON",
    LOGIN_FAILED_UNVERIFIED:        "UNSUCCESSFUL_LOGON",
    MFA_FAILED:                     "UNSUCCESSFUL_LOGON",

    // Category 2 — Privileged Account Activity
    ADMIN_USER_STATUS_UPDATE:       "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_ROLE_UDPATE:              "PRIVILEGED_ACCOUNT_ACTIVITY",   // legacy typo kept for data continuity
    ADMIN_ROLE_UPDATE:              "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_GROUP_TRANSFER:           "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_API_KEY_GENERATED:        "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_API_KEY_REVOKED:          "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_TICKET_ASSIGNED:          "PRIVILEGED_ACCOUNT_ACTIVITY",
    ADMIN_SIEM_ACCESSED:            "PRIVILEGED_ACCOUNT_ACTIVITY",

    // Category 3 — User & Group Account Management
    REGISTER_SUCCESS:               "ACCOUNT_MANAGEMENT",
    REGISTER_REJECTED_COC:          "ACCOUNT_MANAGEMENT",
    GROUP_CREATED:                  "ACCOUNT_MANAGEMENT",
    GROUP_MEMBER_ADDED:             "ACCOUNT_MANAGEMENT",
    PROFILE_UPDATED:                "ACCOUNT_MANAGEMENT",

    // Category 4 & 11 — Modification / Managing Access Rights
    ADMIN_ACCESS_SCOPE_CHANGED:     "ACCESS_RIGHTS_MODIFICATION",

    // Category 5 & 12 — Security Configuration / System Configuration
    ADMIN_SETTINGS_CHANGED:         "SECURITY_CONFIG_CHANGE",
    ADMIN_GAME_STAGING_URL_SET:     "SYSTEM_CONFIG_CHANGE",

    // Category 6 — Remote Logons (all LOGIN_SUCCESS events carry IP)
    LOGIN_SUCCESS:                  "REMOTE_LOGON",

    // Category 7 — Handling Confidential / Auth Data
    MFA_SUCCESS:                    "CONFIDENTIAL_DATA_HANDLING",
    PASSWORD_RESET_REQUESTED:       "CONFIDENTIAL_DATA_HANDLING",
    PASSWORD_RESET_COMPLETED:       "CONFIDENTIAL_DATA_HANDLING",
    PASSWORD_CHANGED_SELF:          "CONFIDENTIAL_DATA_HANDLING",

    // Category 9 — User Auth & Authorization
    LOGOUT_SUCCESS:                 "AUTH_AUTHORIZATION",

    // Category 10 — Privilege Access & Use
    // (ADMIN_SIEM_ACCESSED already mapped above)

    // Category 5/12 — Configuration Change Requests (CCR workflow)
    CCR_SUBMITTED:                  "SECURITY_CONFIG_CHANGE",
    CCR_APPROVED:                   "SECURITY_CONFIG_CHANGE",
    CCR_DISAPPROVED:                "SECURITY_CONFIG_CHANGE",

    // Category 12 — NTP / System Time Check
    ADMIN_SYSTEM_TIME_CHECKED:      "SYSTEM_CONFIG_CHANGE",

    // Category 13 — Managing Application Processes
    ADMIN_GAME_STATUS_CHANGE:       "APPLICATION_PROCESS_MANAGEMENT",
    ADMIN_GAME_DISABLED:            "APPLICATION_PROCESS_MANAGEMENT",
    ADMIN_TICKET_STATUS_CHANGED:    "APPLICATION_PROCESS_MANAGEMENT",

    // Category 14 — Application Failures & Resource Issues
    SYSTEM_ERROR:                   "APPLICATION_FAILURE",

    // Category 15 — Detecting Suspicious / Malicious Activity
    USER_SUSPENDED_INACTIVE:        "SUSPICIOUS_ACTIVITY",
    RATE_LIMIT_EXCEEDED:            "SUSPICIOUS_ACTIVITY",
};

/**
 * Logs an event to the SIEM table for NSO (Networking, Security, & Operations) auditing.
 * TACC 3.03.03 — Generates audit records for all required event categories.
 *
 * @param {string|null} user_id    - UUID of the user triggering the event (null for anonymous).
 * @param {string}      event_type - Categorized event string (e.g. 'LOGIN_FAILED').
 * @param {string}      ip_address - IP address of the requester.
 * @param {object}      details    - Additional JSON metadata context for the event.
 */
export async function logSIEMEvent(user_id, event_type, ip_address, details = {}) {
    const category = SIEM_EVENT_CATEGORY[event_type] || "UNCATEGORIZED";
    try {
        await pool.query(
            `INSERT INTO siem_logs (user_id, event_type, category, ip_address, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [user_id, event_type, category, ip_address || "0.0.0.0", JSON.stringify(details)]
        );
    } catch (err) {
        // Do not crash the main thread if audit logging fails — but always emit to stderr
        console.error("[SIEM LOGGING ERROR]", err.message);
    }
}
