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
import { runBrandBrief } from '../src/lib/ai/brand-brief';
import { generateTheme, type GenerateThemeArgs } from '../src/lib/ai/theme';

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
  // Pejë family clinic — friendly tone, mature vertical.
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
  // Tavnik car wash — Bisedor (casual) tone + auto vertical (umib failure mode).
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
  // ─── Mirror of tests/wizard-harness/fixtures.ts (6 fixtures) ───
  'barbershop-traditional': {
    businessName: 'Berberi Tradicional',
    industry: 'Berber',
    industryChip: 'barbershop',
    city: 'Prizren, Shadërvan',
    uniqueness: 'Tre karrige. Dyzet vjet. Prerja e babait tim është e njëjta sot si në vitin 1985.',
    businessDescription: 'Berber tradicional që ofron qethje, brisk dhe paketa të plota për burra në Shadërvan, Prizren — i njëjti zanat prej dyzet vjetësh.',
    services: [
      { name: 'Qethje klasike', price: '8', durationMinutes: 30 },
      { name: 'Brisk i nxehtë', price: '12', durationMinutes: 40 },
      { name: 'Paketa e plotë', price: '18', durationMinutes: 60 },
    ],
    bookingMethod: 'appointments',
    language: 'sq',
    tone: 'friendly',
    archetype: 'i-ngrohte',
    canonicalIndustry: 'barbershop',
  },
  'coding-academy': {
    businessName: 'Akademi Mësimi',
    industry: 'Akademi mësimi',
    industryChip: 'other',
    city: 'Prishtinë, Qyteti i Ri',
    uniqueness: 'Grupe të vogla. Mësues që përgjigjen te WhatsApp pas orarit. Të gjithë studentët dalin me një projekt që mund ta tregojnë.',
    businessDescription: 'Mësoj programim dhe gjuhë të huaja për të rinj dhe profesionistë — kurse në grupe të vogla, niveli fillestar deri i avancuar, online dhe në klasë.',
    services: [],
    bookingMethod: 'appointments',
    language: 'sq',
    tone: 'professional',
    archetype: 'ai',
    canonicalIndustry: 'education',
  },
  'gym-bold': {
    businessName: 'Palestër Bold',
    industry: 'Palestër',
    industryChip: 'gym',
    city: 'Pejë, Qendër',
    uniqueness: 'Maksimumi 8 njerëz në një orë. Çdo seancë ka trajner. Pa pasqyra dramatike.',
    businessDescription: 'Palestër me kapacitet të kufizuar dhe trajnim personal — funksional, fuqi, kondicion. Pa muzikë dramatike, pa pasqyra; vetëm hekur dhe trajnerë që të shohin formën.',
    services: [
      { name: 'Seancë e vetme', price: '20', durationMinutes: 60 },
      { name: 'Paket 10 seancash', price: '180', durationMinutes: 60 },
      { name: 'Anëtarësim mujor', price: '100', durationMinutes: 60 },
    ],
    bookingMethod: 'appointments',
    language: 'sq',
    tone: 'bold',
    archetype: 'studioja',
    canonicalIndustry: 'gym',
  },
  'freelance-designer': {
    businessName: 'Studio Dizajni',
    industry: 'Dizajn dhe identitet vizual',
    industryChip: 'other',
    city: 'Prishtinë, Dardania',
    uniqueness: 'Punoj me një klient në një kohë. Pa agjenci, pa email-zinxhirë — vetëm WhatsApp dhe një takim në javë.',
    businessDescription: 'Dizajnere e pavarur që ndërton identitete vizuale për biznese të vogla — logo, tipografi, sjellje në rrjete sociale, paketim. Procesi nis me bisedë, jo me brief.',
    services: [],
    bookingMethod: 'walkin',
    language: 'sq',
    tone: 'friendly',
    archetype: 'elegant-rafinuar',
    canonicalIndustry: 'freelance',
  },
  'clinic-trust': {
    businessName: 'Klinika e Besueshme',
    industry: 'Klinikë',
    industryChip: 'clinic',
    city: 'Mitrovicë',
    uniqueness: 'Pritja mesatare 8 minuta. Mjekët tanë trajnohen në Vjenë çdo dy vjet. Familja juaj është familja jonë.',
    businessDescription: 'Klinikë familjare që ofron konsulta të përgjithshme, specialistë dhe analiza në Mitrovicë — pritje të shkurtra, mjekë me trajnim ndërkombëtar dhe komunikim të qartë me familjen.',
    services: [
      { name: 'Konsultë e përgjithshme', price: '30', durationMinutes: 20 },
      { name: 'Specialist', price: '60', durationMinutes: 30 },
      { name: 'Analizë gjaku', price: '25', durationMinutes: 15 },
    ],
    bookingMethod: 'appointments',
    language: 'sq',
    tone: 'professional',
    archetype: 'besim-qartesi',
    canonicalIndustry: 'clinic',
  },
  'public-university': {
    businessName: 'Universiteti Publik',
    industry: 'Universitet publik shtetëror',
    industryChip: 'other',
    city: 'Mitrovicë',
    uniqueness: 'Universitet publik pa pagesë studimi, me programe të akredituara dhe fokus në zhvillimin e kapitalit njerëzor të rajonit.',
    businessDescription: 'Universitet publik shtetëror që ofron programe Bachelor dhe Master falas në shkenca kompjuterike, drejtësi, menaxhim publik dhe inxhinieri për studentët e Mitrovicës dhe rajonit.',
    services: [
      { name: 'Bachelor në Shkenca Kompjuterike', price: '', durationMinutes: 0 },
      { name: 'Bachelor në Drejtësi', price: '', durationMinutes: 0 },
      { name: 'Master në Menaxhim Publik', price: '', durationMinutes: 0 },
      { name: 'Master në Inxhinieri dhe Teknologji', price: '', durationMinutes: 0 },
    ],
    bookingMethod: 'none',
    language: 'sq',
    tone: 'professional',
    archetype: 'leter-stil',
    canonicalIndustry: 'education',
  },
};

const FIXTURE_NAME = process.argv[2] || 'clinic-friendly';

// 'all' mode — mirror of the harness 6-fixture suite. Runs each through
// brand-brief + generate-variants ONCE per fixture using the production
// model selection (no modelOverride), so casual fixtures hit Sonnet via
// the tone-conditional path and others stay on Haiku.
const HARNESS_FIXTURES = [
  'barbershop-traditional',
  'coding-academy',
  'gym-bold',
  'freelance-designer',
  'clinic-trust',
  'public-university',
] as const;

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

// ─── Single-fixture A/B mode (Haiku + Sonnet on same brief) ───
async function runFixtureAB(fixtureName: string, fixture: Fixture) {
  console.log(`[fixture] ${fixtureName} — ${fixture.businessName} / tone=${fixture.tone} / archetype=${fixture.archetype}\n`);

  console.log('═══════════════════════════════════════════');
  console.log('  Phase 1 — brand-brief (claude-haiku-4-5)');
  console.log('═══════════════════════════════════════════\n');
  const phase1Start = Date.now();
  const brief = await runBrandBrief({
    businessName: fixture.businessName,
    industry: fixture.industry,
    industryChip: fixture.industryChip,
    city: fixture.city,
    uniqueness: fixture.uniqueness,
    businessDescription: fixture.businessDescription,
    services: fixture.services,
    bookingMethod: fixture.bookingMethod,
    language: fixture.language,
    tone: fixture.tone,
  });
  const phase1Ms = Date.now() - phase1Start;
  console.log(JSON.stringify(brief, null, 2));
  console.log(`\n[timing] brand-brief: ${phase1Ms}ms`);
  writeOutput(`output-${fixtureName}-brief.json`, brief);

  const themeArgsBase = buildThemeArgsBase(brief, fixture);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Phase 2a — theme (claude-haiku-4-5)');
  console.log('═══════════════════════════════════════════\n');
  const phase2aStart = Date.now();
  const haikuTheme = await generateTheme({ ...themeArgsBase, modelOverride: 'claude-haiku-4-5' });
  const phase2aMs = Date.now() - phase2aStart;
  console.log(JSON.stringify(haikuTheme, null, 2));
  console.log(`\n[timing] theme (Haiku): ${phase2aMs}ms`);
  writeOutput(`output-${fixtureName}-theme-haiku.json`, haikuTheme);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Phase 2b — theme (claude-sonnet-4-6)');
  console.log('═══════════════════════════════════════════\n');
  const phase2bStart = Date.now();
  const sonnetTheme = await generateTheme({ ...themeArgsBase, modelOverride: 'claude-sonnet-4-6' });
  const phase2bMs = Date.now() - phase2bStart;
  console.log(JSON.stringify(sonnetTheme, null, 2));
  console.log(`\n[timing] theme (Sonnet): ${phase2bMs}ms`);
  writeOutput(`output-${fixtureName}-theme-sonnet.json`, sonnetTheme);
}

// ─── 'all' mode — runs each harness fixture once, with prod model ───
async function runAllFixtures() {
  console.log('═══════════════════════════════════════════');
  console.log(`  Running all ${HARNESS_FIXTURES.length} harness fixtures (production model selection)`);
  console.log('═══════════════════════════════════════════\n');
  const summary: Array<{ name: string; tone: string; briefMs: number; themeMs: number; model: string }> = [];

  for (const name of HARNESS_FIXTURES) {
    const f = FIXTURES[name];
    if (!f) { console.error(`Missing fixture: ${name}`); continue; }
    console.log(`\n──────────── ${name} (tone=${f.tone}) ────────────\n`);

    const briefStart = Date.now();
    const brief = await runBrandBrief({
      businessName: f.businessName, industry: f.industry, industryChip: f.industryChip,
      city: f.city, uniqueness: f.uniqueness, businessDescription: f.businessDescription,
      services: f.services, bookingMethod: f.bookingMethod, language: f.language, tone: f.tone,
    });
    const briefMs = Date.now() - briefStart;
    writeOutput(`output-${name}-brief.json`, brief);

    const themeArgsBase = buildThemeArgsBase(brief, f);

    const themeStart = Date.now();
    // No modelOverride — production tone-conditional decides Haiku vs Sonnet
    const theme = await generateTheme(themeArgsBase as GenerateThemeArgs);
    const themeMs = Date.now() - themeStart;
    writeOutput(`output-${name}-theme.json`, theme);

    // Production model selection mirrors generateTheme's logic
    const expectedModel = f.tone === 'casual'
      ? (process.env.CASUAL_THEME_MODEL || 'claude-sonnet-4-6')
      : (process.env.THEME_GENERATION_MODEL || 'claude-haiku-4-5');
    summary.push({ name, tone: f.tone, briefMs, themeMs, model: expectedModel });
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════');
  for (const s of summary) {
    console.log(`  ${s.name.padEnd(28)} | tone=${s.tone.padEnd(13)} | model=${s.model.padEnd(20)} | brief=${s.briefMs}ms | theme=${s.themeMs}ms`);
  }
  console.log(`\n  ${HARNESS_FIXTURES.length} fixtures — ${summary.length} successful`);
}

function buildThemeArgsBase(brief: any, fixture: Fixture): Omit<GenerateThemeArgs, 'modelOverride'> {
  const userProvidedServicesString = fixture.services
    .filter((s) => s.name)
    .map((s) => {
      const parts = [s.name];
      if (s.price) parts.push(`€${s.price}`);
      if (s.durationMinutes !== undefined && s.durationMinutes > 0) parts.push(`${s.durationMinutes}min`);
      return parts.join(' / ');
    })
    .join('\n');

  return {
    brief,
    businessName: fixture.businessName,
    industry: fixture.industry,
    city: fixture.city,
    uniqueness: fixture.uniqueness,
    businessDescription: fixture.businessDescription,
    ...LAYOUTS,
    archetypeKey: fixture.archetype as any,
    bookingMethod: fixture.bookingMethod,
    language: fixture.language,
    tone: fixture.tone,
    userProvidedServices: userProvidedServicesString,
    canonicalIndustry: fixture.canonicalIndustry,
    userHasGalleryPhotos: false,
    userHasServicePhotos: false,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing — make sure to run with --env-file=.env');
    process.exit(1);
  }

  if (FIXTURE_NAME === 'all') {
    await runAllFixtures();
    return;
  }

  const fixture = FIXTURES[FIXTURE_NAME];
  if (!fixture) {
    console.error(`Unknown fixture: "${FIXTURE_NAME}". Available: ${Object.keys(FIXTURES).join(', ')}`);
    process.exit(1);
  }
  await runFixtureAB(FIXTURE_NAME, fixture);
}

main().catch((e) => {
  console.error('\n[FAILED]', e);
  process.exit(1);
});
