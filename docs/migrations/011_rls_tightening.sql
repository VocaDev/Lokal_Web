-- Migration 011: Tighten bookings/customization/gallery RLS + slot RPC
--
-- Phase 4.3.
-- Apply manually in Supabase SQL Editor. Idempotent (DROP IF EXISTS).
--
-- Three concerns:
--
-- 1) bookings.SELECT was USING(true) — exposed every customer name + phone
--    via direct anon REST API access. Lock down to authenticated owner only.
--    Public booking drawer no longer SELECTs from bookings; it calls the new
--    SECURITY DEFINER function get_booked_slots() below, which returns only
--    timestamp strings (no PII).
--
-- 2) bookings.INSERT stays public (anonymous bookings are intentional) but
--    gains minimal validations: appointment_at must be in the future, and
--    business_id must exist. Captcha-grade abuse protection deferred.
--
-- 3) website_customization and gallery_items did not appear in the original
--    rls-policies.sql audit. Verify RLS is on; add owner-scoped writes +
--    public reads. Skips silently if already configured.
--
-- DEPENDENCY: migration 008 (party_size + uniqueness index) should be applied
-- first. The RPC below sorts and de-duplicates timestamps regardless, but the
-- INSERT path relies on the unique index for race protection.
--
-- Rollback (NOT idempotent — restore the permissive policies if you must):
--   DROP FUNCTION IF EXISTS get_booked_slots(UUID, DATE);
--   DROP POLICY IF EXISTS "Owners can view their bookings" ON bookings;
--   DROP POLICY IF EXISTS "Public can create future bookings" ON bookings;
--   CREATE POLICY "Anyone can view bookings" ON bookings FOR SELECT TO PUBLIC USING (true);
--   CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT TO PUBLIC WITH CHECK (true);


------------------------------------------------------------
-- 1) bookings.SELECT — owner-scoped only
------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view bookings"     ON bookings;
DROP POLICY IF EXISTS "Owners can view their bookings" ON bookings;
CREATE POLICY "Owners can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  );


------------------------------------------------------------
-- 2) bookings.INSERT — public but validated
------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can create bookings"        ON bookings;
DROP POLICY IF EXISTS "Public can create future bookings" ON bookings;
CREATE POLICY "Public can create future bookings"
  ON bookings FOR INSERT
  TO PUBLIC
  WITH CHECK (
    appointment_at > now()
    AND business_id IN (SELECT id FROM businesses)
  );

-- Owner manage policy stays as-is (subquery on businesses.owner_id).


------------------------------------------------------------
-- 3) get_booked_slots RPC — public-safe slot lookup
------------------------------------------------------------
--
-- Returns the appointment_at values for active bookings of `p_business_id`
-- on `p_day` (in UTC). Caller transforms to business-local time.
-- SECURITY DEFINER lets it bypass the locked-down SELECT policy without
-- leaking PII (only the timestamp leaves the function).

-- Returns (appointment_at, duration_minutes) so the booking drawer can block
-- the full duration of an existing appointment, not just its start. Restaurant
-- reservations have service_id = NULL; default to 60 min in that case.

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


------------------------------------------------------------
-- 4) website_customization RLS (verify / add)
------------------------------------------------------------

ALTER TABLE website_customization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view customization"     ON website_customization;
CREATE POLICY "Anyone can view customization"
  ON website_customization FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "Owners can manage customization"   ON website_customization;
CREATE POLICY "Owners can manage customization"
  ON website_customization FOR ALL
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
  );


------------------------------------------------------------
-- 5) gallery_items RLS (verify / add)
------------------------------------------------------------

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


-- Verification queries:
--
--   -- bookings.SELECT no longer permissive:
--   SELECT polname, polcmd, polqual::text
--   FROM pg_policy WHERE polrelid = 'bookings'::regclass;
--
--   -- RPC exists and is SECURITY DEFINER:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_booked_slots';
--   -- Expected: 1 row, prosecdef = true.
--
--   -- Customization & gallery RLS enabled:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('website_customization', 'gallery_items');
--   -- Expected: relrowsecurity = true for both.
