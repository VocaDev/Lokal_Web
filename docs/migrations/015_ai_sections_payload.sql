-- Phase B — AI path stores a sections[] payload separately from templated rendering.
-- Apply: paste into Supabase SQL Editor, click Run.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS ai_sections JSONB,
  ADD COLUMN IF NOT EXISTS ai_layout_seed TEXT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'website_customization'
--   AND column_name IN ('ai_sections', 'ai_layout_seed');
-- Expected: 2 rows.
