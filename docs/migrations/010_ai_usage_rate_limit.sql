-- Migration 010: AI usage rate-limit table
--
-- Phase 4.2b.
-- Apply manually in Supabase SQL Editor. Idempotent.
--
-- Backs the per-user daily rate limit on /api/brand-brief and
-- /api/generate-variants. Each call does:
--
--   INSERT INTO ai_usage (user_id, date, count) VALUES ($1, CURRENT_DATE, 1)
--   ON CONFLICT (user_id, date)
--   DO UPDATE SET count = ai_usage.count + 1
--   RETURNING count;
--
-- Rejects with 429 when count > AI_DAILY_LIMIT (default 10).
--
-- Rollback:
--   DROP TABLE IF EXISTS ai_usage;

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

-- Verification:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'ai_usage';
-- Expected: 1 row, relrowsecurity = true.
