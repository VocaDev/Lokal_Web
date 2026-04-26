/**
 * Stage 2: Theme Generator (wizard v2)
 * Single Haiku call. Returns one theme that honors the user's structural
 * choices (hero, density, mood, fonts, language, tone). Validates against
 * BANNED_PHRASES; regenerates once if invalid.
 *
 * Route URL preserved (`/api/generate-variants`) but the response shape
 * changed from `{ variants: [A, B] }` to `{ theme: <object> }`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { normalizeIndustry, type Industry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { parseModelJson } from '@/lib/json-extract';

export const maxDuration = 60;

const THEME_SCHEMA = {
  name: 'website_theme',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      variantName: { type: 'string' },
      directionRationale: { type: 'string' },
      templateId: { type: 'string' },
      primaryColor: { type: 'string' },
      accentColor: { type: 'string' },
      bgColor: { type: 'string' },
      surfaceColor: { type: 'string' },
      textColor: { type: 'string' },
      mutedTextColor: { type: 'string' },
      borderColor: { type: 'string' },
      headingFont: { type: 'string', enum: ['dm-sans', 'playfair', 'inter', 'poppins', 'space-grotesk'] },
      bodyFont: { type: 'string', enum: ['dm-sans', 'inter', 'poppins'] },
      heroHeight: { type: 'string', enum: ['small', 'medium', 'large'] },
      cardStyle: { type: 'string', enum: ['minimal', 'raised', 'bordered', 'glass'] },
      heroHeadline: { type: 'string' },
      heroSubheadline: { type: 'string' },
      aboutCopy: { type: 'string' },
      ctaPrimary: { type: 'string' },
      ctaSecondary: { type: 'string' },
      footerTagline: { type: 'string' },
      metaDescription: { type: 'string' },
      valueProps: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object', additionalProperties: false,
          properties: { icon: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
          required: ['icon', 'title', 'description'],
        },
      },
      testimonials: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object', additionalProperties: false,
          properties: { name: { type: 'string' }, role: { type: 'string' }, quote: { type: 'string' }, rating: { type: 'number' } },
          required: ['name', 'role', 'quote', 'rating'],
        },
      },
      faq: {
        type: 'array', minItems: 5, maxItems: 5,
        items: {
          type: 'object', additionalProperties: false,
          properties: { question: { type: 'string' }, answer: { type: 'string' } },
          required: ['question', 'answer'],
        },
      },
      services: {
        type: 'array', minItems: 4, maxItems: 6,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            durationMinutes: { type: 'number' },
          },
          required: ['name', 'description', 'price', 'durationMinutes'],
        },
      },
      showTestimonials: { type: 'boolean' },
      showTeam: { type: 'boolean' },
      showContact: { type: 'boolean' },
    },
    required: [
      'variantName', 'directionRationale', 'templateId',
      'primaryColor', 'accentColor', 'bgColor', 'surfaceColor',
      'textColor', 'mutedTextColor', 'borderColor',
      'headingFont', 'bodyFont', 'heroHeight', 'cardStyle',
      'heroHeadline', 'heroSubheadline', 'aboutCopy',
      'ctaPrimary', 'ctaSecondary', 'footerTagline', 'metaDescription',
      'valueProps', 'testimonials', 'faq', 'services',
      'showTestimonials', 'showTeam', 'showContact',
    ],
  },
};

const BANNED_PHRASES = [
  'top-notch', 'premium quality', 'one-stop shop', 'we pride ourselves',
  'commitment to excellence', 'passionate about', 'unmatched quality',
  'unparalleled', 'state-of-the-art', 'cutting-edge', 'delighting our customers',
  'satisfaction is our priority', 'experience the difference', 'a cut above',
  'second to none', 'elevate your', 'unleash your', 'discover the',
  'where style meets', 'more than just',
];

// Mirrors the keys actually present in src/components/templates/index.tsx
// TEMPLATE_MAP. The router falls back to 'modern' for any unknown id.
const VALID_TEMPLATE_IDS = [
  'modern', 'minimal', 'bold', 'elegant',
  'casual', 'bistro', 'clean', 'premium', 'luxury',
];

function heroDirective(hero: string): string {
  switch (hero) {
    case 'cinematic': return 'Full-bleed hero — dramatic background image or gradient, large headline, single primary CTA. Cinematic and immersive.';
    case 'split': return '50/50 split hero — image on one side, headline + subheadline + CTA on the other. Balanced.';
    case 'centered': return 'Minimal centered hero — small label, big headline, brief subheadline, one CTA. All centered. Lots of whitespace.';
    case 'editorial': return 'Magazine-style hero — small metadata bar at top (issue number, location), oversized serif headline, prose-style subheadline. No image.';
    default: return '';
  }
}

function sectionPriorityDirective(priority: string): string {
  return `After the hero, the FIRST major section should be: ${priority}. Other sections follow in natural order.`;
}

function densityDirective(density: string): string {
  return density === 'sparse'
    ? 'Sparse and airy: shorter copy, fewer items per row, generous whitespace. cardStyle should be "minimal".'
    : 'Rich and dense: longer copy, more items per row, tighter spacing, more sections. cardStyle should be "raised" or "bordered".';
}

function moodDirective(mood: string, primary?: string, accent?: string): string {
  switch (mood) {
    case 'warm': return 'Earthy warm palette — browns, golds, cream, dark surfaces. Traditional, rooted feel. Generate hex values that feel timeless and tactile.';
    case 'cool': return 'Cool modern palette — blues, teals, dark or light. Clean, professional. Generate hex values that feel digital but warm.';
    case 'bold': return 'High-contrast bold palette — strong reds, oranges, near-black backgrounds. Striking. Generate hex values that demand attention without being garish.';
    case 'elegant': return 'Refined elegant palette — golds, ivories, deep neutrals. Premium feel. Generate hex values that signal quality and restraint.';
    case 'custom':
      return `LOCKED BRAND COLORS — primary=${primary}, accent=${accent}. Use these EXACTLY. Generate background, surface, text, mutedTextColor, and border hex values that harmonize with these two.`;
    default: return '';
  }
}

function fontDirective(personality: string): string {
  switch (personality) {
    case 'editorial': return 'headingFont MUST be "playfair". bodyFont MUST be "inter" or "dm-sans".';
    case 'modern': return 'headingFont MUST be "space-grotesk". bodyFont MUST be "dm-sans" or "inter".';
    case 'friendly': return 'headingFont and bodyFont MUST both be "poppins".';
    case 'bold': return 'headingFont MUST be "space-grotesk" or "poppins". bodyFont MUST be "dm-sans" or "inter".';
    case 'elegant': return 'headingFont MUST be "playfair". bodyFont MUST be "inter".';
    default: return '';
  }
}

function languageInstruction(lang: string): string {
  switch (lang) {
    case 'sq': return 'Albanian only. Authentic Kosovar Albanian, not stiff translations.';
    case 'en': return 'English only.';
    case 'both': return 'Bilingual — primary copy in Albanian, with key CTAs and metaDescription also in English where it reads naturally.';
    default: return 'Albanian only.';
  }
}

function toneDirective(tone: string): string {
  switch (tone) {
    case 'friendly': return 'Tone is warm and approachable. Direct, but not cold. Speaks to the customer like a neighbor.';
    case 'professional': return 'Tone is precise and competent. Confident without being formal. No casual asides.';
    case 'bold': return 'Tone is direct and provocative. Strong opinions. Short sentences. Owns the room.';
    default: return '';
  }
}

type GenerateThemeArgs = {
  brief: any;
  businessName: string;
  industry: string;
  city: string;
  hero: string;
  sectionPriority: string;
  density: string;
  mood: string;
  brandPrimary?: string;
  brandAccent?: string;
  fontPersonality: string;
  language: string;
  tone: string;
  userProvidedServices: string;
  canonicalIndustry: Industry;
  regenSeed?: string;
};

async function generateTheme(args: GenerateThemeArgs) {
  const {
    brief, businessName, industry, city,
    hero, sectionPriority, density, mood, brandPrimary, brandAccent,
    fontPersonality, language, tone, userProvidedServices,
    canonicalIndustry, regenSeed,
  } = args;

  const systemPrompt = `You are a senior designer translating a brand strategy brief into a complete website theme. The user has chosen specific structural direction. HONOR IT.

CRITICAL RULES:
- The price field in every service MUST be a number (integer). Use the midpoint if a range is intended. Example: 25 not "20-30 Eur".
- The icon field in valueProps MUST always be a non-empty emoji string.
- Output ONLY raw JSON — no markdown code fences, no explanation, no backticks.

USER'S STRUCTURAL CHOICES:

Hero style: ${hero}
${heroDirective(hero)}

Section priority: ${sectionPriority}
${sectionPriorityDirective(sectionPriority)}

Density: ${density}
${densityDirective(density)}

Mood: ${mood}
${moodDirective(mood, brandPrimary, brandAccent)}

Font personality: ${fontPersonality}
${fontDirective(fontPersonality)}

Language: ${language}
Write all customer-facing copy (heroHeadline, heroSubheadline, aboutCopy, ctaPrimary, ctaSecondary, footerTagline, metaDescription, valueProps title+description, testimonials role+quote, faq, services.description) in: ${languageInstruction(language)}

Tone: ${tone}
${toneDirective(tone)}

TEMPLATE ID — PICK ONE FROM THIS LIST:
${VALID_TEMPLATE_IDS.join(', ')}
Pick the templateId that best matches the user's hero style and industry.

REALISTIC PRICING (Kosovo market, EUR):
- barbershop: €5-25
- restaurant: €4-15 menu items
- clinic: €25-80 consultations
- beauty_salon: €15-50
- gym: €10-40
- other: infer from the user's services

THIS BUSINESS'S CANONICAL INDUSTRY: ${canonicalIndustry}
Each service MUST have a realistic duration (15, 30, 45, 60, 90, 120 minutes).

USER-PROVIDED SERVICES (gospel — build the services array around these):
${userProvidedServices || '(none provided — infer 4-5 typical services for this industry)'}

If the user listed services, each entry in your services array MUST correspond to one of them. Do not invent unrelated services when the user has been specific.

FEW-SHOT — HERO HEADLINES

BAD: "Welcome to our barbershop" / "Experience the art of grooming"
GOOD: "Qethje që flet për ty." / "Three chairs. Forty years. Still no appointment needed." / "The last proper barbershop in Peyton."

FEW-SHOT — TESTIMONIALS

BAD: "Great service! Highly recommend!" / "John Smith from New York"
GOOD: "Shkoj tek Arti që prej 3 vitesh. I vetmi vend ku nuk më lyp foto kur i shpjegoj si e dua."
GOOD: "My father brought me here when I was 8. Now I bring my son. Same chair."

FEW-SHOT — VALUE PROPS

BAD title: "Quality Service" / BAD description: "We provide top-notch service"
GOOD title: "One chair, one cut" / GOOD description: "No rotating through three barbers. The one who starts your cut finishes it."

BANNED PHRASES — if you use any, you have failed:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

Also banned:
- Emoji in body copy (only in valueProps.icon)
- "Whether you're X or Y, we've got you covered"
- "We pride ourselves on..."
- Lorem ipsum

NAMES for testimonials — authentic Kosovar names, mix gender:
Male: Erblin, Kushtrim, Dukagjin, Arbnor, Valdrin, Labinot, Leotrim, Ilir, Besnik, Ermal
Female: Fjolla, Njomza, Valdete, Blerta, Elira, Rinë, Donjeta, Fitore, Teuta
AVOID: Arta, Blerim, Dritë, Agron (overused).

NEIGHBORHOODS for "role" field — Prishtinë: Arbëria, Dardania, Peyton, Qyteti i Ri, Ulpiana, Sunny Hill; Prizren: Shadërvan; Pejë: Haxhi Zeka.

Output valid JSON matching this schema:
${JSON.stringify(THEME_SCHEMA.schema)}`;

  const userPrompt = `BRAND BRIEF (gospel — every design choice must serve it):
- Positioning: ${brief.positioning}
- Defining traits: ${brief.definingTraits.join(', ')}
- Target customer: ${brief.targetCustomer}
- Voice: ${brief.voice}
- Cultural anchor: ${brief.culturalAnchor}

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- City: ${city}
${mood === 'custom' ? `- BRAND COLORS (LOCKED): primary=${brandPrimary}, accent=${brandAccent}` : ''}

Generate the theme.${regenSeed ? ` (regen: ${regenSeed})` : ''}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    temperature: 0.85,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseModelJson(text || '{}');
}

function validateTheme(v: any): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allCopy = [
    v.heroHeadline, v.heroSubheadline, v.aboutCopy, v.footerTagline,
    ...(v.valueProps || []).map((p: any) => `${p.title} ${p.description}`),
    ...(v.testimonials || []).map((t: any) => t.quote),
  ].join(' ').toLowerCase();

  for (const banned of BANNED_PHRASES) {
    if (allCopy.includes(banned.toLowerCase())) reasons.push(`Contains banned phrase: "${banned}"`);
  }

  const avgTestimonial = (v.testimonials || [])
    .reduce((s: number, t: any) => s + (t.quote?.length || 0), 0) / (v.testimonials?.length || 1);
  if (avgTestimonial < 40) reasons.push('Testimonials too short');

  return { valid: reasons.length === 0, reasons };
}

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

    const body = await request.json();
    const {
      brief, businessName, industry, city,
      hero, sectionPriority, density, mood,
      brandPrimary, brandAccent, fontPersonality,
      language, tone, userProvidedServices, regenSeed,
    } = body;

    if (!brief || !businessName || !industry) {
      return NextResponse.json({ error: 'brief, businessName, industry required' }, { status: 400 });
    }

    const canonical = normalizeIndustry(industry);

    const args: GenerateThemeArgs = {
      brief,
      businessName,
      industry,
      city: city || '',
      hero: hero || 'cinematic',
      sectionPriority: sectionPriority || 'services',
      density: density || 'dense',
      mood: mood || 'warm',
      brandPrimary,
      brandAccent,
      fontPersonality: fontPersonality || 'editorial',
      language: language || 'sq',
      tone: tone || 'friendly',
      userProvidedServices: userProvidedServices || '',
      canonicalIndustry: canonical,
      regenSeed,
    };

    console.log('[generate-variants] Generating single theme', { canonical, hero: args.hero, mood: args.mood });
    let theme = await generateTheme(args);

    const validation = validateTheme(theme);
    if (!validation.valid) {
      console.warn('[generate-variants] Theme failed validation, regenerating once:', validation.reasons);
      const retry = await generateTheme({ ...args, regenSeed: `retry-${Date.now()}` });
      const retryValidation = validateTheme(retry);
      if (retryValidation.valid) {
        theme = retry;
      } else {
        console.warn('[generate-variants] Retry also invalid, returning best-effort:', retryValidation.reasons);
        theme = retry;
      }
    }

    return NextResponse.json({ success: true, theme });
  } catch (error: any) {
    console.error('[generate-variants] Error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
