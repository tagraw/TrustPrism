-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS (identity + auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'researcher', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  affiliation TEXT,             -- Added for researcher
  research_interests TEXT[],    -- Added for researcher (array of strings)
  api_key TEXT,                 -- Added for researcher
  notification_prefs JSONB DEFAULT '{"email": true, "push": false}', -- Added
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')), -- Added for user management
  created_at TIMESTAMP DEFAULT NOW()
);

-- RESEARCHER PROFILES (role-specific)
CREATE TABLE IF NOT EXISTS researchers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT FALSE,
  access_scopes JSONB DEFAULT '{}' -- Added for granular access control
);

-- ADMIN (role-specific)
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  super_admin BOOLEAN DEFAULT FALSE
);

-- 1. Create the new table for multiple emails
CREATE TABLE IF NOT EXISTS user_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- GROUPS
-- =========================
CREATE TABLE IF NOT EXISTS researcher_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES researchers(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS researcher_group_members (
  researcher_id UUID REFERENCES researchers(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES researcher_groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'owner', 'collaborator')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (researcher_id, group_id)
);

-- =========================
-- GAME / PROJECT TABLE
-- =========================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL, -- e.g. 'decision_task', 'image_classification'
  researcher_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_review, ready_for_review, approved, published, archived
  experimental_conditions JSONB, -- AI on/off, reliability %
  consent_form_url TEXT,
  target_sample_size INTEGER,
  irb_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_games_researcher
    FOREIGN KEY (researcher_id)
    REFERENCES researchers(user_id)
    ON DELETE RESTRICT
);

-- =========================
-- GAME SESSIONS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  score INTEGER,

  CONSTRAINT fk_game_sessions_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_game_sessions_participant
    FOREIGN KEY (participant_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- AI INTERACTION LOG TABLE
-- =========================
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  session_id UUID NOT NULL,
  participant_id UUID,
  event_type TEXT NOT NULL, -- 'help_request', 'ai_suggestion', 'user_action'
  ai_model TEXT,
  payload JSONB, -- store specific data like confidence score, suggestion text
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_ai_logs_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_ai_logs_session
    FOREIGN KEY (session_id)
    REFERENCES game_sessions(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id ON ai_interaction_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_event_type ON ai_interaction_logs(event_type);

-- =========================
-- DASHBOARD ACTIVITY LOGS
-- =========================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'create_project', 'publish_game', 'admin_comment'
  description TEXT,
  metadata JSONB, -- e.g. { project_id: '...' }
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- CHAT MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE, -- Project workspace chat
  group_id UUID REFERENCES researcher_groups(id) ON DELETE CASCADE, -- Group chat
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_chat_context CHECK (
    (game_id IS NOT NULL AND group_id IS NULL) OR
    (game_id IS NULL AND group_id IS NOT NULL)
  )
);
