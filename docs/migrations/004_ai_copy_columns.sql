-- Migration 004: AI-generated copy columns on website_customization
-- Apply manually in Supabase SQL Editor before deploying the new AI generator route.
-- The /api/generate-website route gracefully degrades if these columns are missing,
-- but hero copy / about copy / CTA labels won't persist until this migration runs.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS hero_headline text,
  ADD COLUMN IF NOT EXISTS hero_subheadline text,
  ADD COLUMN IF NOT EXISTS about_copy text,
  ADD COLUMN IF NOT EXISTS cta_primary text,
  ADD COLUMN IF NOT EXISTS cta_secondary text;
