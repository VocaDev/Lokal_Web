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
import { emitProgress } from '@/lib/ai-progress';
import { contrastRatio, ensureReadableTextColor, relativeLuminance } from '@/lib/utils';

export const maxDuration = 120;

const THEME_MODEL = process.env.THEME_GENERATION_MODEL || 'claude-haiku-4-5';

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
      artDirection: {
        type: 'object',
        additionalProperties: false,
        properties: {
          heroPhotoCaption: { type: 'string' },
          storyPhotoCaption: { type: 'string' },
        },
        required: ['heroPhotoCaption', 'storyPhotoCaption'],
      },

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
      'artDirection',
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

// Returns the per-section layout instruction the system prompt embeds.
// 'ai' means the AI picks freely from the listed options. Anything else is
// the user's explicit choice and MUST be respected verbatim.
function layoutInstruction(section: 'hero' | 'story' | 'services' | 'gallery', userPick: string): string {
  if (userPick && userPick !== 'ai') {
    return `${section.toUpperCase()} LAYOUT — LOCKED BY USER: '${userPick}'. You MUST output this exact layout value in the ${section} section. Do not pick a different one.`;
  }
  // AI free choice. Provide the catalog + a short decision tree per section.
  switch (section) {
    case 'hero':
      return `HERO LAYOUT — AI free choice. Options: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'asymmetric'. Pick by brief:
- "traditional" / "family-owned" / "long history" / "since YYYY"  →  'editorial' (newspaper-feel)
- "bold" / "modern" / "disruptive" / "no-bullshit"               →  'asymmetric' or 'fullbleed'
- "minimal" / "precise" / "quiet" / "refined"                    →  'centered'
- "warm" / "approachable" / "neighborly"                         →  'split'
Do NOT default to 'fullbleed' unless the brief demands it.`;
    case 'story':
      return `STORY LAYOUT — AI free choice. Options: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote'. Pick by brief:
- Single founder / single defining moment       →  'centered-quote'
- Multiple defining traits / multifaceted        →  'two-column'
- Rich narrative, history, specifics             →  'long-form'
- One quotable phrase captures everything        →  'pull-quote'`;
    case 'services':
      return `SERVICES LAYOUT — AI free choice. Options: 'list' | 'grid-2' | 'grid-3' | 'editorial-rows' | 'cards'. Pick by brief AND photo state:
- User has services photos → STRONGLY prefer 'cards' or 'grid-3'
- No photos + brief "editorial / traditional / long history" → 'editorial-rows'
- No photos + brief "minimal / refined / quiet" → 'list'
- No photos + brief "bold / energetic" → 'grid-2'
- DEFAULT → 'cards'`;
    case 'gallery':
      return `GALLERY LAYOUT — AI free choice. Options: 'masonry' | 'grid-uniform' | 'showcase' | 'strip'. Pick by feel:
- "calm / curated" → 'showcase' or 'strip'
- "rich / abundant" → 'masonry' or 'grid-uniform'`;
  }
}

function sectionsBriefing(
  heroLayout: string,
  storyLayout: string,
  servicesLayout: string,
  galleryLayout: string,
): string {
  return `
THIS IS HOW SECTIONS WORK:

You output a sections[] array. Each section has a 'kind' and parameters specific to that kind. The renderer composes the page from these — you are NOT picking from a fixed catalog of designs.

REQUIRED SECTIONS (in this exact order):
1. hero
2. services
3. story
4. gallery (only if relevant — see below)
5. footer

Total sections: 4 to 5 (gallery is optional).

ABSOLUTELY NO testimonials section. NO FAQ section. Do not output them.

HERO PARAMETERS (kind: 'hero'):
- layout: see HERO LAYOUT instruction below — respect any user lock
- imageStyle: 'photo' | 'gradient' | 'pattern' | 'none' (PREFER 'photo' unless the brief explicitly demands type-first)
- metadataBar: true to show top metadata bar — primarily for 'editorial'
- headlinePosition: 'top' | 'center' | 'bottom-left' | 'bottom-right' | 'left' | 'right'
- ctaCount: 0 | 1 | 2
- decorativeElement: 'none' | 'rule' | 'number' | 'glyph'

${layoutInstruction('hero', heroLayout)}

SERVICES PARAMETERS (kind: 'services'):
- layout: see SERVICES LAYOUT instruction below — respect any user lock
- showPrices: true if prices visible
- showDuration: true if durations shown
- divider: 'none' | 'line' | 'number'
- intro: optional intro paragraph
- items: array of services with name, description, price (number), durationMinutes (number)

${layoutInstruction('services', servicesLayout)}

STORY PARAMETERS (kind: 'story'):
- layout: see STORY LAYOUT instruction below — respect any user lock
- body: text content
- attribution: optional, for centered-quote
- LENGTH CAP: The story body MUST be 2-3 short paragraphs maximum, ~120 words total. Each paragraph one specific point. The story is always tight. Cut prose, never pad.

${layoutInstruction('story', storyLayout)}

GALLERY PARAMETERS (kind: 'gallery'):
- layout: see GALLERY LAYOUT instruction below — respect any user lock
- caption: optional caption above gallery

${layoutInstruction('gallery', galleryLayout)}

FOOTER PARAMETERS (kind: 'footer'):
- layout: 'centered' | 'three-column' | 'editorial' | 'minimal'
- tagline: optional short closing line

THE GAME: pick parameter combinations the brief actually NEEDS. Two businesses with the same industry but different briefs SHOULD produce different combinations. Don't default to safe choices when the user left a layout on 'AI free choice'.`;
}

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

function industryVoiceFor(canonicalIndustry: string): string {
  const voices: Record<string, string> = {
    barbershop: `BARBERSHOP VOICE PATTERNS:
- Speak like a regular, not a marketer. "I've been coming here for years" beats "high-quality service".
- Specifics over superlatives: "the warm towel before the shave" not "premium grooming experience".
- Permission to be terse. Sentence fragments are fine. Periods are friends.
- Avoid: "barber pole tradition", "old-school", "barber craft" — overused.`,
    restaurant: `RESTAURANT VOICE PATTERNS:
- Talk about food the way a regular orders it, not the way a menu describes it. "Get the lamb. Always the lamb." beats "Tender braised lamb shoulder".
- Family is a verb here. So is welcome. So is wait — ten years, three years, last Sunday.
- Specifics: dishes by name, days of the week, names of people.
- Avoid: "culinary journey", "farm to table", "passion for cooking" — overused.`,
    clinic: `CLINIC VOICE PATTERNS:
- Trust comes from precision, not warmth. Wait times. Years of practice. Equipment models. Foreign degrees.
- Avoid medical drama. No "miracle". No "transformative". No "your health journey".
- Calm authority. The kind of doctor who doesn't oversell.
- Avoid: "compassionate care", "your health is our priority", "advanced technology" — generic.`,
    beauty_salon: `BEAUTY SALON VOICE PATTERNS:
- Talk like a stylist, not a beauty magazine. "She listens before she cuts" beats "personalized consultation".
- Specifics: who comes, when (bridal in May, prom in March, the regular Tuesday client).
- Sensory details: the smell, the music, what you walk out feeling.
- Avoid: "self-care", "pamper yourself", "luxurious experience" — overused.`,
    gym: `GYM VOICE PATTERNS:
- Direct. Short. No motivational poster language.
- Specifics: equipment, hours, who actually trains here. Not "elevate your fitness".
- Honesty: "this isn't an Instagram gym" beats "premium training experience".
- Avoid: "transform your body", "fitness journey", "sweat is the new sexy" — embarrassing.`,
    other: `GENERAL VOICE PATTERNS:
- Specific over general. Years over "experienced". A name over "our team". A neighborhood over "the city".
- The owner's voice, not a brochure's voice.
- If you wouldn't say it to someone in person, don't write it.`,
  };
  return voices[canonicalIndustry] || voices.other;
}

type GenerateThemeArgs = {
  brief: any;
  businessName: string;
  industry: string;
  city: string;
  uniqueness: string;
  businessDescription: string;
  // Per-section layout picks. 'ai' = AI free choice; any other value forces
  // that exact layout in the post-processor.
  heroLayout: string;
  storyLayout: string;
  servicesLayout: string;
  galleryLayout: string;
  mood: string;
  brandPrimary?: string;
  brandAccent?: string;
  fontPersonality: string;
  language: string;
  tone: string;
  userProvidedServices: string;
  canonicalIndustry: Industry;
  userHasGalleryPhotos: boolean;
  userHasServicePhotos: boolean;
  regenSeed?: string;
};

async function generateTheme(args: GenerateThemeArgs) {
  const {
    brief, businessName, industry, city, uniqueness, businessDescription,
    heroLayout, storyLayout, servicesLayout, galleryLayout,
    mood, brandPrimary, brandAccent,
    fontPersonality, language, tone, userProvidedServices,
    canonicalIndustry, userHasGalleryPhotos, userHasServicePhotos, regenSeed,
  } = args;

  const definingTraits = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(', ')
    : String(brief.definingTraits ?? '');

  const traitsForVoiceCheck = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(' / ')
    : String(brief.definingTraits ?? '');

  const systemPrompt = `You are a senior designer translating a brand strategy brief into a unique website. The user has made specific layout choices for each section — some they locked, some they left to you. Respect every locked layout exactly; for the rest, pick what best serves the brief.

CRITICAL OUTPUT RULES:
- Service prices MUST be integers (number type) ONLY when the offering is actually sold per item/session. Use the midpoint if a range is intended. Example: 25 not "20-30 Eur".
- Do NOT invent prices for public/free/non-commercial offerings (public universities, state schools, municipal programs, NGOs, free events). Set showPrices=false and omit price on every item.
- durationMinutes is ONLY for appointment-like services measured in minutes. Academic programs, memberships, subscriptions, events, courses, degree programs, and long-running offerings must NOT use durationMinutes. If duration matters, use durationLabel as text, e.g. "3-4 years", "semester-based", "monthly", "8 weeks".
- Output ONLY raw JSON — no markdown code fences, no explanation, no backticks.

USER'S STRUCTURAL CHOICES (each section is either user-locked or AI free choice — see per-section instructions below in the SECTIONS block).

Mood: ${mood}
${moodDirective(mood, brandPrimary, brandAccent)}

CRITICAL CONTRAST RULE:
The textColor and bgColor MUST have WCAG AA contrast (luminance ratio ≥ 4.5:1).
This means: if bgColor is light (cream, off-white, pastel), textColor MUST be near-black.
If bgColor is dark, textColor MUST be near-white.
NEVER pick a textColor whose luminance is similar to bgColor — even if the mood feels "elegant" or "subtle." Cream text on a cream background is a critical failure: the visitor literally cannot read the page.
Same rule applies to mutedTextColor against bgColor (≥ 3:1 minimum).

Font personality: ${fontPersonality}
${fontDirective(fontPersonality)}

Language: ${language}
Write all customer-facing copy in: ${languageInstruction(language)}

Tone: ${tone}
${toneDirective(tone)}

THE BRAND BRIEF IS THE CREATIVE BRIEF. The brief tells you what makes this business different — every section choice must REINFORCE it. But "reinforcement" doesn't mean "literal repetition." Creative interpretation is encouraged. If forced to choose between safe and distinctive, choose distinctive — provided the choice still serves the brief.

USER'S UNIQUENESS STATEMENT (gospel — reference this EVERYWHERE):
"${uniqueness || '(not provided — derive from positioning)'}"

If the user provided a uniqueness statement, it must appear (or be unmistakably echoed) in:
- The hero headline (or its subhead)
- The story body
- At least one decorative element justification

DEFINING TRAITS (also gospel):
${traitsForVoiceCheck}

VOICE CONSISTENCY CHECK — before outputting, verify:
At least TWO of the brief's defining traits appear (as words or close synonyms) in:
- The hero headline OR subheadline
- The story body
- The hero's decorativeElement reasoning (if 'rule' or 'number')

If you cannot honestly say "yes, those traits appear" — REWRITE.

ANTI-TEMPLATE RULE:

If your output resembles a typical template for this industry — typical hero, typical sections, typical headlines — you have failed. Specifically AVOID:
- "Welcome to [business name]"-style hero headlines
- Generic emotional tone that could fit any business
- Predictable section ordering (services → testimonials → contact)
- Safe color choices that match every site in this category
- Layouts that feel "industry default" rather than chosen

Each output should feel like a deliberate design decision for THIS specific brief — not a default that the AI fell into.

If two competitors in the same industry would receive a similar layout AND similar copy from your output, you have failed and must rewrite.

Produce THE WEBSITE THIS BUSINESS WOULD HAVE IF THEY HIRED A DESIGNER WHO READ THE BRIEF — not a generic site for the category.

STRUCTURAL INTERPRETATION RULE (applies ONLY to sections the user left as 'AI free choice' — locked layouts win):

The brief must influence STRUCTURE for any free-choice section:
- "Traditional / family-owned / long history" → editorial-style hero, restrained color
- "Bold / disruptive / no-bullshit" → asymmetric or fullbleed hero, high-contrast color
- "Emotional / craft-driven / personal" → centered hero, narrative-heavy story
- "Practical / efficient / no-frills" → split or centered hero, list-style services

Do NOT treat layout as independent from the brief on free-choice sections.

${sectionsBriefing(heroLayout, storyLayout, servicesLayout, galleryLayout)}

REALISTIC PRICING (Kosovo market, EUR):
- barbershop: €5-25 (haircut €8-12, fade €10-15, full package €20)
- restaurant: €4-15 menu items
- clinic: €25-80 consultations
- beauty_salon: €15-50
- gym: €10-40
- other: infer from the user's services and businessDescription. If the business is public/free/non-commercial, do not show prices.

THIS BUSINESS'S CANONICAL INDUSTRY: ${canonicalIndustry}
Appointment-like services should have realistic minute durations (15, 30, 45, 60, 90, 120 minutes). Non-appointment offerings should use durationLabel or no duration.

USER-PROVIDED SERVICES (gospel — build the services array around these):
${userProvidedServices || '(none provided — infer 3-5 representative offerings from the business description)'}

If the user listed services, every entry in the services section's items array MUST correspond to one of them. Do not invent unrelated services when the user has been specific.
If a user-provided service has no price or duration, do NOT invent a price or minute duration just to fill the schema. Omit missing fields and set showPrices/showDuration accordingly.

${industryVoiceFor(canonicalIndustry)}

${fewShotsFor(canonicalIndustry)}

HERO AND STORY ARE ABOUT THE BUSINESS, NOT THE SERVICE LIST:

The hero's headline, subheadline, and CTAs must be about THE BUSINESS — its category, its uniqueness, its position. They MUST NOT reduce the business to its specific service items.

If the user's businessDescription says "I teach programming and languages" and the services list contains "Python course, English B1 course," the hero must NOT say "Mëso Python dhe Anglisht me ne." It must speak to the BUSINESS — a learning institution offering a curriculum, of which Python and English are examples.

The SERVICES section is where specific services are listed. The HERO is where the business identity lives. Don't conflate them.

If the user provided no specific services in the wizard, generate a representative 3-5 services for the services section based on the businessDescription. Do NOT omit the services section.

ACADEMIC / PUBLIC INSTITUTION RULE:
If the business is a public university, state school, public education institution, or the description says programs are free, the services section represents programs/departments/offerings, not appointments. Set showPrices=false. Do not output euro prices. Set showDuration=true only if you use durationLabel values like "3-4 years" for Bachelor programs or "1-2 years" for Master programs. Never output "180 min" for degree programs.

ANTI-HALLUCINATION RULE — LITERAL TEXT FIELDS:

The following fields MUST contain the user's literal inputs, not invented variants:
- Any "metadata bar" text, eyebrow tag, top-of-hero label, or small text above the headline → MUST be the literal businessName in uppercase, OR the city name. Do NOT invent acronyms, brand codes, or shortened identifiers (e.g. "ONGO" from "Hana Coffee Lab" — wrong).
- Story attribution (e.g. "— ADELINË, MITROVICË") → MUST use the literal businessName or city. Do NOT invent founder names not provided by the user.

If you find yourself wanting to add a brand code or short label that wasn't in the user's input, STOP. Use the literal businessName instead.

ANTI-HALLUCINATION — FACTUAL CLAIMS:

You MUST NOT invent factual claims that the user did not provide. Specifically:
- Do NOT compare the business to "the average" or "the norm" with invented numbers (e.g. "while others wait 45 minutes, we wait 8" — only use the user's claim, not invented competitor stats).
- Do NOT invent founding dates, employee counts, customer counts, awards, certifications, or accreditations.
- Do NOT invent specific competitor behavior to compare against.
- The brand brief and the wizard inputs are the FULL set of facts. If a fact isn't there, you cannot include it.

If you find yourself wanting to add a "compared to others..." or "while typical X is 45 minutes..." or "since 1985" claim, STOP. Use only what the user provided.

BANNED PHRASES — if you use any in the customer-facing copy, you have failed:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

Also banned in body copy:
- Emoji in body text (don't use any)
- "Whether you're X or Y, we've got you covered"
- "We pride ourselves on..."
- Lorem ipsum

NEIGHBORHOODS for location references — Prishtinë: Arbëria, Dardania, Peyton, Qyteti i Ri, Ulpiana, Sunny Hill; Prizren: Shadërvan; Pejë: Haxhi Zeka.

ART DIRECTION FOR PHOTOS:
This site has 2 photo slots: a hero photo and a story/about photo. The user uploads their own photos later — but you MUST suggest what KIND of photo would fit each slot.

Output an artDirection object with these two strings:
- heroPhotoCaption: a single sentence describing the ideal hero photo. NOT generic ("a barber's chair") — specific and atmospheric ("the empty barber chair facing the morning light from the front window, before the first customer arrives").
- storyPhotoCaption: same but for the story/about section. Pick a different angle ("the owner's hands sharpening a straight razor", or "the back of the shop where the regulars sit and wait").

Write captions in: ${languageInstruction(language)}.

BEFORE OUTPUTTING — run these specific checks:

1. SAME-INDUSTRY TEST: Could a competitor in the same industry receive this exact output (layout AND copy)?
   If yes → REWRITE the headline AND change at least one structural parameter.

2. LITERAL-INPUT TEST: Search your output for any text label, eyebrow, brand code, or attribution that isn't the literal businessName or city.
   If you invented something (e.g. an acronym, a code, a founder name) → REPLACE with the literal user input.

3. STRUCTURAL DECISION TEST: For every section the user left as 'AI free choice', did the brief actually influence your layout pick, or did you default?
   If you defaulted to safe choices ('fullbleed' hero, 'long-form' story, 'cards' services) without justification from the brief → PICK DIFFERENTLY.
   For sections the user locked, you have NO discretion — output the locked layout exactly.

4. UNIQUENESS PRESENCE TEST: Search your output for the user's uniqueness statement (or its key phrases).
   If you cannot find it echoed in any section → REWRITE the hero or story to incorporate it.

5. STORY LENGTH TEST: Count the words in your story body.
   If over 130 words → CUT until under 120.

6. BANNED PHRASE SWEEP: Scan character by character.
   If any banned phrase appears → REPLACE.

7. FABRICATION TEST: Search your output for any specific number, date, or comparative claim (e.g. "45 minutes", "since 1987", "compared to others", "the only one in [city]").
   For each one: was this number/date/claim in the brief or user inputs? If you cannot point to where it came from → REMOVE it.

Output JSON only after all 7 checks pass.

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
- Business description (user's own words, primary scope signal): ${businessDescription || '(not provided)'}
${mood === 'custom' ? `- BRAND COLORS (LOCKED): primary=${brandPrimary}, accent=${brandAccent}` : ''}

USER-PROVIDED SERVICES (may be empty — that's fine):
${userProvidedServices || '(none provided — infer 3-5 representative services from the business description)'}

If services were provided, the services section MUST list them faithfully (don't change names or invent new ones). If none were provided, generate 3-5 representative services that fit the business description. Do not invent prices or minute durations for non-appointment offerings.

USER HAS UPLOADED GALLERY PHOTOS: ${userHasGalleryPhotos ? 'YES — you MUST include a gallery section' : 'No — gallery section is optional'}
USER HAS UPLOADED SERVICE PHOTOS: ${userHasServicePhotos ? 'YES — services should be designed knowing photos will appear' : 'No — services may be type-only'}

${regenSeed ? `REGENERATION ATTEMPT — produce a notably DIFFERENT direction than the previous result. Pick different layout combinations. Pick different copy angles. Different decorative elements. The brief is the same — your interpretation must shift. (seed: ${regenSeed})` : ''}

Generate the theme.`;

  const response = await anthropic.messages.create({
    model: THEME_MODEL,
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

// ----------------------------------------------------------------
// Post-processor — runs after Haiku returns. Forces deterministic shape.
// ----------------------------------------------------------------

interface WizardServiceInput {
  name?: string;
  price?: string | number;
  duration?: string | number;
  durationMinutes?: string | number;
}

interface PostProcessCtx {
  // Per-section user picks. 'ai' = leave AI's choice; specific value = force it.
  heroLayout: string;
  storyLayout: string;
  servicesLayout: string;
  galleryLayout: string;
  userHasServicePhotos: boolean;
  userHasGalleryPhotos: boolean;
  language: string;
  wizardServices: WizardServiceInput[];
  businessDescription: string;
  industry: string;
  businessName: string;
  uniqueness: string;
  city: string;
}

function nonEmptyString(v: any): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : '';
}

// Coerce a wizard-supplied price/duration (which may be string or number)
// to an integer. Returns undefined when the input is missing or not numeric,
// so the caller can keep the AI's value rather than zeroing it.
function coerceInt(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

function academicDurationLabel(name: string): string {
  const lower = name.toLowerCase();
  if (/\bmaster\b|msc|m\.sc|\bma\b/.test(lower)) return '1-2 years';
  if (/\bbachelor\b|bsc|b\.sc|\bba\b/.test(lower)) return '3-4 years';
  return 'multi-year program';
}

function isPublicAcademicContext(ctx: PostProcessCtx): boolean {
  const haystack = [
    ctx.businessName,
    ctx.industry,
    ctx.businessDescription,
    ctx.uniqueness,
    ...ctx.wizardServices.map(s => s.name ?? ''),
  ].join(' ').toLowerCase();

  const hasAcademicSignal =
    /universit|university|college|faculty|fakultet|school|shkoll|academy|akademi|bachelor|master|degree|program/.test(haystack);
  const hasPublicFreeSignal =
    /public|publik|state|shtet|free|falas|tuition-free|pa pages|komunal|municipal/.test(haystack);

  return hasAcademicSignal && hasPublicFreeSignal;
}

function reorderSections(sections: any[]): any[] {
  // Fixed standard order: hero -> services -> story -> gallery -> footer.
  // The user's per-section layout picker replaces the old sectionPriority
  // input, so the macro-ordering can be deterministic.
  const hero = sections.find(s => s.kind === 'hero');
  const footer = sections.find(s => s.kind === 'footer');
  const services = sections.find(s => s.kind === 'services');
  const story = sections.find(s => s.kind === 'story');
  const gallery = sections.find(s => s.kind === 'gallery');

  const result: any[] = [];
  if (hero) result.push(hero);
  if (services) result.push(services);
  if (story) result.push(story);
  if (gallery) result.push(gallery);
  if (footer) result.push(footer);
  return result;
}

function postProcessTheme(theme: any, ctx: PostProcessCtx): any {
  let sections: any[] = (theme?.sections ?? []).filter(Boolean);
  const publicAcademic = isPublicAcademicContext(ctx);

  // 1. Strip section types we never render.
  sections = sections.filter(s => s?.kind !== 'testimonials' && s?.kind !== 'faq');

  // 2. Force a gallery section if the user uploaded gallery photos but the
  //    AI didn't include one. Default to user-locked layout when present,
  //    'masonry' otherwise.
  const hasGallery = sections.some(s => s?.kind === 'gallery');
  if (ctx.userHasGalleryPhotos && !hasGallery) {
    const lockedGallery = ctx.galleryLayout && ctx.galleryLayout !== 'ai'
      ? ctx.galleryLayout
      : 'masonry';
    sections.push({
      kind: 'gallery',
      layout: lockedGallery,
      caption: undefined,
    });
  }

  // 3. Wizard's structured service inputs are authoritative for name / price /
  //    duration. Sonnet sometimes invents prices that don't match what the
  //    user typed — overlay the wizard values onto the AI items by index.
  if (ctx.wizardServices.length > 0) {
    sections = sections.map(s => {
      if (s?.kind !== 'services') return s;
      const aiItems: any[] = Array.isArray(s.items) ? s.items : [];
      const items = aiItems.map((aiSvc, i) => {
        const userSvc = ctx.wizardServices[i];
        if (!userSvc) return aiSvc;
        const overlaid = { ...aiSvc };
        if (userSvc.name && userSvc.name.trim().length > 0) {
          overlaid.name = userSvc.name.trim();
        }
        const userPrice = coerceInt(userSvc.price);
        if (userPrice !== undefined) {
          overlaid.price = userPrice;
        } else {
          delete overlaid.price;
        }
        const userDuration = coerceInt(userSvc.duration ?? userSvc.durationMinutes);
        if (userDuration !== undefined) {
          overlaid.durationMinutes = userDuration;
          delete overlaid.durationLabel;
        } else {
          delete overlaid.durationMinutes;
        }
        return overlaid;
      });
      const anyUserPrice = ctx.wizardServices.some(svc => coerceInt(svc.price) !== undefined);
      const anyUserDuration = ctx.wizardServices.some(svc => coerceInt(svc.duration ?? svc.durationMinutes) !== undefined);
      return { ...s, showPrices: anyUserPrice, showDuration: anyUserDuration, items };
    });
  }

  if (publicAcademic) {
    sections = sections.map(s => {
      if (s?.kind !== 'services') return s;
      const items = Array.isArray(s.items)
        ? s.items.map((item: any) => {
            const next = { ...item };
            delete next.price;
            delete next.durationMinutes;
            next.durationLabel = nonEmptyString(next.durationLabel) || academicDurationLabel(nonEmptyString(next.name));
            return next;
          })
        : s.items;
      return { ...s, showPrices: false, showDuration: true, items };
    });
  }

  // 4. WCAG AA contrast on the text/bg pair. If Sonnet generated cream-on-cream
  //    or similar, force-correct the textColor to near-black or near-white.
  if (theme.textColor && theme.bgColor) {
    const corrected = ensureReadableTextColor(theme.textColor, theme.bgColor);
    if (corrected !== theme.textColor) {
      console.warn('[generate-variants] textColor/bgColor contrast failed, correcting:', {
        original: theme.textColor,
        bg: theme.bgColor,
        corrected,
      });
      theme.textColor = corrected;
    }
  }
  if (theme.mutedTextColor && theme.bgColor) {
    // Muted text uses a lower 3:1 floor (still readable, but allowed to be
    // softer than primary body text). On failure, pick a softer-than-extremes
    // grey on the appropriate side of the bg.
    const cr = contrastRatio(theme.mutedTextColor, theme.bgColor);
    if (cr < 3.0) {
      const before = theme.mutedTextColor;
      theme.mutedTextColor = relativeLuminance(theme.bgColor) > 0.5 ? '#5a5a5a' : '#a8a8a8';
      console.warn('[generate-variants] mutedTextColor contrast failed, correcting:', {
        original: before,
        bg: theme.bgColor,
        corrected: theme.mutedTextColor,
      });
    }
  }

  // 5. Hero must have non-empty content + at least one CTA. Sonnet
  //    occasionally emits empty `headline` / `subheadline` strings (especially
  //    on "elegant" / "cool" / sparse moods, which it interprets as
  //    "minimalist = empty"). An empty <h1> renders as a 0px element — the
  //    visitor sees a blank section. Backfill with the user's own inputs so
  //    the hero is never void.
  const fallbackCta = ctx.language === 'en' ? 'Get in touch' : 'Na kontaktoni';
  const fallbackHeadline = nonEmptyString(ctx.uniqueness) || ctx.businessName;
  const fallbackSubheadline = ctx.businessName + (ctx.city ? ` — ${ctx.city}` : '');
  sections = sections.map(s => {
    if (s?.kind !== 'hero') return s;
    const ctaCount = typeof s.ctaCount === 'number' ? s.ctaCount : 0;
    return {
      ...s,
      headline: nonEmptyString(s.headline) || fallbackHeadline,
      subheadline: nonEmptyString(s.subheadline) || fallbackSubheadline,
      ctaCount: ctaCount > 0 ? ctaCount : 1,
      ctaPrimary: nonEmptyString(s.ctaPrimary) || fallbackCta,
    };
  });

  // 6. Lock user-chosen layouts. When the wizard picked a specific value
  //    (anything other than 'ai'), force it onto the AI's section so the
  //    rendered site matches what the user saw in the picker.
  sections = sections.map(s => {
    if (!s || typeof s.kind !== 'string') return s;
    if (s.kind === 'hero' && ctx.heroLayout && ctx.heroLayout !== 'ai') {
      return { ...s, layout: ctx.heroLayout };
    }
    if (s.kind === 'story' && ctx.storyLayout && ctx.storyLayout !== 'ai') {
      return { ...s, layout: ctx.storyLayout };
    }
    if (s.kind === 'services' && ctx.servicesLayout && ctx.servicesLayout !== 'ai') {
      return { ...s, layout: ctx.servicesLayout };
    }
    if (s.kind === 'gallery' && ctx.galleryLayout && ctx.galleryLayout !== 'ai') {
      return { ...s, layout: ctx.galleryLayout };
    }
    return s;
  });

  // 7. Final ordering — hero -> services -> story -> gallery -> footer.
  sections = reorderSections(sections);

  return { ...theme, sections };
}

// ----------------------------------------------------------------

function validateTheme(v: any): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allCopy = collectSectionCopy(v?.sections);

  for (const banned of BANNED_PHRASES) {
    if (allCopy.includes(banned.toLowerCase())) reasons.push(`Contains banned phrase: "${banned}"`);
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
      brief, businessName, industry, city, uniqueness, businessDescription,
      heroLayout, storyLayout, servicesLayout, galleryLayout,
      mood,
      brandPrimary, brandAccent, fontPersonality,
      language, tone, userProvidedServices, wizardServices, regenSeed,
      generationId, businessId,
    } = body;

    if (!brief || !businessName || !industry) {
      return NextResponse.json({ error: 'brief, businessName, industry required' }, { status: 400 });
    }

    // Optional progress streaming. The wizard passes generationId+businessId
    // and subscribes via Realtime; older callers that omit them still work.
    const canEmit = typeof generationId === 'string' && typeof businessId === 'string';
    const userId = userOrResponse.id;

    const canonical = normalizeIndustry(industry);

    // Look up uploaded photo slots so the prompt can be photo-aware and the
    // post-processor can force a gallery section.
    // Read-only query; gallery_items has a public-SELECT RLS policy
    // (migration 011) so user-scoped client is fine.
    let userHasGalleryPhotos = false;
    let userHasServicePhotos = false;
    if (typeof businessId === 'string' && businessId.length > 0) {
      const { data: galleryRows } = await supabase
        .from('gallery_items')
        .select('section_key')
        .eq('business_id', businessId);
      const rows = galleryRows ?? [];
      userHasGalleryPhotos = rows.some(r => r.section_key === 'gallery');
      userHasServicePhotos = rows.some(r => r.section_key === 'services');
    }

    const args: GenerateThemeArgs = {
      brief,
      businessName,
      industry,
      city: city || '',
      uniqueness: typeof uniqueness === 'string' ? uniqueness : '',
      businessDescription: typeof businessDescription === 'string' ? businessDescription : '',
      heroLayout: typeof heroLayout === 'string' && heroLayout ? heroLayout : 'ai',
      storyLayout: typeof storyLayout === 'string' && storyLayout ? storyLayout : 'ai',
      servicesLayout: typeof servicesLayout === 'string' && servicesLayout ? servicesLayout : 'ai',
      galleryLayout: typeof galleryLayout === 'string' && galleryLayout ? galleryLayout : 'ai',
      mood: mood || 'warm',
      brandPrimary,
      brandAccent,
      fontPersonality: fontPersonality || 'editorial',
      language: language || 'sq',
      tone: tone || 'friendly',
      userProvidedServices: userProvidedServices || '',
      canonicalIndustry: canonical,
      userHasGalleryPhotos,
      userHasServicePhotos,
      regenSeed,
    };

    console.log('[generate-variants] Generating parametric theme', {
      canonical, mood: args.mood,
      layouts: {
        hero: args.heroLayout,
        story: args.storyLayout,
        services: args.servicesLayout,
        gallery: args.galleryLayout,
      },
    });

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'designing_theme', status: 'started',
      });
    }

    const postProcessCtx: PostProcessCtx = {
      heroLayout: args.heroLayout,
      storyLayout: args.storyLayout,
      servicesLayout: args.servicesLayout,
      galleryLayout: args.galleryLayout,
      userHasServicePhotos,
      userHasGalleryPhotos,
      language: args.language,
      wizardServices: Array.isArray(wizardServices)
        ? (wizardServices as WizardServiceInput[])
        : [],
      businessDescription: args.businessDescription,
      industry: args.industry,
      businessName: args.businessName,
      uniqueness: args.uniqueness,
      city: args.city,
    };

    let theme = postProcessTheme(await generateTheme(args), postProcessCtx);

    if (canEmit) {
      // Mid-stream marker: Haiku finished generating, validation/finalize next.
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'writing_copy', status: 'progress',
      });
    }

    const validation = validateTheme(theme);
    if (!validation.valid) {
      console.warn('[generate-variants] Theme failed validation, regenerating once:', validation.reasons);
      const retry = postProcessTheme(
        await generateTheme({ ...args, regenSeed: `retry-${Date.now()}` }),
        postProcessCtx,
      );
      const retryValidation = validateTheme(retry);
      if (retryValidation.valid) {
        theme = retry;
      } else {
        console.warn('[generate-variants] Retry also invalid, returning best-effort:', retryValidation.reasons);
        theme = retry;
      }
    }

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'finalizing', status: 'completed',
      });
    }

    return NextResponse.json({ success: true, theme });
  } catch (error: any) {
    console.error('[generate-variants] Error:', error?.message || error);
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
            step: 'finalizing', status: 'error',
            message: error?.message || 'Theme generation failed',
          });
        }
      }
    } catch { /* swallowed */ }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
