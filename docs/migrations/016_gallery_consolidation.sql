-- Phase C — consolidate to gallery_items only.
-- Apply: paste into Supabase SQL Editor, click Run.
-- After applying, restart the Next.js dev server so the type cache refreshes.

-- 1. Drop the legacy flat array column on businesses.
ALTER TABLE businesses
  DROP COLUMN IF EXISTS gallery_images;

-- 2. Replace the unique (business_id, section_key) constraint with a
--    non-unique index. Services and gallery now allow multiple rows per
--    (business, section_key); hero and story still effectively single
--    because the UI only writes one row to those keys.
ALTER TABLE gallery_items
  DROP CONSTRAINT IF EXISTS gallery_items_business_id_section_key_key;

DROP INDEX IF EXISTS gallery_items_business_id_section_key_key;
DROP INDEX IF EXISTS idx_gallery_items_business_section;

CREATE INDEX IF NOT EXISTS idx_gallery_items_business_section
  ON gallery_items(business_id, section_key);

-- 3. Constrain section_key to the four valid values.
ALTER TABLE gallery_items
  DROP CONSTRAINT IF EXISTS gallery_items_section_key_check;

ALTER TABLE gallery_items
  ADD CONSTRAINT gallery_items_section_key_check
  CHECK (section_key IN ('hero', 'story', 'services', 'gallery'));

-- Verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'businesses' AND column_name = 'gallery_images';
-- Expected: 0 rows.

-- SELECT conname FROM pg_constraint
--   WHERE conrelid = 'gallery_items'::regclass
--   AND contype = 'c';
-- Expected: includes gallery_items_section_key_check.
