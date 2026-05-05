-- Phase D — real-time progress events for the AI wizard.
-- Apply: paste into Supabase SQL Editor, click Run.
--
-- AFTER applying:
--   1. Studio → Database → Replication → toggle 'ai_generation_events' ON.
--      (This adds the table to the supabase_realtime publication so the
--      wizard's Realtime subscription receives INSERT events.)
--
-- Verification:
--   SELECT relname FROM pg_class WHERE relname = 'ai_generation_events';
--   SELECT polname FROM pg_policy WHERE polrelid = 'ai_generation_events'::regclass;
--   -- Expected: 'Users see own events' + 'Service role inserts events'.
--
--   SELECT pubname FROM pg_publication_tables WHERE tablename = 'ai_generation_events';
--   -- Expected: 'supabase_realtime'  (after Studio toggle).

CREATE TABLE IF NOT EXISTS ai_generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  generation_id TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'progress', 'completed', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_events_user_generation
  ON ai_generation_events(user_id, generation_id, created_at);

ALTER TABLE ai_generation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON ai_generation_events;
CREATE POLICY "Users see own events"
  ON ai_generation_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role inserts events" ON ai_generation_events;
CREATE POLICY "Service role inserts events"
  ON ai_generation_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-cleanup: delete events older than 1 hour (manual job; can be cron'd later).
-- Run on demand:
--   DELETE FROM ai_generation_events WHERE created_at < now() - interval '1 hour';
