# Wizard Testing Harness

Automated end-to-end testing of the AI wizard. Runs each fixture through the
full wizard flow and saves screenshots for visual comparison.

## What this is and isn't

- **Is:** Local developer tool for testing the wizard end-to-end against the
  live deployed site. Not part of the build, not deployed, not in CI.
- **Is NOT:** Production code, a regression assertion, or a pass/fail metric.
  Output is for human review only.

## Setup

1. Set env vars (use a real test account, not your personal one):
   ```
   export LOKAL_TEST_EMAIL=your-test-account@example.com
   export LOKAL_TEST_PASSWORD=your-password
   ```

2. (Optional) Override the target URL:
   ```
   export LOKAL_TEST_URL=https://lokal-web-one.vercel.app
   ```

3. The Chromium binary was fetched at install time via
   `npx playwright install chromium`. If you ever wipe `~/.cache/ms-playwright`,
   re-run that command.

## Run

```
npm run test:wizard
```

Visible browser by default — you watch it drive the wizard. For headless:

```
npx tsx tests/wizard-harness/run.ts --headless
```

## Output

Screenshots land in `tests/wizard-harness/output/<timestamp>/<fixture-name>/`:

- `00-full-page.png` — the entire wizard preview screen (buttons + framed
  preview pane)
- `01-section.png`, `02-section.png`, ... — element screenshots of each
  `<section>`/`<footer>` rendered inside the preview
- `inputs.json` — the fixture's structured inputs, for reference when
  reviewing screenshots side-by-side
- `ERROR.png` + `error.txt` — only present if the run failed for that fixture

The output folder is gitignored.

## What the harness does

1. Logs in with the env-var credentials.
2. For each fixture in `fixtures.ts`:
   - Navigates to `/dashboard/website-builder` (which re-mounts the wizard
     fresh — there is no separate "Regenerate Website" button).
   - Fills steps 1–5 using the fixture's structured inputs.
   - Clicks **"Gjenero faqen ✨"** and waits up to 120s for the preview.
   - Captures screenshots of the preview pane.
   - Does **NOT** press **"Përdor këtë"** — apply would overwrite the test
     account's published site, polluting the next fixture and prod data.
3. Closes the browser.

## Adding fixtures

Edit `fixtures.ts` and append to the `FIXTURES` array. Re-run.

`hero` is restricted to the four layouts the wizard's Step 3 actually exposes
(`cinematic | split | centered | editorial`). The AI may emit `asymmetric` or
`fullbleed` layouts internally, but a real user can never pick those — testing
them via this harness would not reflect actual usage.

## Selectors

The harness uses Albanian text and ARIA roles (`getByRole`, `getByPlaceholder`,
`getByText`) — there are no `data-testid`s on the wizard. If a UI label
changes, patch `run.ts` — do not add testids to the wizard.

## Hard rules

- Live site only. Localhost won't have a working AI generation pipeline.
- No credentials in code, env vars only.
- No CI workflow. Local tool.
- No assertions on screenshot content. Output is for human eyes.
