/**
 * Stage 2: Theme Variant Generator
 * Takes a brand brief + business info. Generates 2 contrasting variants in parallel.
 * Each variant gets full rich content: copy, testimonials, FAQ, value props.
 */

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { normalizeIndustry, type Industry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';

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
      templateId: { type: 'string', enum: ['modern', 'minimal', 'bold', 'elegant'] },
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

const VARIANT_DIRECTIONS = [
  {
    name: 'A — Refined Category Leader',
    temperature: 0.85,
    directive: `Execute the industry's best aesthetic playbook with craft and restraint. Colors are rich but traditional. Typography is confident but not attention-seeking. Copy is specific but doesn't subvert. Think: the highest-end version of what established competitors already do — this variant wins by being the most polished version of what customers expect.`,
  },
  {
    name: 'B — Contrarian Distinctive',
    temperature: 1.0,
    directive: `Break the category's visual conventions deliberately — but serve the brand brief. Pick colors the category doesn't usually use. Pick typography that creates friction with expectations. Copy has more voice, more edge, more specificity. This variant wins by being unforgettable. It's the choice someone makes when they're confident enough to stand out.`,
  },
];

async function generateVariant(
  brief: any,
  businessName: string,
  industry: string,
  canonicalIndustry: Industry,
  userProvidedServices: string,
  direction: typeof VARIANT_DIRECTIONS[0],
) {
  const systemPrompt = `You are a senior designer translating a brand strategy brief into a complete website theme.

CRITICAL: The price field in every service MUST be a number (integer), never a string. Use the midpoint if a range is intended. Example: 25 not "20-30 Eur".
The icon field in valueProps MUST always be a non-empty emoji string. Never leave it empty.

YOUR DIRECTION — ${direction.name}:
${direction.directive}

REALISTIC PRICING (Kosovo market, EUR — use these anchors when generating the services array):
- barbershop: €5-25 (haircut €8-12, fade €10-15, straight razor €15-25, full package €20-30)
- restaurant: menu items €4-15 (appetizer €4-7, main €8-15, dessert €4-7)
- clinic: consultations €25-80 (general consult €25-40, specialist €50-80, procedure €40-150)
- beauty_salon: services €15-50 (manicure €15-20, pedicure €20-30, haircut+style €25-40, bridal €50-150)
- gym: services €10-40 (day pass €5-10, monthly membership €25-40, personal training €15-25/session)
- other: infer reasonable prices from the user's description

THIS BUSINESS'S INDUSTRY: ${canonicalIndustry} (use the matching price range above)
Each service MUST have a realistic duration in minutes (15, 30, 45, 60, 90, 120).

USER-PROVIDED SERVICES (gospel — build the services array around these exact offerings):
${userProvidedServices || '(none provided — infer 4-5 typical services for this industry)'}

If the user listed services, each entry in your services array MUST correspond to one of them (keep their names, translate only if the site copy language differs). Do not invent unrelated offerings when the user has been specific.

FEW-SHOT — HERO HEADLINES

BAD (generic): "Welcome to our barbershop"
BAD (AI-tell): "Experience the art of grooming"
GOOD: "Qethje që flet për ty." (Albanian — "A cut that speaks for you")
GOOD: "Three chairs. Forty years. Still no appointment needed."
GOOD: "The last proper barbershop in Peyton."

FEW-SHOT — TESTIMONIALS

BAD (stock): "Great service! Highly recommend!"
BAD (fake-American name): "John Smith from New York"
GOOD: "Shkoj tek Arti që prej 3 vitesh. I vetmi vend ku nuk më lyp foto kur i shpjegoj si e dua." (authentic Albanian, specific duration, specific pain point)
GOOD: "My father brought me here when I was 8. Now I bring my son. Same chair."
GOOD: "Pa takim. Pa muzikë kot. Vetëm gërshërët dhe tregimi i fundjavës."

FEW-SHOT — VALUE PROPS

BAD title: "Quality Service" / BAD description: "We provide top-notch service"
GOOD title: "One chair, one cut" / GOOD description: "No rotating through three barbers. The one who starts your cut finishes it."

BANNED PHRASES — if you use any of these, you have failed:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

Also banned:
- Emoji in body copy (use emoji ONLY in valueProps.icon)
- "Whether you're X or Y, we've got you covered"
- "We pride ourselves on..."
- Lorem ipsum or placeholder text

NAMES for testimonials — use authentic Kosovar names, mix gender:
Male: Erblin, Kushtrim, Dukagjin, Arbnor, Valdrin, Labinot, Leotrim, Ilir, Besnik, Ermal
Female: Fjolla, Njomza, Valdete, Blerta, Elira, Rinë, Donjeta, Fitore, Teuta
AVOID: Arta, Blerim, Dritë, Agron (overused in AI outputs)

NEIGHBORHOODS for "role" field — Prishtinë: Arbëria, Dardania, Peyton, Qyteti i Ri, Ulpiana, Sunny Hill; Prizren: Shadërvan; Pejë: Haxhi Zeka.

Before outputting, verify:
- Does the headline pass the competitor test? (Would a competitor write this too? If yes, rewrite.)
- Do the 3 testimonials feel like 3 different real people, not 3 outputs of the same model?
- Would the brief's target customer nod at every line, or roll their eyes?

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

Generate the theme as ${direction.name}.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    temperature: direction.temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.trim() || '{}');
}

function validateVariant(v: any): { valid: boolean; reasons: string[] } {
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

    // Auth + per-user daily rate limit. Each call here is two parallel
    // Claude requests, so it counts toward the same ai_usage budget as
    // brand-brief.
    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    const limited = await bumpAiUsage(supabase, userOrResponse.id);
    if (limited) return limited;

    const { brief, businessName, industry, userProvidedServices } = await request.json();
    if (!brief || !businessName || !industry) {
      return NextResponse.json({ error: 'brief, businessName, industry required' }, { status: 400 });
    }

    const canonical = normalizeIndustry(industry);
    const services = userProvidedServices || '';

    console.log('[generate-variants] Generating 2 variants in parallel', { canonical, hasUserServices: !!services });
    let [variantA, variantB] = await Promise.all([
      generateVariant(brief, businessName, industry, canonical, services, VARIANT_DIRECTIONS[0]),
      generateVariant(brief, businessName, industry, canonical, services, VARIANT_DIRECTIONS[1]),
    ]);

    const valA = validateVariant(variantA);
    const valB = validateVariant(variantB);

    if (!valA.valid) {
      console.warn('[generate-variants] Variant A failed, regenerating:', valA.reasons);
      variantA = await generateVariant(brief, businessName, industry, canonical, services, VARIANT_DIRECTIONS[0]);
    }
    if (!valB.valid) {
      console.warn('[generate-variants] Variant B failed, regenerating:', valB.reasons);
      variantB = await generateVariant(brief, businessName, industry, canonical, services, VARIANT_DIRECTIONS[1]);
    }

    return NextResponse.json({ success: true, variants: [variantA, variantB] });
  } catch (error: any) {
    console.error('[generate-variants] Error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
