-- ============================================================================
--  LokalWeb — apply all pending migrations
-- ============================================================================
--  How to use:
--    1. Open Supabase Studio → SQL Editor
--    2. Paste BLOCK A in full, click Run.
--    3. After demo verification (day or two later), paste BLOCK B, click Run.
--
--  Both blocks are idempotent (safe to re-run if a partial paste happens).
--  Source files (kept for reference/version control):
--    007_business_metadata_columns.sql
--    008_bookings_party_size_and_uniqueness.sql
--    009_industry_normalization_completion.sql
--    010_ai_usage_rate_limit.sql
--    011_rls_tightening.sql
--    013_drop_custom_website_html.sql
-- ============================================================================



-- ============================================================================
--  BLOCK A — APPLY NOW (required for the new app code to work)
-- ============================================================================



-- ────────────────────────────────────────────────────────────────────────────
-- 007: businesses metadata columns (tagline, founded_year, timezone)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Belgrade';

UPDATE businesses
SET timezone = 'Europe/Belgrade'
WHERE timezone IS NULL;



-- ────────────────────────────────────────────────────────────────────────────
-- 008: bookings.party_size column + slot uniqueness index
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS party_size INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_business_slot_unique
  ON bookings (business_id, appointment_at)
  WHERE status IN ('pending', 'confirmed');



-- ────────────────────────────────────────────────────────────────────────────
-- 009: finish industry normalization + canonical CHECK constraint
-- ────────────────────────────────────────────────────────────────────────────

UPDATE businesses
SET industry = 'beauty_salon'
WHERE industry IN ('beauty-salon', 'salon');

UPDATE businesses
SET industry = 'other'
WHERE industry IS NULL OR industry IN ('general', 'custom');

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS industry_canonical;

ALTER TABLE businesses
  ADD CONSTRAINT industry_canonical
  CHECK (industry IN (
    'barbershop', 'restaurant', 'clinic', 'beauty_salon', 'gym', 'other'
  ));



-- ────────────────────────────────────────────────────────────────────────────
-- 010: ai_usage rate-limit table (backs /api/brand-brief + /api/generate-variants)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their AI usage" ON ai_usage;
CREATE POLICY "Owners can read their AI usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert their AI usage" ON ai_usage;
CREATE POLICY "Owners can insert their AI usage"
  ON ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their AI usage" ON ai_usage;
CREATE POLICY "Owners can update their AI usage"
  ON ai_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



-- ────────────────────────────────────────────────────────────────────────────
-- 011: tighten bookings/customization/gallery RLS + create get_booked_slots RPC
-- ────────────────────────────────────────────────────────────────────────────

-- 11.1 bookings.SELECT — owner-scoped only
DROP POLICY IF EXISTS "Anyone can view bookings"        ON bookings;
DROP POLICY IF EXISTS "Owners can view their bookings"  ON bookings;
CREATE POLICY "Owners can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  );

-- 11.2 bookings.INSERT — public but validated
DROP POLICY IF EXISTS "Anyone can create bookings"        ON bookings;
DROP POLICY IF EXISTS "Public can create future bookings" ON bookings;
CREATE POLICY "Public can create future bookings"
  ON bookings FOR INSERT
  TO PUBLIC
  WITH CHECK (
    appointment_at > now()
    AND business_id IN (SELECT id FROM businesses)
  );

-- 11.3 get_booked_slots RPC — public-safe slot lookup (no PII over the wire)
CREATE OR REPLACE FUNCTION get_booked_slots(p_business_id UUID, p_day DATE)
RETURNS TABLE (
  appointment_at TIMESTAMPTZ,
  duration_minutes INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.appointment_at,
    COALESCE(s.duration_minutes, 60) AS duration_minutes
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  WHERE b.business_id = p_business_id
    AND b.status IN ('pending', 'confirmed')
    AND b.appointment_at >= p_day::timestamptz
    AND b.appointment_at <  (p_day + INTERVAL '1 day')::timestamptz;
$$;

REVOKE ALL ON FUNCTION get_booked_slots(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_booked_slots(UUID, DATE) TO anon, authenticated;

-- 11.4 website_customization RLS
ALTER TABLE website_customization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view customization"   ON website_customization;
CREATE POLICY "Anyone can view customization"
  ON website_customization FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "Owners can manage customization" ON website_customization;
CREATE POLICY "Owners can manage customization"
  ON website_customization FOR ALL
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  );

-- 11.5 gallery_items RLS
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gallery"   ON gallery_items;
CREATE POLICY "Anyone can view gallery"
  ON gallery_items FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "Owners can manage gallery" ON gallery_items;
CREATE POLICY "Owners can manage gallery"
  ON gallery_items FOR ALL
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  );



-- ============================================================================
--  Verification queries (optional — run after BLOCK A to confirm)
-- ============================================================================
--
--  All five should return at least one row matching the expectations:
--
--  -- 007 columns exist:
--  SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'businesses'
--     AND column_name IN ('tagline','founded_year','timezone');
--
--  -- 008 index exists:
--  SELECT indexname FROM pg_indexes
--   WHERE indexname = 'bookings_business_slot_unique';
--
--  -- 009 constraint exists + canonical industries only:
--  SELECT conname FROM pg_constraint WHERE conname = 'industry_canonical';
--  SELECT DISTINCT industry FROM businesses;
--
--  -- 010 table exists with RLS on:
--  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'ai_usage';
--
--  -- 011 RPC exists and is SECURITY DEFINER:
--  SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_booked_slots';





-- ============================================================================
--  BLOCK B — APPLY ONLY AFTER DEMO (cleanup, optional)
-- ============================================================================
--
--  This drops the dead `custom_website_html` column. The application code no
--  longer reads or writes it, so dropping is safe — but ONLY if no other
--  client (a Lovable export, a previous prototype, an analytics job) is still
--  reading from it.
--
--  Pre-flight (run this BEFORE the ALTER, expect 0):
--    SELECT count(*) FROM businesses WHERE custom_website_html IS NOT NULL;
--
--  If the count is > 0, STOP — investigate before running the ALTER. If 0,
--  proceed.
-- ────────────────────────────────────────────────────────────────────────────

-- ALTER TABLE businesses DROP COLUMN IF EXISTS custom_website_html;
--
-- ↑ Uncomment the line above when you're ready to apply BLOCK B. It's
-- commented by default so that if you accidentally select-all and run, the
-- column doesn't get dropped before you've verified the pre-flight query.
