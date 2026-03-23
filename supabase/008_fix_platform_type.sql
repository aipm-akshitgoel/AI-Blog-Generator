-- Drop the incorrect JSON column if it exists
ALTER TABLE strategy_sessions DROP COLUMN IF EXISTS platform;

-- Add the platform column with the correct TEXT type
ALTER TABLE strategy_sessions ADD COLUMN platform text DEFAULT 'blog';
