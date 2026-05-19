-- Persist website domain on business profile (required for internal linking + publishing).
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS domain text;
