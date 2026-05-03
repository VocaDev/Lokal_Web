/**
 * A/B test harness — runs brand-brief (Haiku) once, then generate-variants
 * twice on the same brief: once with Haiku, once with Sonnet. Bypasses Next +
 * Supabase + auth — calls runBrandBrief / generateTheme directly.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/ab-test.ts [fixtureName]
 *
 * Available fixtures:
 *   clinic-friendly  — Pejë family clinic, friendly tone, besim-qartesi archetype
 *   lavazh-casual    — Tavnik car wash, casual (Bisedor) tone, i-ngrohte archetype
 *
 * Default fixture: clinic-friendly.
 *
 * Outputs (per fixture):
 *   scripts/output-{fixture}-brief.json
 *   scripts/output-{fixture}-theme-haiku.json
 *   scripts/output-{fixture}-theme-sonnet.json
 *
 * Cost ballpark: ~$0.04-0.08 per fixture (Haiku is cheap; Sonnet is the spend).
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBrandBrief } from '../app/api/brand-brief/route';
import { generateTheme, type GenerateThemeArgs } from '../app/api/generate-variants/route';

type Fixture = {
  businessName: string;
  industry: string;
  industryChip: string;
  city: string;
  uniqueness: string;
  businessDescription: string;
  services: Array<{ name: string; price: string; durationMinutes: number }>;
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  language: string;
  tone: string;
  archetype: string;
  canonicalIndustry: string;
};

const FIXTURES: Record<string, Fixture> = {
  // Pejë family clinic — friendly tone, mature vertical with industry vocabulary.
  // Used to grade the system overall, not the recent casual/lavazh fix.
  'clinic-friendly': {
    businessName: 'Klinika Familjare Pejë',
    industry: 'Klinikë',
    industryChip: 'clinic',
    city: 'Pejë, Kosharja',
    uniqueness:
      "Pritja mesatare 8 minuta. Mjekët tanë trajnohen në Vjenë çdo dy vjet. Familja juaj është familja jonë.",
    businessDescription:
      "Klinikë familjare në Pejë që ofron konsulta të përgjithshme, specialistë dhe analiza. Mjekë me trajnim ndërkombëtar, pritje të shkurtra, komunikim i qartë me familjen — pa stresin e radhës publike.",
    services: [
      { name: 'Konsultë e përgjithshme', price: '30', durationMinutes: 20 },
      { name: 'Specialist', price: '60', durationMinutes: 30 },
      { name: 'Analizë gjaku', price: '25', durationMinutes: 15 },
    ],
    bookingMethod: 'appointments',
    language: 'sq',
    tone: 'friendly',
    archetype: 'besim-qartesi',
    canonicalIndustry: 'clinic',
  },
  // Tavnik car wash — Bisedor (casual) tone + auto vertical (recently added).
  // This is the actual umib failure mode the user flagged. Mirrors the umib
  // shape: static lavazh, walk-in, road-Gheg expected.
  'lavazh-casual': {
    businessName: 'Lavazhi Tavnik',
    industry: 'Lavazh',
    industryChip: 'other',
    city: 'Mitrovicë, Tavnik',
    uniqueness:
      "Lajm me dorë, jo me makineri. Tre veta në smenë. Klientët kthehen sepse e dinë sa kushton — pa surpriza.",
    businessDescription:
      "Lavazh i vogël në Tavnik që lan makina me dorë. Larje jashtme, larje mrena, paketa komplet, pastrim i thellë me aspirator. Pa termin — hajde e prit me kafe.",
    services: [
      { name: 'Larje Jashtme', price: '5', durationMinutes: 30 },
      { name: 'Larje Mrena', price: '8', durationMinutes: 45 },
      { name: 'Larje Mrena-Jasht', price: '12', durationMinutes: 60 },
      { name: 'Pastrim i Thellë', price: '20', durationMinutes: 90 },
    ],
    bookingMethod: 'walkin',
    language: 'sq',
    tone: 'casual',
    archetype: 'i-ngrohte',
    canonicalIndustry: 'other',
  },
};

const FIXTURE_NAME = process.argv[2] || 'clinic-friendly';
const FIXTURE = FIXTURES[FIXTURE_NAME];
if (!FIXTURE) {
  console.error(`Unknown fixture: "${FIXTURE_NAME}". Available: ${Object.keys(FIXTURES).join(', ')}`);
  process.exit(1);
}
console.log(`[fixture] ${FIXTURE_NAME} — ${FIXTURE.businessName} / tone=${FIXTURE.tone} / archetype=${FIXTURE.archetype}\n`);

const LAYOUTS = {
  heroLayout: 'ai',
  storyLayout: 'ai',
  servicesLayout: 'ai',
  galleryLayout: 'ai',
};

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));

function writeOutput(filename: string, content: unknown) {
  const outPath = path.join(SCRIPTS_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(content, null, 2));
  console.log(`\n[written] ${outPath}\n`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing — make sure to run with --env-file=.env');
    process.exit(1);
  }

  // ---------- Phase 1: brand-brief (Haiku) ----------
  console.log('═══════════════════════════════════════════');
  console.log('  Phase 1 — brand-brief (claude-haiku-4-5)');
  console.log('═══════════════════════════════════════════\n');
  const phase1Start = Date.now();
  const brief = await runBrandBrief({
    businessName: FIXTURE.businessName,
    industry: FIXTURE.industry,
    industryChip: FIXTURE.industryChip,
    city: FIXTURE.city,
    uniqueness: FIXTURE.uniqueness,
    businessDescription: FIXTURE.businessDescription,
    services: FIXTURE.services,
    bookingMethod: FIXTURE.bookingMethod,
    language: FIXTURE.language,
    tone: FIXTURE.tone,
  });
  const phase1Ms = Date.now() - phase1Start;
  console.log(JSON.stringify(brief, null, 2));
  console.log(`\n[timing] brand-brief: ${phase1Ms}ms`);
  writeOutput(`output-${FIXTURE_NAME}-brief.json`, brief);

  // ---------- Phase 2: theme generation, two models ----------
  // Same brief + same wizard inputs across both runs. Only the model differs.
  const userProvidedServicesString = FIXTURE.services
    .filter((s) => s.name)
    .map((s) => {
      const parts = [s.name];
      if (s.price) parts.push(`€${s.price}`);
      if (s.durationMinutes !== undefined) parts.push(`${s.durationMinutes}min`);
      return parts.join(' / ');
    })
    .join('\n');

  const themeArgsBase: Omit<GenerateThemeArgs, 'modelOverride'> = {
    brief,
    businessName: FIXTURE.businessName,
    industry: FIXTURE.industry,
    city: FIXTURE.city,
    uniqueness: FIXTURE.uniqueness,
    businessDescription: FIXTURE.businessDescription,
    ...LAYOUTS,
    archetypeKey: FIXTURE.archetype as any,
    bookingMethod: FIXTURE.bookingMethod,
    language: FIXTURE.language,
    tone: FIXTURE.tone,
    userProvidedServices: userProvidedServicesString,
    canonicalIndustry: FIXTURE.canonicalIndustry,
    userHasGalleryPhotos: false,
    userHasServicePhotos: false,
  };

  // Phase 2a — Haiku
  console.log('\n═══════════════════════════════════════════');
  console.log('  Phase 2a — theme (claude-haiku-4-5)');
  console.log('═══════════════════════════════════════════\n');
  const phase2aStart = Date.now();
  const haikuTheme = await generateTheme({
    ...themeArgsBase,
    modelOverride: 'claude-haiku-4-5',
  });
  const phase2aMs = Date.now() - phase2aStart;
  console.log(JSON.stringify(haikuTheme, null, 2));
  console.log(`\n[timing] theme (Haiku): ${phase2aMs}ms`);
  writeOutput(`output-${FIXTURE_NAME}-theme-haiku.json`, haikuTheme);

  // Phase 2b — Sonnet
  console.log('\n═══════════════════════════════════════════');
  console.log('  Phase 2b — theme (claude-sonnet-4-6)');
  console.log('═══════════════════════════════════════════\n');
  const phase2bStart = Date.now();
  const sonnetTheme = await generateTheme({
    ...themeArgsBase,
    modelOverride: 'claude-sonnet-4-6',
  });
  const phase2bMs = Date.now() - phase2bStart;
  console.log(JSON.stringify(sonnetTheme, null, 2));
  console.log(`\n[timing] theme (Sonnet): ${phase2bMs}ms`);
  writeOutput(`output-${FIXTURE_NAME}-theme-sonnet.json`, sonnetTheme);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  All three captures complete (fixture: ${FIXTURE_NAME})`);
  console.log('═══════════════════════════════════════════');
  console.log(`  Files: scripts/output-${FIXTURE_NAME}-brief.json`);
  console.log(`         scripts/output-${FIXTURE_NAME}-theme-haiku.json`);
  console.log(`         scripts/output-${FIXTURE_NAME}-theme-sonnet.json`);
}

main().catch((e) => {
  console.error('\n[FAILED]', e);
  process.exit(1);
});
