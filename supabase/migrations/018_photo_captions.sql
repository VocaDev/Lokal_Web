-- Phase D — AI-generated art-direction captions for the hero/story photo slots.
-- Apply: paste into Supabase SQL Editor, click Run.
--
-- The wizard surfaces these captions in the Customization Hub so the owner
-- knows what kind of photo to upload for each slot.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS hero_photo_caption TEXT,
  ADD COLUMN IF NOT EXISTS story_photo_caption TEXT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'website_customization'
--   AND column_name IN ('hero_photo_caption', 'story_photo_caption');
-- Expected: 2 rows.
