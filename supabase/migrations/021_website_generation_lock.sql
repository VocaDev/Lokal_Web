-- Migration 021: one-time account-wide AI website generation lock
--
-- This is intentionally stricter than a daily counter. Each authenticated
-- account may claim exactly one AI website generation ever. The unique
-- user_id primary key makes parallel clicks race safely in Postgres: one wins,
-- every other attempt is rejected before an AI call can spend money.

DROP TABLE IF EXISTS website_generation_usage;

CREATE TABLE IF NOT EXISTS website_generation_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  generation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  theme_generated_at TIMESTAMPTZ
);

ALTER TABLE website_generation_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read own website generation lock" ON website_generation_locks;
CREATE POLICY "Owners can read own website generation lock"
  ON website_generation_locks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert own website generation lock" ON website_generation_locks;
CREATE POLICY "Owners can insert own website generation lock"
  ON website_generation_locks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update own website generation lock" ON website_generation_locks;
CREATE POLICY "Owners can update own website generation lock"
  ON website_generation_locks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
