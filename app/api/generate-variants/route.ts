/**
 * Stage 2: Theme Generator (parametric AI renderer)
 * Single Haiku call. Returns one theme whose core is a sections[] array of
 * parametric section descriptors (hero, services, story, gallery,
 * testimonials, faq, footer). DynamicSiteRenderer interprets those
 * parameters into a unique layout — no template picking.
 *
 * Route URL preserved (`/api/generate-variants`); response shape:
 *   { success: true, theme: { ...themeTokens, sections: AiSection[] } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { normalizeIndustry, type Industry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { parseModelJson } from '@/lib/json-extract';

export const maxDuration = 90;

const THEME_SCHEMA = {
  name: 'website_theme',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      // Theme tokens
      primaryColor: { type: 'string' },
      accentColor: { type: 'string' },
      bgColor: { type: 'string' },
      surfaceColor: { type: 'string' },
      textColor: { type: 'string' },
      mutedTextColor: { type: 'string' },
      borderColor: { type: 'string' },
      headingFont: { type: 'string', enum: ['dm-sans', 'playfair', 'inter', 'poppins', 'space-grotesk'] },
      bodyFont: { type: 'string', enum: ['dm-sans', 'inter', 'poppins'] },
      metaDescription: { type: 'string' },

      // The new core: parametric sections.
      // Schema is intentionally LOOSE on per-section fields — Haiku struggles
      // with deeply nested discriminated unions in strict mode. The TS types
      // in src/lib/types/customization.ts are the authoritative shape.
      sections: {
        type: 'array',
        minItems: 4,
        maxItems: 7,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['hero', 'services', 'story', 'gallery', 'testimonials', 'faq', 'footer'] },
            // Hero parameters
            layout: { type: 'string' },
            imageStyle: { type: 'string' },
            metadataBar: { type: 'boolean' },
            headlinePosition: { type: 'string' },
            ctaCount: { type: 'number' },
            headline: { type: 'string' },
            subheadline: { type: 'string' },
            ctaPrimary: { type: 'string' },
            ctaSecondary: { type: 'string' },
            metadataLeft: { type: 'string' },
            metadataRight: { type: 'string' },
            decorativeElement: { type: 'string' },
            // Services parameters
            showPrices: { type: 'boolean' },
            showDuration: { type: 'boolean' },
            divider: { type: 'string' },
            intro: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
            // Story parameters
            body: { type: 'string' },
            attribution: { type: 'string' },
            // Gallery parameters
            caption: { type: 'string' },
            // Footer parameters
            tagline: { type: 'string' },
          },
          required: ['kind'],
        },
      },
    },
    required: [
      'primaryColor', 'accentColor', 'bgColor', 'surfaceColor',
      'textColor', 'mutedTextColor', 'borderColor',
      'headingFont', 'bodyFont', 'metaDescription', 'sections',
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

const SECTIONS_BRIEFING = `
THIS IS HOW SECTIONS WORK:

You output a sections[] array. Each section has a 'kind' and parameters specific to that kind. The renderer interprets each section freely — you are NOT picking from a fixed list of designs. You are DESCRIBING a unique layout.

Required: at least one 'hero' and one 'services' section. Footer optional but recommended.
Order: the order in the array IS the page order from top to bottom.

HERO PARAMETERS (kind: 'hero'):
- layout: 'centered' (everything stacked center) | 'split' (50/50 image+text) | 'fullbleed' (image fills, text overlaid) | 'editorial' (magazine: metadata bar + oversized headline + prose subhead) | 'asymmetric' (off-grid composition with deliberate negative space)
- imageStyle: 'photo' (use a hero gradient placeholder — the renderer fills with user's gallery later) | 'gradient' (pure color gradient) | 'pattern' (subtle pattern fill) | 'none' (no visual, type-first)
- metadataBar: true to show a top bar with metadata (issue number, location, etc.) — primarily for 'editorial' layouts
- headlinePosition: 'top' | 'center' | 'bottom-left' | 'bottom-right' | 'left' | 'right' — where the headline sits within the hero
- ctaCount: 0, 1, or 2 — how many call-to-action buttons
- decorativeElement: 'none' | 'rule' (horizontal line) | 'number' (large ghost number like '01') | 'glyph' (single decorative character)

SERVICES PARAMETERS (kind: 'services'):
- layout: 'list' (single column, name + price right-aligned) | 'grid-2' (2-column cards) | 'grid-3' (3-column cards) | 'editorial-rows' (one per row, with description) | 'cards' (heavy card style)
- showPrices: true if prices are visible to customers
- showDuration: true if durations are shown
- divider: 'none' | 'line' | 'number' (numbered like 01, 02, 03)
- intro: optional intro paragraph above the list

STORY PARAMETERS (kind: 'story'):
- layout: 'centered-quote' (one big quote in the middle) | 'two-column' (heading left, body right) | 'long-form' (paragraph block) | 'pull-quote' (callout phrase + supporting paragraph)
- body: the actual text
- attribution: optional, for the centered-quote layout

GALLERY PARAMETERS (kind: 'gallery'):
- layout: 'masonry' | 'grid-uniform' | 'showcase' (one large + thumbnails) | 'strip' (horizontal scroll)
- caption: optional caption above the gallery

TESTIMONIALS PARAMETERS (kind: 'testimonials'):
- layout: 'cards' (3 cards in a row) | 'single-quote' (one quote at a time) | 'rotating' (carousel) | 'wall' (4-6 quotes in a masonry)
- items: 3 testimonials, each with name + role + quote + rating

FAQ PARAMETERS (kind: 'faq'):
- layout: 'accordion' | 'two-column' (questions left, answers right) | 'inline' (Q+A flowing as paragraphs)
- items: 5 faq items

FOOTER PARAMETERS (kind: 'footer'):
- layout: 'centered' | 'three-column' | 'editorial' | 'minimal'
- tagline: optional short closing line

THE GAME: pick parameter combinations the user's brief actually NEEDS. Two businesses with the same industry but different briefs should produce different combinations.`;

function fewShotsFor(canonicalIndustry: string): string {
  const fewShots: Record<string, string> = {
    barbershop: `
HERO HEADLINE EXAMPLES — what GOOD looks like:
GOOD: "Qethje që flet për ty." / "Three chairs. Forty years." / "The last proper barbershop in Peyton."
TESTIMONIAL EXAMPLES:
GOOD: "Shkoj tek Arti që prej 3 vitesh. I vetmi vend ku nuk më lyp foto kur i shpjegoj si e dua."
GOOD: "My father brought me here when I was 8. Now I bring my son. Same chair."`,

    restaurant: `
HERO HEADLINE EXAMPLES — what GOOD looks like:
GOOD: "Tavolina jote të pret." / "Sunday lunch starts at 1. Stays until people leave."
GOOD: "Recetat e gjyshes. Furra që nga viti 1987."
TESTIMONIAL EXAMPLES:
GOOD: "Vij këtu për tavë kosi që nga koha e studimeve. Shija nuk ka ndryshuar."
GOOD: "We held our engagement dinner here. They remembered everyone's order the next time we came."`,

    clinic: `
HERO HEADLINE EXAMPLES:
GOOD: "Kujdes që e meriton, pa pritje." / "The clinic your family doctor sends their family to."
GOOD: "Konsultë sot. Përgjigje nesër."
TESTIMONIAL EXAMPLES:
GOOD: "Dr. Krasniqi më shpjegoi rezultatet pa frikësim. Hera e parë që dikush e bën."
GOOD: "The wait was 8 minutes. Came back the next month for my mother. Same."`,

    beauty_salon: `
HERO HEADLINE EXAMPLES:
GOOD: "Bukuria që ndien, jo që sheh." / "Forty minutes that change your week."
GOOD: "Stilistët që dëgjojnë para se të punojnë."
TESTIMONIAL EXAMPLES:
GOOD: "Hapur prej 2014. Klientet tona vijnë para dasmës — dhe pas saj."
GOOD: "She asked what kind of week I'd had before she touched my hair. That's the difference."`,

    gym: `
HERO HEADLINE EXAMPLES:
GOOD: "Pa filtra. Vetëm punë." / "No mirrors at the squat rack. There's a reason."
GOOD: "Hekuri është i njëjtë kudo. Njerëzit nuk janë."
TESTIMONIAL EXAMPLES:
GOOD: "Pa muzikë komerciale. Pa pasqyra dramatike. Vetëm hekur dhe njerëz që dinë çfarë po bëjnë."
GOOD: "I trained at three gyms before this one. The trainers here actually watch your form."`,

    other: `
HERO HEADLINE EXAMPLES — what GOOD looks like (across industries):
GOOD: "Diçka e bërë me dorë. Gjithçka tjetër është reklamë." (handcraft business)
GOOD: "The mechanic your father trusted. Same shop. Same name."
GOOD: "Eight years. One specialty. We don't do anything else."
TESTIMONIAL EXAMPLES:
GOOD: "Më ka rekomanduar kushëriri. Tani po e rekomandoj unë."
GOOD: "Three friends sent me here. They all said the same thing: you'll know it when you see it."`,
  };

  return fewShots[canonicalIndustry] || fewShots.other;
}

function heroDirective(hero: string): string {
  switch (hero) {
    case 'cinematic': return 'Full-bleed feel — dramatic background image or gradient, large headline. Cinematic and immersive.';
    case 'split': return '50/50 split — image on one side, text on the other. Balanced.';
    case 'centered': return 'Minimal centered — small label, big headline, brief subheadline. All centered. Lots of whitespace.';
    case 'editorial': return 'Magazine-style — metadata bar at top, oversized headline, prose-style subheadline. No image.';
    default: return '';
  }
}

function sectionPriorityDirective(priority: string): string {
  return `After the hero, the FIRST major section should be: ${priority}. Other sections follow in natural order.`;
}

function densityDirective(density: string): string {
  return density === 'sparse'
    ? 'Sparse and airy: shorter copy, fewer items per row, generous whitespace. Prefer "list" or "grid-2" for services.'
    : 'Rich and dense: longer copy, more items per row, tighter spacing, more sections. Prefer "cards" or "editorial-rows" for services.';
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

  const definingTraits = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(', ')
    : String(brief.definingTraits ?? '');

  const systemPrompt = `You are a senior designer translating a brand strategy brief into a unique website. The user has chosen specific structural direction. HONOR IT, but use it as creative input — not a recipe.

CRITICAL OUTPUT RULES:
- Service prices MUST be integers (number type). Use the midpoint if a range is intended. Example: 25 not "20-30 Eur".
- Output ONLY raw JSON — no markdown code fences, no explanation, no backticks.

USER'S STRUCTURAL CHOICES (creative input, not literal recipe):

Hero feel: ${hero}
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
Write all customer-facing copy in: ${languageInstruction(language)}

Tone: ${tone}
${toneDirective(tone)}

THE BRAND BRIEF IS GOSPEL. The brief tells you what makes this business different. Every section choice — every layout, every parameter, every word — must REINFORCE the brief. Generic outputs are failures. If two competitors in the same industry would get the same site from your output, you have failed.

UNIQUENESS DIRECTIVE:
You are designing for ONE specific business with ONE specific brief. Do not produce "a generic gym website" or "a generic clinic website." Produce THE WEBSITE THIS BUSINESS WOULD HAVE IF THEY HIRED A DESIGNER WHO READ THE BRIEF.

Two businesses with the same industry but different briefs SHOULD produce visibly different layouts. Use the section parameter freedom to make them different. Pick unusual combinations when the brief justifies them.

${SECTIONS_BRIEFING}

REALISTIC PRICING (Kosovo market, EUR):
- barbershop: €5-25 (haircut €8-12, fade €10-15, full package €20)
- restaurant: €4-15 menu items
- clinic: €25-80 consultations
- beauty_salon: €15-50
- gym: €10-40
- other: infer from the user's services

THIS BUSINESS'S CANONICAL INDUSTRY: ${canonicalIndustry}
Each service MUST have a realistic duration (15, 30, 45, 60, 90, 120 minutes).

USER-PROVIDED SERVICES (gospel — build the services array around these):
${userProvidedServices || '(none provided — infer 3-5 typical services for this industry)'}

If the user listed services, every entry in the services section's items array MUST correspond to one of them. Do not invent unrelated services when the user has been specific.

${fewShotsFor(canonicalIndustry)}

BANNED PHRASES — if you use any in the customer-facing copy, you have failed:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

Also banned in body copy:
- Emoji in body text (don't use any)
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
- Defining traits: ${definingTraits}
- Target customer: ${brief.targetCustomer}
- Voice: ${brief.voice}
- Cultural anchor: ${brief.culturalAnchor}

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- City: ${city}
${mood === 'custom' ? `- BRAND COLORS (LOCKED): primary=${brandPrimary}, accent=${brandAccent}` : ''}

${regenSeed ? `REGENERATION ATTEMPT — produce a notably DIFFERENT direction than the previous result. Pick different layout combinations. Pick different copy angles. Different decorative elements. The brief is the same — your interpretation must shift. (seed: ${regenSeed})` : ''}

Generate the theme.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 6000,
    temperature: 0.85,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseModelJson(text || '{}');
}

// Recursively scan section text fields for banned phrases.
function collectSectionCopy(sections: any[]): string {
  if (!Array.isArray(sections)) return '';
  const TEXT_FIELDS = ['headline', 'subheadline', 'body', 'intro', 'attribution', 'caption', 'tagline', 'metadataLeft', 'metadataRight', 'ctaPrimary', 'ctaSecondary'];
  const ITEM_TEXT_FIELDS = ['name', 'description', 'quote', 'role', 'question', 'answer'];

  const parts: string[] = [];
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    for (const field of TEXT_FIELDS) {
      if (typeof section[field] === 'string') parts.push(section[field]);
    }
    if (Array.isArray(section.items)) {
      for (const item of section.items) {
        if (!item || typeof item !== 'object') continue;
        for (const field of ITEM_TEXT_FIELDS) {
          if (typeof item[field] === 'string') parts.push(item[field]);
        }
      }
    }
  }
  return parts.join(' ').toLowerCase();
}

function validateTheme(v: any): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allCopy = collectSectionCopy(v?.sections);

  for (const banned of BANNED_PHRASES) {
    if (allCopy.includes(banned.toLowerCase())) reasons.push(`Contains banned phrase: "${banned}"`);
  }

  // Testimonial-quote-length check on the testimonials section, if present.
  const testimonialsSection = Array.isArray(v?.sections)
    ? v.sections.find((s: any) => s?.kind === 'testimonials')
    : null;
  if (testimonialsSection && Array.isArray(testimonialsSection.items) && testimonialsSection.items.length > 0) {
    const avg = testimonialsSection.items
      .reduce((s: number, t: any) => s + (t?.quote?.length || 0), 0) / testimonialsSection.items.length;
    if (avg < 40) reasons.push('Testimonials too short');
  }

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

    console.log('[generate-variants] Generating parametric theme', { canonical, hero: args.hero, mood: args.mood });
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
