-- Migration 007: Business metadata columns (tagline, founded year, timezone)
--
-- Phase 3 prerequisite + Phase 4.1.
-- Apply manually in Supabase SQL Editor. Idempotent.
--
-- Adds three columns to `businesses`:
--   * tagline TEXT — short marketing line, replaces hardcoded "MORE THAN A HAIRCUT" etc. in templates.
--   * founded_year INTEGER — replaces hardcoded "EST. 2015" / "Est. 2018" template literals.
--   * timezone TEXT DEFAULT 'Europe/Belgrade' — anchors booking slot generation.
--     Kosovo is UTC+1 (UTC+2 DST); 'Europe/Belgrade' is the canonical IANA zone.
--
-- Rollback:
--   ALTER TABLE businesses DROP COLUMN IF EXISTS tagline;
--   ALTER TABLE businesses DROP COLUMN IF EXISTS founded_year;
--   ALTER TABLE businesses DROP COLUMN IF EXISTS timezone;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Belgrade';

-- Backfill existing rows that were inserted before the column had a default.
UPDATE businesses
SET timezone = 'Europe/Belgrade'
WHERE timezone IS NULL;

-- Verification:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'businesses' AND column_name IN ('tagline', 'founded_year', 'timezone');
-- Expected: 3 rows.
