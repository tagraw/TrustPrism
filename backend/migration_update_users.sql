-- Migration: Add status to users and access_scopes to researchers

DO $$
BEGIN
    -- Add status column to users if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled'));
    END IF;

    -- Add access_scopes column to researchers if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'researchers' AND column_name = 'access_scopes') THEN
        ALTER TABLE researchers ADD COLUMN access_scopes JSONB DEFAULT '{}';
    END IF;
END $$;
