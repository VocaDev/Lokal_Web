-- Migration 008: bookings party_size column + slot uniqueness constraint
--
-- Phase 4.1 + Phase 4.4.
-- Apply manually in Supabase SQL Editor. Idempotent.
--
-- Two changes:
--
-- 1) Add `party_size INTEGER NULL` to bookings. Restaurant reservations capture
--    party size in RestaurantBookingDrawer state today but never persist it
--    (audit finding). NULL for non-restaurant rows.
--
-- 2) Partial UNIQUE index on (business_id, appointment_at) restricted to
--    active statuses. Closes the booking race: simultaneous inserts now fail
--    fast with Postgres error 23505 (unique_violation), which BookingDrawer/
--    RestaurantBookingDrawer must catch and surface as "slot just taken."
--    Cancelled or completed slots can be re-booked at the same time.
--
-- Rollback:
--   DROP INDEX IF EXISTS bookings_business_slot_unique;
--   ALTER TABLE bookings DROP COLUMN IF EXISTS party_size;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS party_size INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_business_slot_unique
  ON bookings (business_id, appointment_at)
  WHERE status IN ('pending', 'confirmed');

-- Verification:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'bookings' AND indexname = 'bookings_business_slot_unique';
-- Expected: 1 row.
