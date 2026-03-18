-- Migration: Add terms_accepted_at to users + create user_consents table

-- 1. Add terms_accepted_at column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- 2. Create user_consents table to track per-game consent acceptance
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  consent_form_url TEXT,
  accepted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_game ON user_consents(game_id);
