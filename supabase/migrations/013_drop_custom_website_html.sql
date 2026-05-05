-- Migration 013: Drop dead `custom_website_html` column
--
-- Phase 4.6.
-- Apply manually in Supabase SQL Editor — LAST, after all other migrations
-- have been applied AND the demo has been verified end-to-end. Idempotent.
--
-- Rationale (verified during plan-mode exploration):
--
--   * No code path renders this column — the early-return branch in
--     app/[subdomain]/page.tsx that the original audit claimed exists DOES
--     NOT exist. The page always uses <TemplateRouter/>.
--   * /api/apply-theme always writes `custom_website_html: null`.
--   * The column is read into Business.customWebsiteHtml in store.ts and the
--     SSR page, but the field is never consumed by any template or component.
--
-- Pre-flight check (run this FIRST):
--   SELECT count(*) FROM businesses WHERE custom_website_html IS NOT NULL;
-- Expected: 0. If not, do NOT apply this migration without investigating —
-- some unknown client may depend on it.
--
-- Rollback:
--   ALTER TABLE businesses ADD COLUMN custom_website_html TEXT;
--   (Old data is lost; restore from backup if needed.)

ALTER TABLE businesses
  DROP COLUMN IF EXISTS custom_website_html;

-- Verification:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'businesses' AND column_name = 'custom_website_html';
-- Expected: 0 rows.
