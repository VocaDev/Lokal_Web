/**
 * Stage 1: Brand Brief Generator
 * Model: claude-haiku-4-5 (Anthropic) with JSON-only system instruction
 * Returns a 5-field strategic brief in ~2 seconds
 */

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { normalizeIndustry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';

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

    // Require auth + per-user daily rate limit. AI calls cost money — never
    // expose them to anonymous traffic.
    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    const limited = await bumpAiUsage(supabase, userOrResponse.id);
    if (limited) return limited;

    const { businessName, industry, industryLabel, tagline, moodKeywords, userProvidedServices } = await request.json();
    if (!businessName || !industry) {
      return NextResponse.json({ error: 'businessName and industry required' }, { status: 400 });
    }

    const canonical = normalizeIndustry(industry);
    const context = INDUSTRY_CONTEXT[canonical] || INDUSTRY_CONTEXT.other;
    const displayIndustry = industryLabel || industry;

    const systemPrompt = `You are a senior brand strategist who has positioned 200+ small businesses across Southeast Europe. You do NOT design yet — you THINK.

Your job: write a brand brief so specific that a stranger reading only your brief could correctly predict what the website should feel like. If your brief could equally apply to any business in the same category, you have failed.

QUALITY EXAMPLES:

BAD positioning: "A quality barbershop offering professional haircuts"
GOOD positioning: "A barbershop that treats every cut like wedding preparation — because half of them are."

BAD definingTraits: ["professional", "modern", "friendly"]
GOOD definingTraits: ["unapologetically traditional", "silent-while-working precision", "masculine without being macho"]

BAD culturalAnchor: "Kosovar hospitality"
GOOD culturalAnchor: "The fifteen minutes of silence after the warm towel — the only moment of the week men don't have to talk."

Every field must be surprising and specific. Output valid JSON matching the following schema:
${JSON.stringify(BRAND_BRIEF_SCHEMA.schema)}`;

    const userPrompt = `BUSINESS:
- Name: ${businessName}
- Industry: ${displayIndustry}
- Owner's description: ${tagline || '(none provided)'}
- Services the owner provides: ${userProvidedServices || '(none specified)'}
- Mood keywords: ${(moodKeywords || []).join(', ') || '(none)'}

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
    const brief = JSON.parse(text.trim());
    console.log('[brand-brief]', JSON.stringify(brief, null, 2));

    return NextResponse.json({ success: true, brief });
  } catch (error: any) {
    console.error('[brand-brief] Error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
