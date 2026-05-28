-- Domain-level Do's / Don'ts for blog generation (account-wide).
-- Run in Supabase SQL Editor.

ALTER TABLE business_context
  ADD COLUMN IF NOT EXISTS content_guidelines jsonb DEFAULT NULL;

COMMENT ON COLUMN business_context.content_guidelines IS
  'JSON: { "dos": string[], "donts": string[] } — injected into content/optimize prompts';
