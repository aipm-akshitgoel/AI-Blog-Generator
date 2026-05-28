-- Brand voice (tone) separate from market positioning
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS brand_tone text;
