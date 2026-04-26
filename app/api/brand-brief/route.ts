/**
 * Stage 1: Brand Brief Generator (wizard v2)
 * Model: claude-haiku-4-5 with JSON-only system instruction.
 * Returns a 5-field strategic brief from the wizard's lenient inputs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { parseModelJson } from '@/lib/json-extract';
import { emitProgress } from '@/lib/ai-progress';

export const maxDuration = 30;

const BRAND_BRIEF_SCHEMA = {
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
  other: `Small Kosovar business. Currency Euro. Major cities: Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Ferizaj, Gjilan. Bilingual audience (Albanian/English).`,
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    const limited = await bumpAiUsage(supabase, userOrResponse.id);
    if (limited) return limited;

    const {
      businessName,
      industry,
      industryChip,
      city,
      uniqueness,
      services,
      bookingMethod,
      language,
      tone,
      generationId,
      businessId,
    } = await request.json();

    // Optional progress streaming. The wizard passes generationId+businessId
    // and subscribes via Realtime; older callers that omit them still work.
    const canEmit = typeof generationId === 'string' && typeof businessId === 'string';
    const userId = userOrResponse.id;
    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'analyzing_business', status: 'started',
      });
    }

    if (!businessName || !industry || !city) {
      return NextResponse.json(
        { error: 'businessName, industry, and city are required' },
        { status: 400 },
      );
    }

    const knownChip = industryChip && INDUSTRY_CONTEXT[industryChip];
    const context = knownChip
      ? INDUSTRY_CONTEXT[industryChip]
      : `The user describes their business as: ${industry}. Infer the cultural and competitive context for this kind of business in Kosovo. Do not assume it's one of the standard categories.`;

    const serviceNames = Array.isArray(services)
      ? services.map((s: any) => s?.name).filter(Boolean).join(', ')
      : '';

    const systemPrompt = `You are a senior brand strategist who has positioned 200+ small businesses across Southeast Europe. You do NOT design yet — you THINK.

Your job: write a brand brief so specific that a stranger reading only your brief could correctly predict what the website should feel like. If your brief could equally apply to any business in the same category, you have failed.

The user has told you what makes their business different. Use that as the highest-priority signal. The location matters too — Prishtinë vs Pejë vs Prizren feel different.

QUALITY EXAMPLES:

BAD positioning: "A quality barbershop offering professional haircuts"
GOOD positioning: "A barbershop that treats every cut like wedding preparation — because half of them are."

BAD definingTraits: ["professional", "modern", "friendly"]
GOOD definingTraits: ["unapologetically traditional", "silent-while-working precision", "masculine without being macho"]

BAD culturalAnchor: "Kosovar hospitality"
GOOD culturalAnchor: "The fifteen minutes of silence after the warm towel — the only moment of the week men don't have to talk."

${briefLanguageInstruction(language || 'sq')}

Output ONLY raw JSON — no markdown code fences, no explanation, no backticks. Just the JSON object matching this schema:
${JSON.stringify(BRAND_BRIEF_SCHEMA.schema)}`;

    const userPrompt = `BUSINESS:
- Name: ${businessName}
- Industry (user's words): ${industry}
- Standard category: ${industryChip || 'none — treat as a custom industry'}
- Location: ${city}
- What makes it different (highest signal): ${uniqueness || '(not provided)'}
- Services offered: ${serviceNames || '(not specified)'}
- Booking model: ${bookingMethod || 'unspecified'}
- Site language: ${language || 'sq'}
- Tone: ${tone || 'friendly'}

INDUSTRY CONTEXT:
${context}

Write the brief. Every field must be specific enough that it couldn't describe a competitor.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const brief = parseModelJson(text);
    console.log('[brand-brief]', JSON.stringify(brief, null, 2));

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'building_brief', status: 'completed',
      });
    }

    return NextResponse.json({ success: true, brief });
  } catch (error: any) {
    console.error('[brand-brief] Error:', error?.message || error);
    // Best-effort: surface the failure on the wizard's progress stream.
    try {
      const body = await request.clone().json().catch(() => ({} as any));
      if (typeof body.generationId === 'string' && typeof body.businessId === 'string') {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await emitProgress({
            supabase, userId: user.id,
            businessId: body.businessId,
            generationId: body.generationId,
            step: 'building_brief', status: 'error',
            message: error?.message || 'Brief generation failed',
          });
        }
      }
    } catch { /* swallowed */ }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
