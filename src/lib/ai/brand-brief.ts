/**
 * Brand-brief runner — pure (no auth, no rate limiting, no progress events).
 *
 * Lives outside app/api/brand-brief/route.ts because Next.js's App Router
 * validates route file exports against a fixed allowlist (GET/POST/etc.,
 * runtime, dynamic, etc.). Helper exports like runBrandBrief or BrandBriefArgs
 * cause the build to fail with "X is not a valid Route export field."
 *
 * The route's POST handler imports runBrandBrief from here and wraps it with
 * auth + rate limiting + progress emit. The scripts/ A/B harness imports it
 * directly to bypass the Next runtime entirely.
 */

import { anthropic } from '@/lib/anthropic';
import { parseModelJson } from '@/lib/json-extract';
import { BANNED_PHRASES, BANNED_KOSOVAR_WORDS } from '@/lib/banned-phrases';

export type BrandBriefArgs = {
  businessName: string;
  industry: string;
  industryChip?: string;
  city: string;
  uniqueness?: string;
  businessDescription?: string;
  services?: Array<{ name: string }>;
  bookingMethod?: string;
  language?: string;
  tone?: string;
  modelOverride?: string;
};

export const BRAND_BRIEF_SCHEMA = {
  name: 'brand_brief',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      positioning: { type: 'string' },
      definingTraits: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 3,
      },
      targetCustomer: { type: 'string' },
      voice: { type: 'string' },
      culturalAnchor: { type: 'string' },
    },
    required: ['positioning', 'definingTraits', 'targetCustomer', 'voice', 'culturalAnchor'],
  },
};

function briefLanguageInstruction(language: string): string {
  if (language === 'sq') {
    return `Write the brief in AUTHENTIC ALBANIAN (Kosovar). Internal use, but write it as a senior Albanian-speaking strategist would. Do not translate from English in your head — think in Albanian.`;
  }
  if (language === 'en') {
    return `Write the brief in English.`;
  }
  return `Write the brief in English. The final website copy will be bilingual.`;
}

const INDUSTRY_CONTEXT: Record<string, string> = {
  barbershop: `Barbershops in Kosovo are masculine social spaces. Pre-wedding prep (dhëndërri), Saturday family grooming rituals, male bonding over straight-razor shaves. Services: cut, fade, beard, shave, child's cut. Price range 5-25 EUR.`,
  restaurant: `Kosovar restaurants center on shared meals. Traditional: flija, pite, tavë kosi, qebapa. Coffee culture (macchiato, Turkish). Sunday family gatherings. Outdoor terraces (bahçe). Price: 8-30 EUR.`,
  clinic: `Healthcare clinics blend trust, modernity, family-doctor warmth. Private clinics compete on wait times, equipment, foreign degrees (Germany, Austria). Family recommendations drive growth.`,
  beauty_salon: `Beauty salons serve everyday grooming + big life events. Bridal sessions (4-6 hours), engagement prep, nail art daily. Strong stylist-client loyalty. Price: 15-50 EUR.`,
  gym: `Gyms in Kosovo range from no-frills strength rooms to boutique studios. Core audience: 18-40 with disposable income. Monthly memberships dominate (€25-40). Personal training €15-25/session. Growing interest in group classes, functional fitness, CrossFit. Family/student discounts common.`,
  courses: `Course and education businesses are judged by teaching method, group size, progression, proof of learning, and whether students leave with practical confidence. Avoid reducing the business to a list of course names.`,
  education: `Course and education businesses are judged by teaching method, group size, progression, proof of learning, and whether students leave with practical confidence. Avoid reducing the business to a list of course names.`,
  retail: `Retail and product businesses need product framing, not appointment framing. Items are products, collections, or drops; duration usually does not apply. Specific materials, origin, packaging, and scarcity matter.`,
  shop: `Retail and product businesses need product framing, not appointment framing. Items are products, collections, or drops; duration usually does not apply. Specific materials, origin, packaging, and scarcity matter.`,
  freelance: `Freelance and creative professionals sell outcomes and deliverables, not generic labor. The brief should capture taste, process, selectivity, deadlines, and what working with the person actually feels like.`,
  freelancer: `Freelance and creative professionals sell outcomes and deliverables, not generic labor. The brief should capture taste, process, selectivity, deadlines, and what working with the person actually feels like.`,
  events: `Event businesses are anchored by date, place, audience, energy, tickets or packages, and the reason this gathering exists. Avoid generic "unforgettable event" language.`,
  event: `Event businesses are anchored by date, place, audience, energy, tickets or packages, and the reason this gathering exists. Avoid generic "unforgettable event" language.`,
  other: `Small Kosovar business. Currency Euro. Major cities: Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Ferizaj, Gjilan. Bilingual audience (Albanian/English).`,
};

const BRAND_BRIEF_STATIC_SYSTEM_PROMPT = `You are a senior brand strategist who has positioned 200+ small businesses across Southeast Europe. You do NOT design yet — you THINK.

Your job: write a brand brief so specific that a stranger reading only your brief could correctly predict what the website should feel like. If your brief could equally apply to any business in the same category, you have failed.

CRITICAL DISTINCTION — BUSINESS vs SERVICES:

The user's BUSINESS is described by: name, industry, city, businessDescription (what they offer in their own words), and uniqueness statement.
The user's SERVICES list is: SOME (often not all) of what the business offers.

The brand brief must reflect THE BUSINESS — what it is, who it serves, what makes it different. It must NOT reduce the business to its specific service items.

Example of WRONG behavior:
- Business: "Coding Academy" with description "we teach programming and foreign languages"
- Services list: "Python Beginner course, English B1 course"
- WRONG positioning: "An academy that teaches Python and English"
  (treats the business as JUST those two services)
- RIGHT positioning: "A learning institution focused on building practical fluency — in code or in language — through small-group, level-aware courses."
  (treats the business as a learning institution; services are examples)

When the user provides a businessDescription, use it as the PRIMARY scope signal. The services list is supporting evidence, not the boundary of the business.

The user has told you what makes their business different. Use that as the highest-priority signal. The location matters too — Prishtinë vs Pejë vs Prizren feel different.

QUALITY EXAMPLES:

BAD positioning: "A quality barbershop offering professional haircuts"
GOOD positioning: "A barbershop that treats every cut like wedding preparation — because half of them are."

BAD definingTraits: ["professional", "modern", "friendly"]
GOOD definingTraits: ["unapologetically traditional", "silent-while-working precision", "masculine without being macho"]

BAD culturalAnchor: "Kosovar hospitality"
GOOD culturalAnchor: "The fifteen minutes of silence after the warm towel — the only moment of the week men don't have to talk."

BANNED WORDS — never use any of these in ANY field of the brief.
Downstream prompts quote your brief fields verbatim into customer-facing
copy, so a banned word here leaks into the rendered website.

Banned English marketing clichés:
${BANNED_PHRASES.map((p) => `- "${p}"`).join('\n')}

Banned Albanian/Kosovar register words (these signal Tirana-Tosk filler
or translated marketing instead of authentic Kosovar speech):
${BANNED_KOSOVAR_WORDS.map((p) => `- "${p}"`).join('\n')}

If you find one of these words in your draft, REWRITE the sentence with
a concrete specific (a number, a year, a place, a tool, a behavior) instead.

Output ONLY raw JSON — no markdown code fences, no explanation, no backticks. Just the JSON object matching this schema:
${JSON.stringify(BRAND_BRIEF_SCHEMA.schema)}`;

export async function runBrandBrief(args: BrandBriefArgs) {
  const {
    businessName, industry, industryChip, city, uniqueness, businessDescription,
    services, bookingMethod, language, tone, modelOverride,
  } = args;

  const knownChip = industryChip && INDUSTRY_CONTEXT[industryChip];
  const context = knownChip
    ? INDUSTRY_CONTEXT[industryChip]
    : `The user describes their business as: ${industry}. Infer the cultural and competitive context for this kind of business in Kosovo. Do not assume it's one of the standard categories.`;

  const serviceNames = Array.isArray(services)
    ? services.map((s: any) => s?.name).filter(Boolean).join(', ')
    : '';

  const dynamicSystemPrompt = briefLanguageInstruction(language || 'sq');

  const userPrompt = `BUSINESS:
- Name: ${businessName}
- Industry (user's words): ${industry}
- Standard category: ${industryChip || 'none — treat as a custom industry'}
- Location: ${city}
- What the business offers (user's own words): ${businessDescription || '(not provided)'}
- What makes it different (highest signal): ${uniqueness || '(not provided)'}
- Specific services offered: ${serviceNames || '(none — infer from description)'}
- Booking model: ${bookingMethod || 'unspecified'}
- Site language: ${language || 'sq'}
- Tone: ${tone || 'friendly'}

INDUSTRY CONTEXT:
${context}

Write the brief. Every field must be specific enough that it couldn't describe a competitor.`;

  const response = await anthropic.messages.create({
    model: modelOverride || 'claude-haiku-4-5',
    max_tokens: 2000,
    temperature: 0.3,
    system: [
      {
        type: 'text',
        text: BRAND_BRIEF_STATIC_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: dynamicSystemPrompt,
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseModelJson(text);
}
