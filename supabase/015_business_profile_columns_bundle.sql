-- Run once in Supabase SQL Editor if profile save fails on missing columns.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE business_context ADD COLUMN IF NOT EXISTS platform text DEFAULT 'blog';
UPDATE business_context SET platform = 'blog' WHERE platform IS NULL;

ALTER TABLE business_context ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS brand_tone text;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS content_guidelines jsonb DEFAULT NULL;
