-- Add platform column to strategy_sessions
ALTER TABLE strategy_sessions ADD COLUMN IF NOT EXISTS platform text DEFAULT 'blog';

-- Ensure existing rows have a platform
UPDATE strategy_sessions SET platform = 'blog' WHERE platform IS NULL;
