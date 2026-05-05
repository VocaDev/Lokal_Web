-- Phase E — Opt-in booking. Businesses can toggle booking on/off.
-- Apply: paste into Supabase SQL Editor, click Run.
--
-- The flag gates: wizard Step 2's booking-method question, sidebar's
-- Bookings menu item, public-site BookingDrawer mounting, and the hero
-- CTA's open-drawer vs open-WhatsApp dispatch. Existing rows default to
-- true so already-launched sites keep working.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN NOT NULL DEFAULT true;

-- Verification:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'businesses' AND column_name = 'booking_enabled';
-- Expected: 1 row, boolean, default true.
