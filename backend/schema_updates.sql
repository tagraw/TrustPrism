-- Add group_id to games table to link projects to research groups
ALTER TABLE games ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES researcher_groups(id) ON DELETE SET NULL;

-- Create project messages table for collaboration chat
CREATE TABLE IF NOT EXISTS project_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster chat retrieval
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_messages(project_id);
