// AI wizard end-to-end harness.
//
// Runs each fixture through the live deployed wizard, captures the preview
// pane and individual sections to disk, and moves on. No "Përdor këtë" press
// — capturing without applying keeps the test account's published site stable
// and avoids polluting production data.
//
// All selectors are text/role-based against the wizard's Albanian UI strings.
// If a label changes, patch this file — do NOT add testids to the wizard.

import { chromium, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FIXTURES, type WizardFixture } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

// Load .env.local so credentials placed there (Next.js convention) are
// picked up automatically when running via `npx tsx`. Existing process.env
// values win — explicit shell exports always override the file.
function loadEnvFile(filename: string): void {
  const envPath = path.join(REPO_ROOT, filename);
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const BASE_URL = process.env.LOKAL_TEST_URL || 'https://lokal-web-one.vercel.app';
const TEST_EMAIL = process.env.LOKAL_TEST_EMAIL;
const TEST_PASSWORD = process.env.LOKAL_TEST_PASSWORD;
const HEADLESS = process.argv.includes('--headless');

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('Set LOKAL_TEST_EMAIL and LOKAL_TEST_PASSWORD in .env.local or your shell.');
  process.exit(1);
}

const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUTPUT_ROOT = path.join(__dirname, 'output', RUN_TS);
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

// ---------------------------------------------------------------------------
// Fixture-value → wizard label maps. The wizard renders Albanian labels;
// these maps translate the structured fixture values into the strings the
// user sees and clicks.
// ---------------------------------------------------------------------------

const INDUSTRY_CHIP_LABEL: Record<NonNullable<WizardFixture['industryChip']>, string> = {
  barbershop: 'Berber',
  restaurant: 'Restorant',
  clinic: 'Klinikë',
  beauty_salon: 'Sallon Bukurie',
  gym: 'Palestër',
  other: 'Diçka tjetër',
};

const BOOKING_LABEL: Record<WizardFixture['bookingMethod'], string> = {
  appointments: 'Me termin',
  walkin: 'Pa termin',
  both: 'Të dyja',
  none: 'Nuk është e zbatueshme',
};

// Hero cards have an accessible name like "Kinematik Foto e plotë" because
// the button concatenates label + sub. We disambiguate via the unique sub
// regex (each sub is unique among the 4 hero options).
const HERO_CARD_SUB: Record<WizardFixture['hero'], RegExp> = {
  cinematic: /Foto e plotë/,
  split: /Foto \+ tekst/,
  centered: /Minimalist/,
  editorial: /Si revistë/,
};

const SECTION_PRIORITY_LABEL: Record<WizardFixture['sectionPriority'], string> = {
  services: 'Shërbimet',
  story: 'Historia',
  gallery: 'Galeria',
};

const DENSITY_LABEL: Record<WizardFixture['density'], string> = {
  sparse: 'Hapësirë e gjerë',
  dense: 'I dendur dhe i pasur',
};

// Mood cards collide on label "I guximshëm" with the font chip — same step.
// Disambiguate via the unique mood-card sub-text.
const MOOD_CARD_SUB: Record<WizardFixture['mood'], RegExp> = {
  warm: /Tradicionale, e tokës/,
  cool: /Modern, profesional/,
  bold: /Tërheqës, i fortë/,
  elegant: /Premium, i rafinuar/,
  custom: /Zgjidhi vetë/,
};

// Font chips have only their label as accessible name. Using exact match
// avoids matching mood cards (whose name includes the sub).
const FONT_LABEL: Record<WizardFixture['fontPersonality'], string> = {
  editorial: 'Editorial',
  modern: 'Modern dhe i mprehtë',
  friendly: 'I afërt dhe miqësor',
  bold: 'I guximshëm',
  elegant: 'Elegant tradicional',
};

const LANGUAGE_LABEL: Record<WizardFixture['language'], string> = {
  sq: 'Shqip',
  en: 'Anglisht',
};

const TONE_LABEL: Record<WizardFixture['tone'], string> = {
  friendly: 'Miqësor',
  professional: 'Profesional',
  bold: 'I guximshëm',
};

// ---------------------------------------------------------------------------

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input#email').fill(TEST_EMAIL!);
  await page.locator('input#password').fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  console.log('✓ Logged in');
}

async function startFreshWizard(page: Page): Promise<void> {
  // No "Regenerate Website" button on the dashboard — visiting the wizard
  // route directly re-mounts WizardV2 at step 1 with default input. That
  // IS the fresh-wizard entry point.
  await page.goto(`${BASE_URL}/dashboard/website-builder`);
  await page.getByText(/Hapi 1 nga 5/).waitFor({ timeout: 15000 });
}

async function fillWizard(page: Page, f: WizardFixture): Promise<void> {
  // ----- Step 1 -----
  await page.getByPlaceholder('p.sh., Berberi Albi').fill(f.businessName);

  if (f.industryChip) {
    await page.getByRole('button', { name: INDUSTRY_CHIP_LABEL[f.industryChip] }).click();
  }
  if (f.industryText) {
    await page.getByPlaceholder(/ose shkruaj/).fill(f.industryText);
  }

  await page.getByPlaceholder(/Prishtinë, Sunny Hill/).fill(f.city);
  await page.getByPlaceholder(/Pa takim/).fill(f.uniqueness);
  await page.getByRole('button', { name: 'Vazhdo →' }).click();

  // ----- Step 2 -----
  await page.getByText(/Hapi 2 nga 5/).waitFor({ timeout: 5000 });

  for (let i = 0; i < f.services.length; i++) {
    if (i >= 2) {
      await page.getByRole('button', { name: '+ Shto një shërbim tjetër' }).click();
    }
    await page.getByPlaceholder('Emri i shërbimit (p.sh. Qethje)').nth(i).fill(f.services[i].name);
    if (f.services[i].price) {
      await page.getByPlaceholder('Çmimi €').nth(i).fill(f.services[i].price!);
    }
    if (f.services[i].duration) {
      // Duration column is visible at md+ widths only. Harness viewport is
      // 1440px wide so it's always rendered.
      await page.getByPlaceholder('Kohëzgjatja (min)').nth(i).fill(f.services[i].duration!);
    }
  }

  await page.getByRole('button', { name: BOOKING_LABEL[f.bookingMethod] }).click();
  await page.getByRole('button', { name: 'Vazhdo →' }).click();

  // ----- Step 3 -----
  await page.getByText(/Hapi 3 nga 5/).waitFor({ timeout: 5000 });

  await page.getByRole('button', { name: HERO_CARD_SUB[f.hero] }).click();
  await page.getByRole('button', { name: SECTION_PRIORITY_LABEL[f.sectionPriority], exact: true }).click();
  await page.getByRole('button', { name: DENSITY_LABEL[f.density], exact: true }).click();
  await page.getByRole('button', { name: 'Vazhdo →' }).click();

  // ----- Step 4 -----
  await page.getByText(/Hapi 4 nga 5/).waitFor({ timeout: 5000 });

  await page.getByRole('button', { name: MOOD_CARD_SUB[f.mood] }).click();
  await page.getByRole('button', { name: FONT_LABEL[f.fontPersonality], exact: true }).click();
  await page.getByRole('button', { name: 'Vazhdo →' }).click();

  // ----- Step 5 -----
  await page.getByText(/Hapi 5 nga 5/).waitFor({ timeout: 5000 });

  await page.getByRole('button', { name: LANGUAGE_LABEL[f.language], exact: true }).click();
  await page.getByRole('button', { name: TONE_LABEL[f.tone], exact: true }).click();
  await page.getByRole('button', { name: 'Gjenero faqen ✨' }).click();

  // ----- Generation → Preview (can take 60–90s) -----
  await page.getByText('Faqja jote është gati').waitFor({ timeout: 120000 });
}

async function captureSections(page: Page, fixture: WizardFixture): Promise<void> {
  const dir = path.join(OUTPUT_ROOT, fixture.name);
  fs.mkdirSync(dir, { recursive: true });

  // Settle: wait for any final paint inside the preview before screenshotting.
  await page.waitForTimeout(800);

  // Whole wizard preview screen — buttons + framed preview pane.
  await page.screenshot({ path: path.join(dir, '00-full-page.png'), fullPage: true });

  // Element screenshots of each rendered section. The preview wrapper is the
  // only `.overflow-y-auto` div on this screen (added by the preview-pane
  // fix). Screenshotting an element captures its full visual regardless of
  // whether it's currently scrolled into view of its parent.
  const previewRoot = page.locator('div.overflow-y-auto').last();
  const sections = previewRoot.locator('section, footer');
  const count = await sections.count();

  for (let i = 0; i < count; i++) {
    const section = sections.nth(i);
    try {
      await section.scrollIntoViewIfNeeded({ timeout: 2000 });
    } catch {
      // Some sections may not need scrolling; ignore.
    }
    const filename = `${String(i + 1).padStart(2, '0')}-section.png`;
    await section.screenshot({ path: path.join(dir, filename) });
  }

  fs.writeFileSync(path.join(dir, 'inputs.json'), JSON.stringify(fixture, null, 2));

  console.log(`  ✓ ${fixture.name} — ${count} section(s) captured`);
}

async function main(): Promise<void> {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_ROOT}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log('');

  const browser: Browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let succeeded = 0;
  let failed = 0;

  try {
    await login(page);

    for (const fixture of FIXTURES) {
      console.log(`\n→ ${fixture.name}`);
      try {
        await startFreshWizard(page);
        await fillWizard(page, fixture);
        await captureSections(page, fixture);
        succeeded++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ Failed: ${message}`);
        const dir = path.join(OUTPUT_ROOT, fixture.name);
        fs.mkdirSync(dir, { recursive: true });
        try {
          await page.screenshot({ path: path.join(dir, 'ERROR.png'), fullPage: true });
        } catch {
          // Page may be in a state where screenshot fails — ignore.
        }
        fs.writeFileSync(path.join(dir, 'error.txt'), message);
      }
    }

    console.log('');
    console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
    console.log(`Results: ${OUTPUT_ROOT}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
