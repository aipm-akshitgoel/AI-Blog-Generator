-- Add inspiration column to strategy_sessions
ALTER TABLE strategy_sessions ADD COLUMN IF NOT EXISTS inspiration jsonb DEFAULT '[]'::jsonb;
