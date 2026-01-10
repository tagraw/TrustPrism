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
