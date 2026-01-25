-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS (identity + auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'researcher', 'admin')),
  first_name TEXT NOT NULL,         -- Added
  last_name TEXT NOT NULL,          -- Added
  dob DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RESEARCHER PROFILES (role-specific)
CREATE TABLE IF NOT EXISTS researchers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT FALSE
);

--researcher can create a group
CREATE TABLE IF NOT EXISTS researcher_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES researchers(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW()
);

--group members for a group
CREATE TABLE IF NOT EXISTS researcher_group_members (
  researcher_id UUID REFERENCES researchers(user_id) ON DELETE CASCADE,
  group_id UUID REFERENCES researcher_groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'owner')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (researcher_id, group_id)
);

-- ADMIN (role-specific)
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  super_admin BOOLEAN DEFAULT FALSE
);

ALTER TABLE users
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token TEXT,
ADD COLUMN reset_token TEXT,
ADD COLUMN reset_token_expires TIMESTAMP;

-- =========================
-- GAME TABLE
-- =========================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  researcher_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),

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
  researcher_id UUID,
  event_type TEXT NOT NULL,
  ai_model TEXT,
  payload JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_ai_logs_game
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_ai_logs_session
    FOREIGN KEY (session_id)
    REFERENCES game_sessions(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_ai_logs_participant
    FOREIGN KEY (participant_id)
    REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_ai_logs_researcher
    FOREIGN KEY (researcher_id)
    REFERENCES researchers(user_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id
  ON game_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id
  ON ai_interaction_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_event_type
  ON ai_interaction_logs(event_type);