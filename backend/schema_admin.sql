-- Add temp access expiration for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_access_expires_at TIMESTAMP;
