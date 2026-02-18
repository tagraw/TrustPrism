-- ============================================
-- Migration V2: API Keys, Game Fields, AI Logs
-- ============================================

-- 1. Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS research_tags TEXT[];
ALTER TABLE games ADD COLUMN IF NOT EXISTS ai_usage_type TEXT DEFAULT 'none'
  CHECK (ai_usage_type IN ('none', 'assistive', 'adversarial', 'adaptive', 'generative'));
ALTER TABLE games ADD COLUMN IF NOT EXISTS staging_url TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS production_url TEXT;

-- 2. Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'development'
    CHECK (environment IN ('development', 'production')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_game ON api_keys(game_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- 3. Enhance ai_interaction_logs for multi-LLM support
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS ai_provider TEXT;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS ai_model_version TEXT;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS completion_tokens INTEGER;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS latency_ms INTEGER;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS flag_reason TEXT;
