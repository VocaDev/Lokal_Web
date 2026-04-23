/**
 * Stage 1: Brand Brief Generator
 * Model: openai/gpt-oss-120b (Groq) with strict JSON schema
 * Returns a 5-field strategic brief in ~2 seconds
 */

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

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
  general: `Small Kosovar business. Currency Euro. Major cities: Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Ferizaj, Gjilan. Bilingual audience (Albanian/English).`,
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const { businessName, industry, tagline, moodKeywords } = await request.json();
    if (!businessName || !industry) {
      return NextResponse.json({ error: 'businessName and industry required' }, { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const context = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.general;

    const systemPrompt = `You are a senior brand strategist who has positioned 200+ small businesses across Southeast Europe. You do NOT design yet — you THINK.

Your job: write a brand brief so specific that a stranger reading only your brief could correctly predict what the website should feel like. If your brief could equally apply to any business in the same category, you have failed.

QUALITY EXAMPLES:

BAD positioning: "A quality barbershop offering professional haircuts"
GOOD positioning: "A barbershop that treats every cut like wedding preparation — because half of them are."

BAD definingTraits: ["professional", "modern", "friendly"]
GOOD definingTraits: ["unapologetically traditional", "silent-while-working precision", "masculine without being macho"]

BAD culturalAnchor: "Kosovar hospitality"
GOOD culturalAnchor: "The fifteen minutes of silence after the warm towel — the only moment of the week men don't have to talk."

Every field must be surprising and specific. Output valid JSON matching the schema.`;

    const userPrompt = `BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- Owner's description: ${tagline || '(none provided)'}
- Mood keywords: ${(moodKeywords || []).join(', ') || '(none)'}

INDUSTRY CONTEXT:
${context}

Write the brief. Every field must be specific enough that it couldn't describe a competitor.`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_schema', json_schema: BRAND_BRIEF_SCHEMA },
      temperature: 0.3,
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
    } as any);

    const raw = completion.choices[0]?.message?.content || '{}';
    const brief = JSON.parse(raw);
    console.log('[brand-brief]', JSON.stringify(brief, null, 2));

    return NextResponse.json({ success: true, brief });
  } catch (error: any) {
    console.error('[brand-brief] Error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
