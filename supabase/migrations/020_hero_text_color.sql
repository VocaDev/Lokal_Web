-- Phase E — owner-controllable hero text color.
-- Apply: paste into Supabase SQL Editor, click Run.
--
-- Hero headline + subheadline color in the parametric renderer was previously
-- forced (white over a hero photo, theme text_color otherwise). This column
-- lets the owner override that from the Customization Hub when neither default
-- reads well on their chosen background image. NULL = keep the existing
-- automatic behavior.

ALTER TABLE website_customization
  ADD COLUMN IF NOT EXISTS hero_text_color TEXT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'website_customization' AND column_name = 'hero_text_color';
-- Expected: 1 row.
