-- System-wide security settings (singleton row, key-value style)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row
    settings JSONB NOT NULL DEFAULT '{
        "sessionTimeout": 30,
        "maxLoginAttempts": 5,
        "lockoutDuration": 15,
        "passwordMinLength": 8,
        "passwordRequireUppercase": true,
        "passwordRequireNumber": true,
        "passwordRequireSpecial": true,
        "mfaEnabled": false,
        "apiRateLimit": 100,
        "apiRateWindow": 60,
        "maxApiKeysPerGame": 3,
        "autoRevokeInactiveKeys": true,
        "autoRevokeDays": 90,
        "auditLogRetentionDays": 365,
        "consentFormRequired": true,
        "irbApprovalRequired": true,
        "dataExportApproval": false
    }'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default row if not exists
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);
