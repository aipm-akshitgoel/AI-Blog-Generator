-- Add platform column to business_context
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS platform text DEFAULT 'blog';

-- Optional: ensure existing rows have a platform
UPDATE business_context SET platform = 'blog' WHERE platform IS NULL;
