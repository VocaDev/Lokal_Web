-- Migration 009: Finish industry normalization (beauty-salon → beauty_salon)
--
-- Phase 4.6.
-- Apply manually in Supabase SQL Editor. Safe to re-run.
--
-- Migration 006 already mapped 'general' / 'custom' / NULL → 'other' and
-- 'beauty-salon' / 'salon' → 'beauty_salon'. This migration:
--
--   1) Re-runs the hyphen → underscore mapping in case any rows escaped 006.
--   2) Optionally enables the canonical-set CHECK constraint that 006 left
--      commented out. The CHECK is gated behind a verification query so the
--      DBA confirms no offending rows before enforcement.
--
-- Rollback:
--   ALTER TABLE businesses DROP CONSTRAINT IF EXISTS industry_canonical;

UPDATE businesses
SET industry = 'beauty_salon'
WHERE industry IN ('beauty-salon', 'salon');

UPDATE businesses
SET industry = 'other'
WHERE industry IS NULL OR industry IN ('general', 'custom');

-- Verification before adding the CHECK:
--   SELECT DISTINCT industry FROM businesses;
-- Expected canonical set:
--   barbershop, restaurant, clinic, beauty_salon, gym, other
-- If any other value appears, fix it first, THEN run the ALTER below.

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS industry_canonical;

ALTER TABLE businesses
  ADD CONSTRAINT industry_canonical
  CHECK (industry IN (
    'barbershop', 'restaurant', 'clinic', 'beauty_salon', 'gym', 'other'
  ));

-- Verification after:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname = 'industry_canonical';
-- Expected: 1 row, CHECK clause matching the values above.
