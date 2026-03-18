-- Migration to adding demographic, data collection, and IRB fields to games table

-- 1. Demographic Targeting
ALTER TABLE games ADD COLUMN IF NOT EXISTS demographic_filters JSONB;

-- 2. Data Collection Configuration
ALTER TABLE games ADD COLUMN IF NOT EXISTS data_collection_config JSONB;

-- 3. IRB Fields
ALTER TABLE games ADD COLUMN IF NOT EXISTS irb_required BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS irb_number TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS irb_document_url TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS irb_approved BOOLEAN DEFAULT FALSE;
