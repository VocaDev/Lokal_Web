# scripts/

Ad-hoc internal infra. Not bundled or imported by production code.

## ab-test.ts — wizard A/B test harness

Calls `runBrandBrief` and `generateTheme` directly (bypassing Next, Supabase, and auth) to capture raw model output for grading. Run with `npx tsx --env-file=.env scripts/ab-test.ts [fixtureName]` — fixtures are hardcoded inside (`clinic-friendly` default, `lavazh-casual`). Outputs JSON to `scripts/output-{fixture}-*.json`. Override the theme model on the fly via the `THEME_GENERATION_MODEL` env var, or compare both Haiku and Sonnet on the same fixture in one run.
