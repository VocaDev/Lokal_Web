-- Migration 006: Normalize legacy industry values to the canonical set.
--
-- Canonical set: barbershop | restaurant | clinic | beauty_salon | gym | other
--
-- Apply manually in Supabase SQL Editor. Safe to re-run (UPDATEs are idempotent given
-- the canonical values); the optional CHECK constraint is commented out by default
-- so existing apps keep working while we verify.

UPDATE businesses
SET industry = 'other'
WHERE industry IN ('general', 'custom') OR industry IS NULL;

UPDATE businesses
SET industry = 'beauty_salon'
WHERE industry IN ('beauty-salon', 'salon');

-- Optional: enforce canonical values going forward. Uncomment once you've confirmed
-- all rows are normalized (no `general`, `custom`, `beauty-salon`, NULL remaining).
-- ALTER TABLE businesses
--   ADD CONSTRAINT industry_canonical
--   CHECK (industry IN ('barbershop', 'restaurant', 'clinic', 'beauty_salon', 'gym', 'other'));
