-- Migration 005: Rich AI content columns on website_customization
-- Apply manually in Supabase SQL Editor before using the new /api/apply-theme endpoint.
-- The endpoint gracefully degrades if these columns are missing (colors/fonts still persist).
-- Adds: footer tagline, SEO meta description, and three jsonb payloads
--       (value props, testimonials, FAQ) produced by the generate-variants route.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS footer_tagline text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS value_props jsonb,
  ADD COLUMN IF NOT EXISTS testimonials jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb;
