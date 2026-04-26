-- Phase A — wizard v2 inputs persisted on website_customization
-- Apply: paste into Supabase SQL Editor and click Run.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS site_language TEXT DEFAULT 'sq',
  ADD COLUMN IF NOT EXISTS site_tone TEXT DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS hero_style TEXT DEFAULT 'cinematic',
  ADD COLUMN IF NOT EXISTS section_priority TEXT DEFAULT 'services',
  ADD COLUMN IF NOT EXISTS density TEXT DEFAULT 'dense',
  ADD COLUMN IF NOT EXISTS uniqueness_statement TEXT,
  ADD COLUMN IF NOT EXISTS booking_method TEXT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'website_customization'
--   AND column_name IN ('site_language', 'site_tone', 'hero_style',
--                       'section_priority', 'density', 'uniqueness_statement',
--                       'booking_method');
-- Expected: 7 rows.
