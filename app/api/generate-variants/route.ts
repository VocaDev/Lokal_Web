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

function sectionsBriefing(userPriorityFirst: string): string {
  return `
THIS IS HOW SECTIONS WORK:

You output a sections[] array. Each section has a 'kind' and parameters specific to that kind. The renderer composes the page from these — you are NOT picking from a fixed catalog of designs.

REQUIRED SECTIONS (in this exact order, with one variation):
1. hero
2. ${userPriorityFirst}            ← driven by user's sectionPriority choice
3. The remaining of: services, story, gallery (in standard order, skipping the one used in #2)
4. footer

Total sections: 4 to 6 (depends on whether user has gallery photos).

ABSOLUTELY NO testimonials section. NO FAQ section. Do not output them.

HERO PARAMETERS (kind: 'hero'):
- layout: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'asymmetric'
- imageStyle: 'photo' | 'gradient' | 'pattern' | 'none' (PREFER 'photo' unless the brief explicitly demands type-first)
- metadataBar: true to show top metadata bar (issue number, location) — primarily for 'editorial'
- headlinePosition: 'top' | 'center' | 'bottom-left' | 'bottom-right' | 'left' | 'right'
- ctaCount: 0 | 1 | 2
- decorativeElement: 'none' | 'rule' | 'number' | 'glyph'

HERO LAYOUT DECISION TREE — pick based on the brief's defining traits:
- "traditional" / "family-owned" / "long history" / "since YYYY"  →  'editorial' (newspaper-feel)
- "bold" / "modern" / "disruptive" / "no-bullshit"               →  'asymmetric' or 'fullbleed'
- "minimal" / "precise" / "quiet" / "refined"                    →  'centered'
- "warm" / "approachable" / "neighborly"                         →  'split'
- DEFAULT (use sparingly):                                        →  'fullbleed'
Do NOT default to 'fullbleed' unless the brief actually demands it. Most briefs do not.

SERVICES PARAMETERS (kind: 'services'):
- layout: 'list' | 'grid-2' | 'grid-3' | 'editorial-rows' | 'cards'
- showPrices: true if prices visible
- showDuration: true if durations shown
- divider: 'none' | 'line' | 'number'
- intro: optional intro paragraph
- items: array of services with name, description, price (number), durationMinutes (number)

SERVICES LAYOUT DECISION TREE — pick based on the brief AND the user's photos:
- User has services photos uploaded? → STRONGLY prefer 'cards' or 'grid-3' (layouts that show images well)
- User does NOT have service photos + brief is "editorial / traditional / long history" → 'editorial-rows' (rich descriptions per row)
- User does NOT have service photos + brief is "minimal / refined / quiet" → 'list' (sparse, type-focused)
- User does NOT have service photos + brief is "bold / energetic" → 'grid-2' (balanced cards even without images)
- DEFAULT → 'cards' (most flexible)
The renderer adapts to whichever you pick. Don't default to the same layout.

STORY PARAMETERS (kind: 'story'):
- layout: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote'
- body: text content
- attribution: optional, for centered-quote
- LENGTH CAP: The story body MUST be 2-3 short paragraphs maximum, ~120 words total. Each paragraph one specific point. Density preferences may vary other section copy lengths, but the story is always tight. Cut prose, never pad.

STORY LAYOUT DECISION TREE:
- Brief emphasizes a single founder / single defining moment       →  'centered-quote'
- Brief has multiple defining traits / multifaceted positioning    →  'two-column'
- Brief is rich in narrative, history, specifics                   →  'long-form'
- Brief has one quotable phrase that captures everything           →  'pull-quote'

GALLERY PARAMETERS (kind: 'gallery'):
- layout: 'masonry' | 'grid-uniform' | 'showcase' | 'strip'
- caption: optional caption above gallery

If a gallery section appears in your output, pick the layout based on density:
- sparse  →  'showcase' (one large + thumbnails) or 'strip'
- dense   →  'masonry' or 'grid-uniform'

FOOTER PARAMETERS (kind: 'footer'):
- layout: 'centered' | 'three-column' | 'editorial' | 'minimal'
- tagline: optional short closing line

THE GAME: pick parameter combinations the brief actually NEEDS. Two businesses with the same industry but different briefs SHOULD produce different combinations. Use the decision trees above; do not default to safe choices.`;
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
  userHasGalleryPhotos: boolean;
  userHasServicePhotos: boolean;
  regenSeed?: string;
};

// Map the wizard's sectionPriority + photo state to the section that comes
// first after the hero. If the user picked 'gallery' but has no gallery
// photos, fall back to 'services' so we never demand a photo-less gallery.
function priorityToFirstSection(
  priority: string,
  userHasGalleryPhotos: boolean,
): 'services' | 'story' | 'gallery' {
  if (priority === 'story') return 'story';
  if (priority === 'gallery') return userHasGalleryPhotos ? 'gallery' : 'services';
  return 'services';
}

async function generateTheme(args: GenerateThemeArgs) {
  const {
    brief, businessName, industry, city, uniqueness,
    hero, sectionPriority, density, mood, brandPrimary, brandAccent,
    fontPersonality, language, tone, userProvidedServices,
    canonicalIndustry, userHasGalleryPhotos, userHasServicePhotos, regenSeed,
  } = args;

  const definingTraits = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(', ')
    : String(brief.definingTraits ?? '');

  const traitsForVoiceCheck = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(' / ')
    : String(brief.definingTraits ?? '');

  const userPriorityFirst = priorityToFirstSection(sectionPriority, userHasGalleryPhotos);

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

STRUCTURAL INTERPRETATION RULE:

The brief must influence not just copy but STRUCTURE:
- "Traditional / family-owned / long history" → editorial-style hero, story-prominent section ordering, restrained color
- "Bold / disruptive / no-bullshit" → asymmetric or fullbleed hero, services-prominent, high-contrast color
- "Emotional / craft-driven / personal" → centered hero, story-first ordering, narrative-heavy density
- "Practical / efficient / no-frills" → split or centered hero, services-first, sparse density

Do NOT treat layout as independent from the brief. The brief sets the structural mood AND the copy mood.

${sectionsBriefing(userPriorityFirst)}

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

${industryVoiceFor(canonicalIndustry)}

${fewShotsFor(canonicalIndustry)}

ANTI-HALLUCINATION RULE — LITERAL TEXT FIELDS:

The following fields MUST contain the user's literal inputs, not invented variants:
- Any "metadata bar" text, eyebrow tag, top-of-hero label, or small text above the headline → MUST be the literal businessName in uppercase, OR the city name. Do NOT invent acronyms, brand codes, or shortened identifiers (e.g. "ONGO" from "Hana Coffee Lab" — wrong).
- Story attribution (e.g. "— ADELINË, MITROVICË") → MUST use the literal businessName or city. Do NOT invent founder names not provided by the user.

If you find yourself wanting to add a brand code or short label that wasn't in the user's input, STOP. Use the literal businessName instead.

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

3. STRUCTURAL DECISION TEST: Did the brief actually influence your hero/story/density choices, or did you default?
   If you defaulted to safe choices ('fullbleed' hero, 'long-form' story, dense everywhere) without justification from the brief → PICK DIFFERENTLY.

4. UNIQUENESS PRESENCE TEST: Search your output for the user's uniqueness statement (or its key phrases).
   If you cannot find it echoed in any section → REWRITE the hero or story to incorporate it.

5. STORY LENGTH TEST: Count the words in your story body.
   If over 130 words → CUT until under 120.

6. BANNED PHRASE SWEEP: Scan character by character.
   If any banned phrase appears → REPLACE.

Output JSON only after all 6 checks pass.

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

interface PostProcessCtx {
  sectionPriority: 'services' | 'story' | 'gallery';
  density: 'sparse' | 'dense';
  userHasServicePhotos: boolean;
  userHasGalleryPhotos: boolean;
}

function reorderSections(sections: any[], priority: 'services' | 'story' | 'gallery'): any[] {
  // Standard order: hero, [user priority], [the others], footer
  const hero = sections.find(s => s.kind === 'hero');
  const footer = sections.find(s => s.kind === 'footer');
  const services = sections.find(s => s.kind === 'services');
  const story = sections.find(s => s.kind === 'story');
  const gallery = sections.find(s => s.kind === 'gallery');

  const result: any[] = [];
  if (hero) result.push(hero);

  // Priority-driven first content section
  const priorityOrder: ('services' | 'story' | 'gallery')[] = (() => {
    if (priority === 'services') return ['services', 'story', 'gallery'];
    if (priority === 'story') return ['story', 'services', 'gallery'];
    return ['gallery', 'services', 'story'];
  })();

  for (const k of priorityOrder) {
    if (k === 'services' && services) result.push(services);
    if (k === 'story' && story) result.push(story);
    if (k === 'gallery' && gallery) result.push(gallery);
  }

  if (footer) result.push(footer);
  return result;
}

function postProcessTheme(theme: any, ctx: PostProcessCtx): any {
  let sections: any[] = (theme?.sections ?? []).filter(Boolean);

  sections = sections.filter(s => s?.kind !== 'testimonials' && s?.kind !== 'faq');

  const hasGallery = sections.some(s => s?.kind === 'gallery');
  if (ctx.userHasGalleryPhotos && !hasGallery) {
    sections.push({
      kind: 'gallery',
      layout: ctx.density === 'sparse' ? 'showcase' : 'masonry',
      caption: undefined,
    });
  }

  sections = reorderSections(sections, ctx.sectionPriority);

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
      brief, businessName, industry, city, uniqueness,
      hero, sectionPriority, density, mood,
      brandPrimary, brandAccent, fontPersonality,
      language, tone, userProvidedServices, regenSeed,
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
      userHasGalleryPhotos,
      userHasServicePhotos,
      regenSeed,
    };

    console.log('[generate-variants] Generating parametric theme', { canonical, hero: args.hero, mood: args.mood });

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'designing_theme', status: 'started',
      });
    }

    const postProcessCtx: PostProcessCtx = {
      sectionPriority: (args.sectionPriority as 'services' | 'story' | 'gallery') || 'services',
      density: (args.density as 'sparse' | 'dense') || 'dense',
      userHasServicePhotos,
      userHasGalleryPhotos,
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
