-- Account-level SEO defaults (category, schema, readability target, etc.)
-- Safe to re-run.

ALTER TABLE business_context ADD COLUMN IF NOT EXISTS seo_defaults jsonb DEFAULT NULL;
