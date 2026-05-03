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
import { normalizeIndustry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { parseModelJson } from '@/lib/json-extract';
import { emitProgress } from '@/lib/ai-progress';
import { contrastRatio, ensureReadableTextColor, relativeLuminance, generatePaletteFromBrandColors } from '@/lib/utils';
import { ARCHETYPES, isArchetypeKey, type ArchetypeKey } from '@/lib/archetypes';
import { BANNED_PHRASES } from '@/lib/banned-phrases';

export const maxDuration = 120;

const THEME_MODEL = process.env.THEME_GENERATION_MODEL || 'claude-haiku-4-5';

const THEME_SCHEMA = {
  name: 'website_theme',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      // archetypeChoice — only emitted when the user picked "AI vendos" in
      // Step 4. Server expands it to a palette + fonts in postProcess. Optional
      // because non-AI modes have the archetype pre-resolved server-side.
      archetypeChoice: { type: 'string' },
      // Theme tokens — OPTIONAL. The server overlays them from the resolved
      // archetype palette in postProcessTheme, so Sonnet's hex output (if
      // any) is overwritten. This eliminates the contrast-failure mode where
      // Sonnet invented cream-on-cream or similar.
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
    required: ['metaDescription', 'sections', 'artDirection'],
  },
};

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
  uniqueness: string,
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

PRE-HERO QUALITY CHECK — run this BEFORE writing any hero content:

1. HEADLINE LENGTH: Is the headline I'm planning 7 words or fewer?
   Hero typography renders LARGE — every extra word makes the visual heavier.
   Target: 3-5 words. Hard cap: 7 words.
   If over 7 → cut to the most essential part.

2. BANNED PHRASES: Does the headline contain any banned phrase?
   Check the list now before writing.

3. COMPETITOR TEST: Could a competitor in the same industry say
   the same headline without lying?
   If yes → it's generic. Start over with a different angle.

4. CUSTOMER PERSPECTIVE: Is the headline about what the CUSTOMER
   gets, feels, or avoids — or is it about what the BUSINESS does?
   If it's about the business → rewrite from the customer's perspective.

5. SUBHEADLINE TEST: Does the subheadline ADD new information,
   or just rephrase the headline in different words?
   If it rephrases → cut it or rewrite with a new angle.

The hero is the most important section. A bad hero loses the customer
in the first 3 seconds. It deserves the most deliberate choice.
Run all 5 checks before committing to any hero copy.

UNIQUENESS ANCHOR FOR HERO:
The user said their business is different because:
"${uniqueness || '(not provided — infer from brief positioning)'}"

Identify the IDEA in this claim. Forget the wording. Write the headline FROM
that idea, in fresh authentic Kosovo voice — not by quoting any of the user's
words. A Kosovar reader should immediately recognize the same SUBSTANCE as
the user's claim, but you should NOT be able to find their exact phrasing in
the headline. If you copied any 5+ word phrase from the user → REWRITE.
If the idea isn't communicated → also REWRITE.

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
- items: array of offerings with name, description, price only when applicable, and durationMinutes only for appointment-like services

${layoutInstruction('services', servicesLayout)}

UNIQUENESS ANCHOR FOR STORY:
The story section exists to EXPLAIN the uniqueness claim in human terms.
User's claim: "${uniqueness || '(not provided — use brief voice and culturalAnchor)'}"

Read the user's claim to understand WHY their business is different. Then
write the story from scratch, in Kosovar voice — never quoting the user's
phrasing. The user's wording is signal; your output is fresh prose.

The story body must answer: WHY is this claim true?
What is the human reality behind it? What is the proof?
If you copied any 5+ word phrase from the user's claim → REWRITE in your
own Kosovo voice.

STORY PARAMETERS (kind: 'story'):
- layout: see STORY LAYOUT instruction below — respect any user lock
- body: text content
- attribution: optional, for centered-quote

${layoutInstruction('story', storyLayout)}

GALLERY PARAMETERS (kind: 'gallery'):
- layout: see GALLERY LAYOUT instruction below — respect any user lock
- caption: optional caption above gallery

${layoutInstruction('gallery', galleryLayout)}

FOOTER PARAMETERS (kind: 'footer'):
- layout: 'centered' | 'three-column' | 'editorial' | 'minimal'
- tagline: optional short closing line`;
}

const THEME_STATIC_SYSTEM_PROMPT = `You are a senior designer translating a brand strategy brief into a unique website. Respect locked layout choices exactly; for AI-free sections, pick what best serves the brief.

CRITICAL OUTPUT RULES:
- Service prices MUST be integers (number type) ONLY when the offering is actually sold per item/session. Use the midpoint if a range is intended. Example: 25 not "20-30 Eur".
- Do NOT invent prices for public/free/non-commercial offerings (public universities, state schools, municipal programs, NGOs, free events). Set showPrices=false and omit price on every item.
- durationMinutes is ONLY for appointment-like services measured in minutes. Academic programs, memberships, subscriptions, events, courses, degree programs, and long-running offerings must NOT use durationMinutes. If duration matters, use durationLabel as text, e.g. "3-4 years", "semester-based", "monthly", "8 weeks".
- Output ONLY raw JSON — no markdown code fences, no explanation, no backticks.

CRITICAL CONTRAST RULE:
The textColor and bgColor MUST have WCAG AA contrast (luminance ratio ≥ 4.5:1).
This means: if bgColor is light (cream, off-white, pastel), textColor MUST be near-black.
If bgColor is dark, textColor MUST be near-white.
NEVER pick a textColor whose luminance is similar to bgColor — even if the mood feels "elegant" or "subtle." Cream text on a cream background is a critical failure: the visitor literally cannot read the page.
Same rule applies to mutedTextColor against bgColor (≥ 3:1 minimum).

THE BRAND BRIEF IS THE CREATIVE BRIEF. The brief tells you what makes this business different — every section choice must reinforce it. Creative interpretation is encouraged, provided the choice still serves the brief.

ANTI-TEMPLATE RULE:
- Avoid "Welcome to [business name]"-style hero headlines.
- Avoid generic emotional tone that could fit any business.
- Avoid safe color choices that match every site in the category.
- Avoid layouts that feel "industry default" rather than chosen.

CTA HONESTY RULE — every CTA button must map to a real action this site does:
The renderer wires hero CTA buttons to ONE of two actions ONLY:
  (1) opening the booking drawer (when bookingMethod allows it)
  (2) the contact handler (phone tel:/ WhatsApp)
There is no separate page to navigate to. There is no "browse" view.
Therefore CTAs that PROMISE navigation are forbidden — clicking them does
nothing the user expects. Forbidden phrasings include:
  "Shfleto programet" / "Shfleto" / "Browse programs" / "Browse"
  "Mëso më shumë" / "Learn more" / "Read more" / "Lexo më shumë"
  "Shih çmimet" / "View pricing" / "Discover more" / "Zbulo më shumë"
  "Vizito faqen" / "Visit the page"
Allowed CTAs are ONLY booking-style ("Rezervo termin", "Bëj rezervim",
"Cakto orarin", "Book appointment") or contact-style ("Na kontakto",
"Telefono", "Shkruan", "Get in touch", "Call us", "Message us").
If neither booking nor contact fits cleanly → ctaCount=0 (no buttons).
ONE honest CTA beats TWO fake ones. Per-request bookingMethod context will
narrow this further.

FIELD QUALITY RULES — caps, registers, and wrong/right examples for fields
that previously had no specific guidance. Apply these ON TOP of the section
parameter rules and the Kosovar copy register.

HERO SUBHEADLINE:
- Hard cap: 12 words. Target 6-9.
- Must add NEW information not in the headline. If it just rephrases →
  cut it (set to empty string) or rewrite with a fresh angle: a number,
  a place, a time, a named person, a tool, an outcome.

SERVICES SECTION INTRO (the optional 'intro' field):
- Optional. Default to OMITTING it (empty / unset).
- If present: 1 sentence, max 12 words. Must say something the service
  items themselves don't say.
- Forbidden as intro (templates that say nothing):
  "Ofrojmë shërbime të shumta."
  "Zgjedh shërbimin që të përshtatet."
  "Çka të duhet, e bëjmë."

SERVICE ITEM DESCRIPTIONS (items[].description):
- Hard cap: 16 words. Target 6-12.
- Must name a tool, ingredient, technique, time, or specific deliverable.
  Pure adjectives are forbidden.
- WRONG: "Shërbim cilësor për ju." / "Përvojë e personalizuar." / "Përfshin gjithçka."
- RIGHT (lavazh): "Trup, xhama, goma. Me dorë."
- RIGHT (barbershop): "Brisk i nxeht', krem n'fund. 40 minuta."
- RIGHT (clinic): "Konsultë e parë. Pyetje në fillim, jo recetë në fund."
- RIGHT (course): "8 javë. Një projekt real në fund."

GALLERY CAPTION:
- Optional. Default to OMITTING it (empty / unset).
- If present: 1 sentence, max 10 words. Names what the photos show
  concretely.
- Forbidden: "Galeria e punëve tona." / "Disa nga shërbimet që ofrojmë."
- Right: "Nga ora e parë e mëngjesit deri pas drekës."

FOOTER TAGLINE:
- Hard cap: 6 words. Target 3-5.
- Must be a single concrete claim — a year, a number, a place, a tool,
  or one specific defining trait. Rephrasing the headline → REWRITE.
- Right: "Tre karrige. Dyzet vjet." / "Te ne, n'Sunny Hill."
  / "Prej '99 n'Çarshi." / "Ju bëftë mirë."

metaDescription (top-level, SEO/preview text):
- 120-160 characters. Sentence-form Kosovar voice (NOT headline form).
- Must mention the city AND one specific concrete (number, year, place,
  or named offering).
- Forbidden: generic "shërbime cilësore për ju në [city]" patterns.
- Right: "Berber n'Çarshi prej '99. Tre karrige, prerje klasike, brisk
  dhe paketa për dasma. Hajde te ne ose ban telefon."

ANTI-TELL PATTERNS — five rules targeting the "elegant AI" signatures
that read polished but never natural. Apply to ALL copy (hero, services,
story, footer, metaDescription).

1. NO REPEATED FILLER. Any single phrase 3+ words long that appears in
   2+ sections is a template-tell. REWRITE one of them. (This generalizes
   the previous "siç duhet" rule from one phrase to all phrases.)

2. TRICOLONS — comma form banned, fragment form allowed.
   Comma-tricolons ("X, Y, dhe Z" / "X, Y, Z.") are an AI signature —
   elegant, never natural Kosovar. They are FORBIDDEN in: headline,
   subheadline, tagline, hero subheadline, story body, metaDescription.
   Two short sentences beat one elegant comma list.
   WRONG (banned everywhere): "Punojmë me dorë, me kohë dhe me kujdes."
   WRONG (banned in headline/tagline): "Saktësi, Vjenë, Pejë."
   RIGHT (everywhere): "Me dorë. Me kohë."

   CARVE-OUT — fragment form is fine for service item descriptions and
   item-listing contexts where naming 3 specifics is the WHOLE POINT.
   Period-separated fragments read as scannable spec lists, not as
   elegant-AI prose:
   OK in service description: "Trup. Xhama. Goma." (fragment-form list)
   OK in service description: "Aspirator. Shampoo. Parfum." (same)
   STILL BANNED in service description: "Trup, xhama, goma." (comma form)
   STILL BANNED in headline/tagline: any 3-item parallel form, comma OR
   fragment. Headlines must not be 3-item lists at all.

3. EM-DASH BUDGET. Hero, story body, and footer tagline get max ONE
   em-dash (—) each. Subheadline gets ZERO. More than one in any section
   reads as elegant-AI, not Kosovar speech.

4. NO PARALLEL STRUCTURE inside a section. When two consecutive sentences
   share the same syntactic shape, REWRITE one with a different shape.
   WRONG: "Punojmë me dorë. Lajm me dorë. Kujdesemi me dorë."
   RIGHT: "Lajm me dorë. Pa makineri, pa nxitim — secila makinë e veta."

5. NO ENGLISH-SHAPE SENTENCES. If translating the Albanian word-for-word
   produces grammatical English, the Albanian is too literal. Real
   Kosovar speech reorders, drops pronouns, uses fragments. REWRITE any
   sentence that translates cleanly into English without rearranging.
   WRONG: "Ne ofrojmë shërbim të personalizuar për çdo klient."
     (translates to clean English: "We offer personalized service for every
     customer.")
   RIGHT: "Çdo klient — të vetin." (no clean English equivalent without
     restructuring; sounds Kosovar.)

Produce THE WEBSITE THIS BUSINESS WOULD HAVE IF THEY HIRED A DESIGNER WHO READ THE BRIEF — not a generic site for the category.

REALISTIC PRICING (Kosovo market, EUR):
- barbershop: €5-25 (haircut €8-12, fade €10-15, full package €20)
- restaurant: €4-15 menu items
- clinic: €25-80 consultations
- beauty_salon: €15-50
- gym: €10-40
- other: infer from the user's services and businessDescription. If the business is public/free/non-commercial, do not show prices.

Appointment-like services should have realistic minute durations (15, 30, 45, 60, 90, 120 minutes). Non-appointment offerings should use durationLabel or no duration.

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
- Lorem ipsum

ART DIRECTION FOR PHOTOS:
This site has 2 photo slots: a hero photo and a story/about photo. The user uploads their own photos later — but you MUST suggest what KIND of photo would fit each slot.

Output an artDirection object with these two strings:
- heroPhotoCaption: a single sentence describing the ideal hero photo. NOT generic ("a barber's chair") — specific and atmospheric ("the empty barber chair facing the morning light from the front window, before the first customer arrives").
- storyPhotoCaption: same but for the story/about section. Pick a different angle ("the owner's hands sharpening a straight razor", or "the back of the shop where the regulars sit and wait").

BEFORE OUTPUTTING — run these specific checks:

1. SAME-INDUSTRY TEST: Could a competitor in the same industry receive this exact output (layout AND copy)?
   If yes → REWRITE the headline AND change at least one structural parameter.

2. LITERAL-INPUT TEST: Search your output for any text label, eyebrow, brand code, or attribution that isn't the literal businessName or city.
   If you invented something (e.g. an acronym, a code, a founder name) → REPLACE with the literal user input.

3. STRUCTURAL DECISION TEST: For every section the user left as 'AI free choice', did the brief actually influence your layout pick, or did you default?
   If you defaulted to safe choices ('fullbleed' hero, 'long-form' story, 'cards' services) without justification from the brief → PICK DIFFERENTLY.
   For sections the user locked, you have NO discretion — output the locked layout exactly.

4. UNIQUENESS PRESENCE TEST: Verify the IDEA of the user's uniqueness lives
   in the hero or story — by SUBSTANCE, not by phrase. A Kosovar reader
   should recognize the same claim. You should NOT be able to find the
   user's exact wording in your output.
   - If you find a 5+ word phrase copied verbatim from the user's
     uniqueness → REWRITE in your own Kosovo voice.
   - If the IDEA isn't communicated in either section → also REWRITE.

5. VOICE TRAIT TEST: At least TWO of the brief's defining traits must appear as words or close synonyms in the hero headline/subheadline or story body.
   If not → REWRITE.

6. STORY LENGTH TEST: Count the words in your story body.
   Target: 40-60 words. Hard cap: 80 words.
   If over 80 → CUT until under 60. Story must be scannable in under 10 seconds.
   Long story = scrolled past. Short story with one specific detail = remembered.

7. BANNED PHRASE SWEEP: Scan character by character.
   If any banned phrase appears → REPLACE.

8. FABRICATION TEST: Search your output for any specific number, date, or comparative claim (e.g. "45 minutes", "since 1987", "compared to others", "the only one in [city]").
   For each one: was this number/date/claim in the brief or user inputs? If you cannot point to where it came from → REMOVE it.

9. CONCRETE DETAIL CHECK: Each rendered section (hero, services intro,
   story, footer tagline, metaDescription) must contain at least ONE
   concrete anchor:
   - A specific NUMBER ("8 vite", "tri karrige", "30 minuta", "200 nuse")
   - A YEAR ("prej 2008", "n'87", "viti 1967")
   - A real PLACE name ("n'Sunny Hill", "te Shadërvani", "n'Çarshia e Madhe")
   - A specific TIME ("të dielen", "pas pune", "ora 8 e mëngjesit")
   - A named PERSON (only when provided as input — never invented)
   - A concrete physical DETAIL ("karrigia e gjyshit", "brisk i nxehtë",
     "furra që nga viti X")
   Pure-adjective sections are FORBIDDEN. If a section is exclusively
   abstractions ("kujdes", "cilësi", "përvojë", "atmosferë") → REWRITE
   one sentence to anchor on a concrete drawn from the brief or user inputs.

10. ANTI-TELL SCAN: Verify all 5 ANTI-TELL PATTERNS rules above:
    - Same 3+ word phrase in 2+ sections? → REWRITE one.
    - Comma-tricolons ("X, Y, dhe Z" / "X, Y, Z") anywhere in
      headlines/taglines/subheadline/story body/metaDescription?
      → REWRITE as period-separated fragments.
    - ANY 3-item parallel list (comma OR fragment form) in a HEADLINE
      or TAGLINE? → REWRITE — headlines must not be 3-item lists.
    - Service item descriptions: comma-tricolons forbidden, but
      "Trup. Xhama. Goma." fragment-form is FINE — do not flag it.
    - More than one em-dash in any single section (hero/story/footer)?
      → REWRITE.
    - Two consecutive sentences with the same syntactic shape inside any
      one section? → REWRITE one with a different shape.
    - Any sentence that translates cleanly word-for-word into grammatical
      English? → REWRITE in real Kosovar shape (drop pronoun, reorder,
      fragment).

Output JSON only after all 10 checks pass.

Output valid JSON matching this schema:
${JSON.stringify(THEME_SCHEMA.schema)}`;

function fewShotsFor(canonicalIndustry: string): string {
  switch (canonicalIndustry) {
    case 'courses':
    case 'education':
      return `
COURSE / EDUCATION BUSINESS — EXAMPLES OF STRONG OUTPUT:

HERO HEADLINE:
GOOD: "Mëso të programosh. Jo të kopjosh." (learn to code, not copy)
GOOD: "Shtatë javë. Nga zero në projektin e parë."
GOOD: "Gjuha angleze nuk mësohet. Praktikohet."
BAD: "Ofrojmë kurse cilësore për të gjithë" (generic)
BAD: "Mëso Python dhe Anglisht me ne" (reduces business to listed items)

STORY:
GOOD: "Kursi ynë nuk fillon me teorinë. Fillon me problemin e parë të vërtetë — diçka që nuk e di si ta zgjidhësh. Nga aty mëson. Grupe të vogla sepse pyetjet nuk bëhen kur ka 30 veta në dhomë."
AVOID: Listing all the languages/technologies you teach in the story. Story is about HOW you teach, not WHAT.

TESTIMONIAL:
GOOD: "Kisha frikë se ishte shumë vonë për të filluar. Pas tetë javëve, kompania ku aplikova më pyeti nëse kisha dy vjet përvojë."
GOOD: "Kurset e tjera kishin 50 studentë. Këtu ishim 6. Diferencën e ndieje çdo seancë."
`;

    case 'retail':
    case 'shop':
      return `
RETAIL / PRODUCT BUSINESS — EXAMPLES OF STRONG OUTPUT:

HERO HEADLINE:
GOOD: "Bërë me dorë. Shitur një herë." (handmade, sold once)
GOOD: "Produktet tona nuk gjenden askund tjetër."
GOOD: "Çdo copë ka historinë e vet."
BAD: "Shitim produkte cilësore me çmime të arsyeshme" (generic)

STORY:
GOOD: "Fillova në dhomën time. Materiali i parë erdhi nga Shkodra — lëkurë natyrale që nuk gjindej dot në Prishtinë. Sot çdo gjë bëhet me dorë, në të njëjtën dhomë, me të njëjtat duar."
AVOID: Listing your product catalog in the story section.

SERVICES SECTION — for retail, items are PRODUCTS not services:
- No duration field needed (set durationMinutes to 0 or omit)
- Price is per unit, not per session
- Description should describe the product, not a service experience

TESTIMONIAL:
GOOD: "E bleva si dhuratë për mikeshën. Tani edhe ajo ka porositur dy."
GOOD: "Pakoja erdhi brenda 24 orëve dhe ishte paketuar sikur ishte ari brenda."
`;

    case 'freelance':
    case 'freelancer':
      return `
FREELANCE / CREATIVE PROFESSIONAL — EXAMPLES OF STRONG OUTPUT:

HERO HEADLINE:
GOOD: "Dizajn që shitet. Jo dizajn që duket mirë."
GOOD: "Fotografoj momente. Jo produkte."
GOOD: "Shkruaj tekstin që bën njerëzit të blejnë."
BAD: "Ofroj shërbime profesionale dizajni" (sounds like a robot)

STORY:
GOOD: "Pesë vjet me agjenci. Largova veten sepse doja të di emrin e klientit, jo numrin e buxhetit. Tani punoj me tre klientë njëkohësisht, maksimum. Kështu di çfarë po bëj."
AVOID: Listing your tools and software. Nobody cares you use Figma.

SERVICES SECTION — frame as deliverables, not job descriptions:
GOOD: "Logo dhe identitet vizual" — "Tri koncepte, dy rishikime, skedarë gati për print dhe web."
BAD: "Ofrojmë shërbime dizajni grafik sipas nevojave tuaja"

TESTIMONIAL:
GOOD: "Dorëzoi para afatit dhe pa asnjë e-mail pas mesnatës."
GOOD: "E pyeta nëse mund ta ndryshonte pak. Sugjeroi diçka më të mirë."
`;

    case 'events':
    case 'event':
      return `
EVENT BUSINESS — EXAMPLES OF STRONG OUTPUT:

HERO HEADLINE:
GOOD: "Data: 14 Qershor. Vendi: ju e dini."
GOOD: "Çdo vit. Të njëjtat njerëz. Muzikë e re."
GOOD: "Bileta mbeten. Jo shumë."
BAD: "Organizojmë evente të paharrueshme" (every event says this)

STORY:
GOOD: "Filloi si mbrëmje me shokë. 40 veta. Viti tjetër erdhën 120. Ndaluam aty — 120 është numri i mirë ku të gjithë flasin me njëri-tjetrin."
AVOID: Generic "passion for events" language.

SERVICES SECTION — for events, items are TICKET TYPES or PACKAGES:
GOOD: "Biletë e zakonshme" — €15 — "Hyrje + program i plotë"
GOOD: "Tavolinë VIP" — €80 — "4 veta, pozicion i preferuar, shërbim i veçantë"

TESTIMONIAL:
GOOD: "Erdha vetëm. U largova me tre kontakte të reja dhe një idenë."
GOOD: "Organizimi i detajeve të vogla tregon që dikush me të vërtetë kujdeset."
`;

    case 'barbershop':
      return `
HERO HEADLINE EXAMPLES — what GOOD looks like:
GOOD: "Qethje që flet për ty." / "Three chairs. Forty years." / "The last proper barbershop in Peyton."
TESTIMONIAL EXAMPLES:
GOOD: "Shkoj tek Arti që prej 3 vitesh. I vetmi vend ku nuk më lyp foto kur i shpjegoj si e dua."
GOOD: "My father brought me here when I was 8. Now I bring my son. Same chair."`;

    case 'restaurant':
      return `
HERO HEADLINE EXAMPLES — what GOOD looks like:
GOOD: "Tavolina jote të pret." / "Sunday lunch starts at 1. Stays until people leave."
GOOD: "Recetat e gjyshes. Furra që nga viti 1987."
TESTIMONIAL EXAMPLES:
GOOD: "Vij këtu për tavë kosi që nga koha e studimeve. Shija nuk ka ndryshuar."
GOOD: "We held our engagement dinner here. They remembered everyone's order the next time we came."`;

    case 'clinic':
      return `
HERO HEADLINE EXAMPLES:
GOOD: "Kujdes që e meriton, pa pritje." / "The clinic your family doctor sends their family to."
GOOD: "Konsultë sot. Përgjigje nesër."
TESTIMONIAL EXAMPLES:
GOOD: "Dr. Krasniqi më shpjegoi rezultatet pa frikësim. Hera e parë që dikush e bën."
GOOD: "The wait was 8 minutes. Came back the next month for my mother. Same."`;

    case 'beauty_salon':
      return `
HERO HEADLINE EXAMPLES:
GOOD: "Bukuria që ndien, jo që sheh." / "Forty minutes that change your week."
GOOD: "Stilistët që dëgjojnë para se të punojnë."
TESTIMONIAL EXAMPLES:
GOOD: "Hapur prej 2014. Klientet tona vijnë para dasmës — dhe pas saj."
GOOD: "She asked what kind of week I'd had before she touched my hair. That's the difference."`;

    case 'gym':
      return `
HERO HEADLINE EXAMPLES:
GOOD: "Pa filtra. Vetëm punë." / "No mirrors at the squat rack. There's a reason."
GOOD: "Hekuri është i njëjtë kudo. Njerëzit nuk janë."
TESTIMONIAL EXAMPLES:
GOOD: "Pa muzikë komerciale. Pa pasqyra dramatike. Vetëm hekur dhe njerëz që dinë çfarë po bëjnë."
GOOD: "I trained at three gyms before this one. The trainers here actually watch your form."`;

    case 'other':
    default:
      return `
HERO HEADLINE EXAMPLES — what GOOD looks like (across industries):
GOOD: "Diçka e bërë me dorë. Gjithçka tjetër është reklamë." (handcraft business)
GOOD: "The mechanic your father trusted. Same shop. Same name."
GOOD: "Eight years. One specialty. We don't do anything else."
TESTIMONIAL EXAMPLES:
GOOD: "Më ka rekomanduar kushëriri. Tani po e rekomandoj unë."
GOOD: "Three friends sent me here. They all said the same thing: you'll know it when you see it."

NOTE: If the business doesn't match any known category, focus the brief on:
- What makes this business physically different from competitors
- One concrete detail (a material, a process, a number, a place)
- The owner's voice — direct, not corporate

The services section is flexible: it can be services, products, deliverables, or packages. Pick the frame that fits the business description.`;
  }
}

// ----------------------------------------------------------------
// Visual system resolution — palette + fonts + voice hint come from a named
// archetype (curated, WCAG-validated) rather than hex values Sonnet invents.
//
// Three modes:
//   - archetypeKey === 'ai':     Sonnet picks a key from the list. Server
//                                expands palette/fonts in postProcess.
//   - archetypeKey === 'custom': User provides primary+accent. Server fills
//                                the other 5 palette tokens. customFont sets
//                                headingFont; bodyFont stays neutral.
//   - archetypeKey is a key:     Server resolves palette+fonts from
//                                ARCHETYPES directly. Sonnet only writes
//                                copy; postProcess overwrites colors/fonts.
// ----------------------------------------------------------------

type ResolvedVisual = {
  palette: Record<string, string> | null;  // null only when archetypeKey==='ai' and AI must pick
  fonts: { headingFont: string; bodyFont: string } | null;
  copyVoiceHint: string;
  archetypeChoiceFromAi: boolean;  // true when 'ai' mode — Sonnet must emit archetypeChoice
};

function resolveVisual(args: {
  archetypeKey: ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;
  brandAccent?: string;
  customFont?: string;
}): ResolvedVisual {
  const { archetypeKey, brandPrimary, brandAccent, customFont } = args;

  if (archetypeKey === 'custom' && brandPrimary && brandAccent) {
    return {
      palette: generatePaletteFromBrandColors(brandPrimary, brandAccent),
      fonts: {
        headingFont: customFont || 'dm-sans',
        bodyFont: customFont === 'playfair' ? 'inter' : (customFont || 'dm-sans'),
      },
      copyVoiceHint: 'match the user-provided brand colors — professional and consistent with their existing identity',
      archetypeChoiceFromAi: false,
    };
  }

  if (isArchetypeKey(archetypeKey)) {
    const arch = ARCHETYPES[archetypeKey];
    return {
      palette: { ...arch.palette },
      fonts: { headingFont: arch.headingFont, bodyFont: arch.bodyFont },
      copyVoiceHint: arch.copyVoiceHint,
      archetypeChoiceFromAi: false,
    };
  }

  // 'ai' (or unknown — defensive default)
  return {
    palette: null,
    fonts: null,
    copyVoiceHint: '',
    archetypeChoiceFromAi: true,
  };
}

function buildVisualSystemBlock(args: {
  archetypeKey: ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;
  brandAccent?: string;
  customFont?: string;
}): string {
  const resolved = resolveVisual(args);

  if (resolved.archetypeChoiceFromAi) {
    const list = (Object.entries(ARCHETYPES) as Array<[ArchetypeKey, typeof ARCHETYPES[ArchetypeKey]]>)
      .map(([k, a]) => `- "${k}" (${a.nameAlb}): ${a.descriptor} — fits: ${a.fits.join(', ')}; voice: ${a.copyVoiceHint}`)
      .join('\n');
    return `VISUAL SYSTEM (you pick — server expands the palette/fonts):

Pick ONE archetype key from this list that best fits the brand brief and the business description:
${list}

Output your choice as a top-level field: "archetypeChoice": "<key>"
Do NOT output primaryColor, accentColor, bgColor, surfaceColor, textColor, mutedTextColor, borderColor, headingFont, or bodyFont.
The server will fill those from your archetypeChoice.

Match your copy voice to the chosen archetype's voice hint (above).`;
  }

  if (args.archetypeKey === 'custom') {
    const p = resolved.palette!;
    const f = resolved.fonts!;
    return `VISUAL SYSTEM — USER-LOCKED BRAND COLORS:
The user has provided their own brand identity. The palette has been resolved server-side:
- bgColor: ${p.bgColor}
- surfaceColor: ${p.surfaceColor}
- textColor: ${p.textColor}
- mutedTextColor: ${p.mutedTextColor}
- primaryColor: ${p.primaryColor} (USER BRAND PRIMARY — already set, do not change)
- accentColor: ${p.accentColor} (USER BRAND ACCENT — already set, do not change)
- borderColor: ${p.borderColor}
- headingFont: ${f.headingFont}
- bodyFont: ${f.bodyFont}

Do NOT output color or font fields in your response — they are already set. Focus on copy and sections.
Copy voice MUST match: ${resolved.copyVoiceHint}`;
  }

  // Pre-resolved named archetype.
  const arch = ARCHETYPES[args.archetypeKey as ArchetypeKey];
  const p = resolved.palette!;
  const f = resolved.fonts!;
  return `VISUAL SYSTEM — PRE-SET ARCHETYPE: "${arch.nameAlb}" (${arch.descriptor})
Palette and fonts are FIXED by the user's archetype choice. Server will fill these regardless — do NOT output color or font fields in your response.

For your reference (so your copy aligns with the visual register):
- bgColor: ${p.bgColor} | textColor: ${p.textColor} | primaryColor: ${p.primaryColor}
- headingFont: ${f.headingFont} | bodyFont: ${f.bodyFont}
- preferred hero layout: ${arch.preferredHeroLayout} (only used when user left Hero on AI)
- preferred story layout: ${arch.preferredStoryLayout} (only used when user left Story on AI)

Copy voice MUST match: ${resolved.copyVoiceHint}`;
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
    case 'casual': return `Tone is casual Kosovar STREET-Gheg — the way a Kosovar friend texts you about their cousin's business, NOT polished marketing prose dressed in apostrophes.

REAL ROAD GHEG — phrasings that sound like actual Kosovo speech:
- "Hajde te ne." (come to us — universal walk-in welcome)
- "Pa termin, direkt." (no appointment, just walk in)
- "Ban telefon për t'a ditë sa po pritet." (call to know the wait)
- "Brenda 30 minutash e ke gati." (time promise, wait model)
- "Boll po t'thom." (just telling you — conversational filler)
- "T'kushton €5, jo €15." (price-honesty, direct numbers)
- "Pa marrëveshje t'gjata, pa zhurmë." (no long contracts, no fuss)
- "Ki problem? Telefono." (got a problem? call)
- "Sa po pritet sot? Pak." (how long's the wait? not much)
NOTE: only use mobile-service phrasings ("vijm te ti", "n'oborr tënd")
when the business is genuinely mobile (in-home cleaning, home barber).
Do NOT default to mobile framing — most Kosovo SMBs are static, the
customer comes to the business.

GRAMMAR DETAILS THAT ANCHOR REAL GHEG:
- "n'" instead of "në": n'lagje, n'shpi, n'oborr, n'punë (always)
- "po t'" / "t'po" for "we [do] for you": po t'lajm, t'po vij, po t'thom
- "ki" instead of "ke" (informal possession): ki problem, ki kohë
- "ban" instead of "bën": ban telefon, ban porosi
- "boll" / "boll po" as filler: boll po t'them, boll qysh je
- "kallu / kallesh / s'kallesh" (don't bother / no need / no problem)
- "vijm" / "lajm" / "bajm" — drop subject pronouns, drop the 'ë' in 1pl
- "nji" instead of "një" (Gheg numeral)
- "me" + verb: me ardh, me shku, me ble, me lan

BANNED CASUAL FILLER (these turn casual into try-hard marketing):
- "siç duhet" used more than ONCE across the whole site — that's a template phrase, not speech. Pick a different way to say "right" each time, or don't say it.
- "ngadalë, me dorë, pa nxitim" — reads like a brochure pretending to be chill
- "është ajo me çka X, Y, Z" — too literary, too written
- Long em-dash lists (3+ items) — Gheg speech is short and choppy, not elegantly punctuated
- "punojmë" / "ofrojmë" / "kujdesemi" — formal Albanian verbs that don't belong in road context. Use "lajm", "bajm", "kemi", "vijm", "rrojm"
- "udhëtim" of any kind in a service context
- "personalizuar" — calque from English, never Kosovar

THE ROAD TEST:
Could you imagine this on a hand-painted shop sign, on a Viber broadcast,
on a WhatsApp business profile, or as a sticker on a transit van?
- If yes → keep.
- If it reads like an agency wrote it and tried to sprinkle Gheg apostrophes on top → REWRITE in actual road Gheg.

Drop subject pronouns aggressively. Sentence fragments are not just allowed — they are the default. Two short sentences beat one elegant one. Reference real Kosovar places and everyday situations naturally, not as decoration.`;
    default: return '';
  }
}

function normalizeGenerationIndustry(industry: string, businessDescription?: string): string {
  const haystack = `${industry} ${businessDescription ?? ''}`.toLowerCase();

  if (/course|kurs|education|learning|academy|akademi|school|shkoll|university|universit|faculty|fakultet|college|program/.test(haystack)) {
    return 'education';
  }
  if (/retail|shop|store|dyqan|boutique|product|produkt|handmade|e-?commerce/.test(haystack)) {
    return 'retail';
  }
  if (/freelance|freelancer|designer|dizajn|photographer|fotograf|copywriter|creative|kreativ/.test(haystack)) {
    return 'freelance';
  }
  if (/event|events|festival|concert|koncert|wedding|dasma|party|bilet|ticket/.test(haystack)) {
    return 'events';
  }

  return normalizeIndustry(industry);
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

export type GenerateThemeArgs = {
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
  // Visual archetype: a key from ARCHETYPES, or 'custom' (user brand colors)
  // or 'ai' (Sonnet picks the key from the list).
  archetypeKey: ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;  // only consulted when archetypeKey === 'custom'
  brandAccent?: string;   // only consulted when archetypeKey === 'custom'
  customFont?: string;    // only consulted when archetypeKey === 'custom'
  // Gates which hero CTAs the AI is allowed to write. The renderer only
  // wires CTAs to two real actions: open the booking drawer (when bookingMethod
  // allows it) or fire the contact handler (phone/WhatsApp). Anything else
  // would be a broken promise.
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  language: string;
  tone: string;
  userProvidedServices: string;
  canonicalIndustry: string;
  userHasGalleryPhotos: boolean;
  userHasServicePhotos: boolean;
  regenSeed?: string;
  // Per-call model override. Defaults to THEME_MODEL (process env). Used by
  // the ad-hoc A/B testing script in scripts/ to compare Haiku vs Sonnet on
  // the same fixture inputs. Production POST handler does not pass this.
  modelOverride?: string;
};

export async function generateTheme(args: GenerateThemeArgs) {
  const {
    brief, businessName, industry, city, uniqueness, businessDescription,
    heroLayout, storyLayout, servicesLayout, galleryLayout,
    archetypeKey, brandPrimary, brandAccent, customFont,
    bookingMethod,
    language, tone, userProvidedServices,
    canonicalIndustry, userHasGalleryPhotos, userHasServicePhotos, regenSeed,
  } = args;

  const definingTraits = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(', ')
    : String(brief.definingTraits ?? '');

  const traitsForVoiceCheck = Array.isArray(brief.definingTraits)
    ? brief.definingTraits.join(' / ')
    : String(brief.definingTraits ?? '');

  const visualSystemBlock = buildVisualSystemBlock({
    archetypeKey, brandPrimary, brandAccent, customFont,
  });

  // Hero CTA constraint — varies per request based on bookingMethod, so it
  // lives in the dynamic prompt. The static prompt has the universal "no
  // navigation CTAs" rule; this adds the per-business "is booking real?" gate.
  const bookingAllowsAppointments = bookingMethod === 'appointments' || bookingMethod === 'both';
  const heroCtaConstraint = bookingAllowsAppointments
    ? `HERO CTA SCOPE — this site supports BOTH actions:
  - Booking (primary): "Rezervo termin" / "Bëj rezervim" / "Cakto orarin" / "Book appointment"
  - Contact (secondary): "Na kontakto" / "Telefono" / "Get in touch"
ctaCount: 1 or 2. NEVER write CTAs that imply navigation ("Shfleto", "Mëso më shumë", "Lexo më shumë", "Browse", "Learn more", "View pricing").`
    : `HERO CTA SCOPE — this site does NOT support online booking. The ONLY real action is contact (phone / WhatsApp).
Allowed CTAs: "Na kontakto" / "Telefono" / "Shkruan" / "Get in touch" / "Call us" / "Message us"
FORBIDDEN here:
  - Booking-style CTAs ("Rezervo", "Bëj rezervim") — they would fall through to contact, breaking the promise.
  - Navigation CTAs ("Shfleto programet", "Mëso më shumë", "Lexo më shumë", "Browse", "Learn more", "View pricing") — there is no separate page to navigate to.
ctaCount: 0 or 1. If unsure → 0 (no CTA buttons). One honest contact CTA beats two fake ones.`;

  const kosovarCopyRules = (language === 'sq' || language === 'both')
    ? `
KOSOVAR ALBANIAN COPY RULES — THE ONLY THING THAT MATTERS:

═══════════════════════════════════════════
THE REAL READER
═══════════════════════════════════════════
The copy is read by a real person in Kosovo making a real decision.
A mother in Pejë deciding which clinic to take her child to.
A man in Prishtinë deciding if this barbershop is worth leaving his current one.
A student in Prizren deciding if this course will actually get them a job.
A cousin in Stuttgart reading about a salon before visiting Kosovo for summer.

They are NOT reading carefully. They are scanning.
They will give the page 8 seconds.
In those 8 seconds the copy must make them feel:
1. "Këta e kuptojnë situatën time" — these people get my situation
2. "Kjo duket e vërtetë" — this seems real, not made by an agency
3. "Dua të di më shumë" — I want to know more

If it sounds like an ad → they scroll past.
If it sounds like a real person talking → they stay.

═══════════════════════════════════════════
THE CUSTOMER IS THE HERO
═══════════════════════════════════════════
Write from the CUSTOMER's perspective, not the business owner's.
The customer doesn't care what the business does.
They care what changes for THEM.

WRONG: "Doktorët që dëgjojnë."
RIGHT: "Mjeku që të njeh me emër."

WRONG: "Ofrojmë shërbime cilësore."
RIGHT: "Nuk do të dalësh pa përgjigje."

WRONG: "Analizat këtu, n'Pejë."
RIGHT: "Nuk duhet të shkosh në Prishtinë."

WRONG: "Eksperiencë e Personalizuar e prerjes."
RIGHT: "Prerje që e dini ku po shkon. Berberi yt, që nga 2008."

═══════════════════════════════════════════
THE KAFENE TEST
═══════════════════════════════════════════
Before outputting any sentence, say it out loud as if explaining
something to a friend at a kafene in Kosovo.

If it sounds like something a teacher writes on a blackboard → REWRITE.
If it sounds like a WhatsApp message from a real Kosovo business → KEEP.

The gold standard is the te Syla register (Prizren, since 1967):
"tash gati 50 vite... Ju bëftë mirë. Provo, merri do me veti."
Short. Specific. A founder's name. A year. Real sign-off.

═══════════════════════════════════════════
KOSOVAR VOCABULARY — USE THESE
═══════════════════════════════════════════
These words signal "this was written by someone from Kosovo":

- "tash" (not "tani") — "Cakto terminin tash"
- "te ne" (not "tek ne") — "Ejani te ne"
- "çka" (not "çfarë") — casual, conversational
- "qysh" (not "si") — "Qysh funksionon?"
- "kojshi / kojshia" — neighbor (warm, local trust signal)
- "myshteri / myshteria" — customer (Kosovo barbershop/service register)
- "Ju mirëpresim" — universal Kosovo SMB closing
- "Ju bëftë mirë" — restaurant-specific sign-off (100% authentic)
- "Mirë se vini" — welcome
- "Cakto terminin" — the dominant booking CTA verb in Kosovo
- "sipas kërkesës tuaj" — per your request (universal)
- "bahçe" — terrace/outdoor space (restaurants especially)
- "dhëndër" — groom (barbershop pre-wedding context)
- "goja e gojës" — word of mouth

PLACE NAMES THAT ANCHOR COPY:
Use these when the business is in these cities:
- Prishtinë: Sunny Hill / Bregu i Diellit, Dragodan, Aktash, Ulpiana, Kalabri
- Prizren: Shadërvan (the old-town fountain, social heart), Kalaja, Ura e Gurit
- Pejë: Kosharja, Karagaq, Rugova
- Mitrovicë: Lagjja e Re, Tre Rrokaqiejt, Ura e Ibrit
- Gjakovë: Çarshia e Madhe
- Ferizaj: Sheshi i Lirisë
- Gjilan: Varosh

DIASPORA REFERENCE (powerful if contextually right):
"kur kthehet familja prej Gjermanie / Zvicrës / Austrisë"
"para se të ktheheni, vizitoni"
"të njëjtin shërbim si në Mynih — pa udhëtuar"

═══════════════════════════════════════════
BANNED PHRASES — NEVER USE
═══════════════════════════════════════════
These are the phrases that make a Kosovo reader say
"kjo e ka shkruar dikush që nuk e njeh Kosovën":

BANNED WORDS:
- "cilësor" / "cilësia" — most overused word in Kosovo marketing, banned
- "eksperiencë" — foreign feel, use "përvojë" or give a year
- "profesional" as a standalone claim — says nothing
- "atmosferë mikpritëse" — agency phrase, never real
- "zgjedhja e duhur / ideale" — cliché
- "sipas standardeve evropiane" — meaningless filler
- "Anëtarësohu tani!" — calque from English
- "transformim" in a beauty context — too dramatic
- "udhëtim" in a metaphorical sense ("journey")

BANNED STRUCTURES:
- Headline + subheadline that say the same thing in different words
- Any sentence over 15 words — split it
- Two unrelated facts stapled into one headline
- Passive voice anywhere in hero or story
- Abstract nouns when a verb works better

REPLACE WITH:
"cilësor" → give a number. "8 vite", "qythjet 200 nuse"
"eksperiencë" → "Arjani ka punuar 6 vite në Mynih. Tash është te ne."
"atmosferë" → describe it. "Bahçja jonë, muzikë e qetë, kafe pa zhurmë."

═══════════════════════════════════════════
INDUSTRY VOCABULARY — WHAT REAL BUSINESSES SAY
═══════════════════════════════════════════

BARBERSHOP (frizer / berber):
Real service names: "prerje, qethje, rrojë, fenirim, mjekër, frizura për djem"
Real copy beats:
- "Nga babi te djali." (generational trust)
- "Para dasmës, para intervistës, para çdo gjëje." (occasion-anchored)
- "Dy karrige. Pa radhë të gjatë." (honest specifics)
- "Myshterinjtë tanë na kthehen — jo sepse nuk kanë ku." (loyalty as proof)
CTA: "Cakto terminin — WhatsApp 044 XXX XXX"

RESTAURANT (restorant / qebaptore):
Real dishes to name: flija, pite, qebapa, tavë kosi, suxhuk, ushtipka, sarma, ajvar
Real copy beats:
- "Kuzhinë si te shtëpia, tavolinë si te restorant."
- "Bahçja jonë ju pret." (terrace culture)
- "Drekë familjare çdo të diel." (Sunday ritual)
- "Gatuajmë si të mëdhejt tanë." (grandmother's recipe trust)
- "Ju bëftë mirë." (closing, always)

CLINIC (klinikë):
Real pain points: waiting 45+ min in public clinics, corruption, travelling to Vienna/Skopje
Real copy beats:
- "Nuk duhet të shkosh në Prishtinë." (for non-capital cities)
- "Pa pritje, pa surpriza, pa korrupsion." (the anti-public-hospital claim)
- "Mjeku të shpjegon çka po ndodh — pa fjalë të mëdha."
- "Trajnim në Vjenë. Punë në Pejë." (Western credential, local presence)
- "Shumë pacientë vijnë tek ne pas përvojash zhgënjyese diku tjetër." (ParaDent register)

BEAUTY SALON (sallon bukurie):
Real service names: stilim, prerje, lyerje, balayage, keratina, manikyr, thonj me xhel, microblading, lash extensions, makeup nuse, depilim total
Real copy beats:
- "Stilistja juaj — jo kush të jetë lirë." (stylist loyalty)
- "Nga dita e parë deri te dera e dasmës." (bridal journey)
- "Bukurinë tuaj e dimë ne më mirë se kushdo." (intimate knowledge)
- CTA: "Cakto terminin — WhatsApp 045 XXX XXX"

GYM (palestër / fitness):
Real copy beats:
- "Trajneri yt të njeh emrin." (personal attention)
- "Pa kontrata të gjata. Pa surpriza." (transparency)
- "Hap derën, hap ditën." (energizing, direct)
- "Jo 50 vetë në sallë. Jemi 20 — dhe e dimë kush je." (boutique positioning)

COURSES / EDUCATION:
Real copy beats:
- "Mëso një zanat që paguan." (outcome-first)
- "Nga zero te klienti i parë në 8 javë." (timeline specifics)
- "Mëson me dikë që e ka bërë vetë." (practitioner credibility)
- "Çka mëson sot, ta shtosh portofolin nesër." (Gheg-influenced, modern)

AUTO / CAR WASH / MEKANIK (lavazh / servis):
CRITICAL — Kosovo lavazhe are STATIC. Customers DRIVE TO the lavazh,
they never expect the lavazh to come to them. There is no "we come to
you" service model. The customer arrives, drops off the car (or waits),
gets the car back washed — that's the entire flow. Never imply mobile,
home-pickup, or "vijm te ti" service.
This vertical lives in the most road-Gheg register on the whole list.
Copy here should sound like a hand-painted sign at the wash, a chalk
board with prices, or a Viber broadcast — never like a brochure.
Avoid "siç duhet" repetition, avoid "ngadalë, me dorë, pa nxitim" type
elegance, avoid abstract nouns.
Real service names: larje, larje mrena, larje jashtme, larje komplet,
  pastrim aspirator, polirim, vakum, ndërrim vaji, balancim, gomalle,
  dezinfektim
Real copy beats (all assume customer comes to the lavazh):
- "Hajde te ne, t'lajm makinen." (drive here, we wash it)
- "Pa termin, direkt — hajde." (walk-in, no appointment needed)
- "Brenda 30 minutash e ke gati." (time promise based on a wait model)
- "Lajm me dorë." (handwash, ONE-line claim — never bundled with extras)
- "T'kushton €5, asgjë më shumë." (fixed price, no surprises)
- "Kafe falas sa pritesh." (free coffee while waiting — classic Kosovo SMB)
- "Mrena e jasht, t'gjitha." (full service, simple)
- "Boll t'sjellësh, ne e bajmë t'tjerën." (you bring it, we do the rest)
CTA: "Telefono — sa po pritet sot?" / "Hajde te ne" / "Cakto orarin"
NEVER write "vijm te ti", "te ti n'lagje", "n'oborrin tënd", or anything
suggesting the wash comes to the customer's home or street.

═══════════════════════════════════════════
THE BUSINESS OWNER CHECK
═══════════════════════════════════════════
Before outputting, ask:
"Would the business owner in Kosovo feel proud showing this to their
neighbor ('kojshia') at the kafene tomorrow morning?"

If yes → keep.
If they would feel embarrassed or say "kjo nuk jam unë" → REWRITE.

═══════════════════════════════════════════
CTA RULES FOR KOSOVO
═══════════════════════════════════════════
Kosovo businesses convert through WhatsApp and direct contact, not forms.
CTAs must reflect this:

For booking-enabled: "Rezervo takim" / "Cakto terminin"
For walkin/contact: "Na kontakto — WhatsApp / Viber"
For retail/products: "Shiko koleksionin" / "Na shkruaj"
For courses: "Regjistrohu" / "Merr informacion"

NEVER: "Merrni një ofertë falas", "Anëtarësohu tani", "Klikoni këtu"

THE GJIRAFA.BIZ CLOSING TEMPLATE (universally authentic):
If in doubt, the safest authentic Kosovo SMB sign-off is:
"[Service list]. Të gjitha sipas kërkesës tuaj. Ju mirëpresim."
This is real. It works. It doesn't feel fake.
`
    : '';

  const uniquenessEchoCheck = uniqueness && uniqueness.trim().length > 0
    ? `
FINAL DYNAMIC CHECK (run AFTER the 8 BEFORE-OUTPUTTING checks above):

9. UNIQUENESS SUBSTANCE TEST (signal, not phrase):
The user's claim was: "${uniqueness}"
Did your hero headline AND story body communicate the SUBSTANCE of this
claim — without quoting the user's words?
- If a Kosovar reader couldn't see the same claim in your copy → REWRITE.
- If you can find a 5+ word phrase copied verbatim from the user's
  claim above in your output → REWRITE in your own Kosovo voice.
The user's wording is signal. Your output must be fresh prose.
`
    : '';

  const dynamicSystemPrompt = `REQUEST-SPECIFIC CREATIVE DIRECTION:

${visualSystemBlock}

Language: ${language}
Write all customer-facing copy and artDirection captions in: ${languageInstruction(language)}
${kosovarCopyRules}
Tone: ${tone}
${toneDirective(tone)}

USER'S UNIQUENESS SIGNAL (extract the IDEA — do not paste the wording):
"${uniqueness || '(not provided — derive from positioning)'}"
Read this to understand WHY the business is different. Then write fresh copy
in authentic Kosovar voice. The user's wording may be raw, generic, or
literal — your output is fresh prose, never a quote of their phrasing.

DEFINING TRAITS (also gospel):
${traitsForVoiceCheck}

${heroCtaConstraint}

STRUCTURAL CHOICES:
${sectionsBriefing(heroLayout, storyLayout, servicesLayout, galleryLayout, uniqueness)}

THIS BUSINESS'S CANONICAL INDUSTRY: ${canonicalIndustry}

SERVICES INTERPRETATION:
The user-provided services, if any, are in the user message. If the user listed services, every item in the services section MUST correspond to one of them. Do not invent unrelated services when the user has been specific.
If a user-provided service has no price or duration, do NOT invent a price or minute duration just to fill the schema. Omit missing fields and set showPrices/showDuration accordingly.

${industryVoiceFor(canonicalIndustry)}

${fewShotsFor(canonicalIndustry)}
${uniquenessEchoCheck}`;

  const primaryTrait = Array.isArray(brief.definingTraits) && brief.definingTraits.length > 0
    ? String(brief.definingTraits[0])
    : definingTraits.split(',')[0]?.trim() || '(use positioning)';

  const userPrompt = `BRAND BRIEF (gospel — every design choice must serve it):
- Positioning: ${brief.positioning}
- Defining traits: ${definingTraits}
- Target customer: ${brief.targetCustomer}
- Cultural anchor: ${brief.culturalAnchor}

VOICE — HOW THIS BUSINESS SPEAKS (match this register exactly):
"${brief.voice}"

This is not a suggestion. It is the brand's actual personality.
Every sentence of copy must feel like it came from this voice.

If a sentence sounds like generic marketing instead of this specific voice:
→ REWRITE it until a real person from Kosovo would recognize it
   as authentic to this specific business.

The voice applies to: hero headline, subheadline, story body,
service descriptions, and footer tagline. All of it. Consistently.

SECTION → BRIEF FIELD MAPPING:
Each section has ONE primary job tied to a specific brief field.

HERO → express: "${brief.positioning}"
  The brand's core claim in its strongest, most direct form.

STORY → embody: "${brief.voice}" voice + anchor in "${brief.culturalAnchor}"
  The story must SOUND like the brand and FEEL like Kosovo.

SERVICES → speak to: "${brief.targetCustomer}"
  Use their language. Describe services from their perspective, not the owner's.

FOOTER → echo: "${primaryTrait}"
  Close with the single most defining trait. One line. Memorable.

Do NOT let any section become generic.
Every section must be traceable back to its assigned brief field.

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- City: ${city}
- Business description (user's own words, primary scope signal): ${businessDescription || '(not provided)'}
${archetypeKey === 'custom' ? `- BRAND COLORS (LOCKED): primary=${brandPrimary}, accent=${brandAccent}` : ''}

USER-PROVIDED SERVICES (may be empty — that's fine):
${userProvidedServices || '(none provided — infer 3-5 representative services from the business description)'}

If services were provided, the services section MUST list them faithfully (don't change names or invent new ones). If none were provided, generate 3-5 representative services that fit the business description. Do not invent prices or minute durations for non-appointment offerings.

USER HAS UPLOADED GALLERY PHOTOS: ${userHasGalleryPhotos ? 'YES — you MUST include a gallery section' : 'No — gallery section is optional'}
USER HAS UPLOADED SERVICE PHOTOS: ${userHasServicePhotos ? 'YES — services should be designed knowing photos will appear' : 'No — services may be type-only'}

${regenSeed ? `REGENERATION ATTEMPT — produce a notably DIFFERENT direction than the previous result. Pick different layout combinations. Pick different copy angles. Different decorative elements. The brief is the same — your interpretation must shift. (seed: ${regenSeed})` : ''}

Generate the theme.`;

  // Tone-conditional model selection. A/B test on the lavazh-casual fixture
  // showed Sonnet produces meaningfully better road-Gheg copy than Haiku for
  // tone='casual' specifically — using apostrophe forms like n'Tavnik,
  // n'fillim, me u shqetësu, ta themi para — where Haiku stays in standard
  // register on the same prompt. For other tones Haiku is sufficient and
  // ~5x cheaper / 2x faster, so we keep Haiku as default.
  // modelOverride still wins (used by scripts/ab-test.ts).
  const casualModel = process.env.CASUAL_THEME_MODEL || 'claude-sonnet-4-6';
  const tonePicked = (args.tone === 'casual') ? casualModel : THEME_MODEL;
  const effectiveModel = args.modelOverride || tonePicked;
  console.log('[generate-variants] model:', effectiveModel, 'tone:', args.tone, 'industry:', args.canonicalIndustry);
  const response = await anthropic.messages.create({
    model: effectiveModel,
    max_tokens: 4500,
    temperature: 0.85,
    system: [
      {
        type: 'text',
        text: THEME_STATIC_SYSTEM_PROMPT,
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
  const parsed = parseModelJson(text || '{}');
  // Log the RAW model output (before postProcess) so we can grade what
  // Haiku vs Sonnet actually wrote — copy quality, archetype choice,
  // section structure. postProcess overlays palette/fonts/prices/layouts
  // so the public DB shape isn't representative of what the model emitted.
  // Mirrors brand-brief/route.ts:197.
  try {
    console.log(`[generate-variants] model=${effectiveModel} raw output:`, JSON.stringify(parsed, null, 2));
  } catch {
    console.log(`[generate-variants] model=${effectiveModel} (raw output unstringifiable)`);
  }
  return parsed;
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
  description?: string;
}

interface PostProcessCtx {
  // Per-section user picks. 'ai' = leave AI's choice; specific value = force it.
  heroLayout: string;
  storyLayout: string;
  servicesLayout: string;
  galleryLayout: string;
  userHasServicePhotos: boolean;
  userHasGalleryPhotos: boolean;
  userHasHeroPhoto: boolean;
  language: string;
  wizardServices: WizardServiceInput[];
  businessDescription: string;
  industry: string;
  businessName: string;
  uniqueness: string;
  city: string;
  // Visual archetype context — postProcess overlays palette/fonts onto the AI
  // theme so colors are ALWAYS from a validated source. Sonnet's color/font
  // outputs (if any) are discarded for archetype/custom; for 'ai' mode we
  // honor the archetypeChoice it emitted.
  archetypeKey: ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;
  brandAccent?: string;
  customFont?: string;
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
  // The user's per-section layout picker controls layout within each section,
  // so the macro-ordering can be deterministic.
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
  // 0. Archetype palette + fonts overlay. Always run BEFORE contrast checks.
  //    For 'ai' mode, honor Sonnet's archetypeChoice (if valid). For 'custom'
  //    or named-archetype, server is the source of truth — Sonnet's hex
  //    output (if any) is discarded so the page can never render with bad
  //    contrast.
  let effectiveArchetypeKey: ArchetypeKey | 'custom' | 'ai' = ctx.archetypeKey;
  if (ctx.archetypeKey === 'ai') {
    const aiChoice = typeof theme?.archetypeChoice === 'string' ? theme.archetypeChoice : '';
    if (isArchetypeKey(aiChoice)) {
      effectiveArchetypeKey = aiChoice;
    } else {
      // Sonnet failed to pick a valid key — fall back to a sensible default
      // by canonical industry. 'besim-qartesi' is the safest neutral pick.
      console.warn('[generate-variants] AI did not return a valid archetypeChoice, falling back:', aiChoice);
      effectiveArchetypeKey = 'besim-qartesi';
    }
  }

  if (effectiveArchetypeKey === 'custom' && ctx.brandPrimary && ctx.brandAccent) {
    const palette = generatePaletteFromBrandColors(ctx.brandPrimary, ctx.brandAccent);
    theme = {
      ...theme,
      ...palette,
      headingFont: ctx.customFont || 'dm-sans',
      bodyFont: ctx.customFont === 'playfair' ? 'inter' : (ctx.customFont || 'dm-sans'),
    };
  } else if (isArchetypeKey(effectiveArchetypeKey)) {
    const arch = ARCHETYPES[effectiveArchetypeKey];
    theme = {
      ...theme,
      ...arch.palette,
      headingFont: arch.headingFont,
      bodyFont: arch.bodyFont,
    };
  }
  // Sonnet may have leaked archetypeChoice into the theme — strip it so it
  // doesn't end up persisted to the customization row.
  if (theme && typeof theme === 'object' && 'archetypeChoice' in theme) {
    delete (theme as any).archetypeChoice;
  }

  let sections: any[] = (theme?.sections ?? []).filter(Boolean);
  const publicAcademic = isPublicAcademicContext(ctx);

  // 1. Strip section types we never render.
  sections = sections.filter(s => s?.kind !== 'testimonials' && s?.kind !== 'faq');

  // 2a. Force a gallery section if the user uploaded gallery photos but the
  //     AI didn't include one. Default to user-locked layout when present,
  //     'masonry' otherwise.
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

  // 2b. Strip the gallery section when the user has NOT uploaded any gallery
  //     photos. The renderer's empty state was rendering 5-6 dashed-border
  //     "GALLERY PHOTO" placeholder boxes that don't blend with most sites.
  //     If the user uploads photos later, regeneration brings the section back
  //     via 2a.
  if (!ctx.userHasGalleryPhotos) {
    sections = sections.filter(s => s?.kind !== 'gallery');
  }

  // 2c. Force hero imageStyle='photo' when the user uploaded a hero photo.
  //     Without this, Sonnet sometimes picks 'gradient' or 'pattern' for
  //     editorial/text-first sites — and the uploaded photo never renders
  //     because HeroSection only reads it on the 'photo' branch.
  if (ctx.userHasHeroPhoto) {
    sections = sections.map(s => (
      s?.kind === 'hero' ? { ...s, imageStyle: 'photo' } : s
    ));
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
      archetypeKey,
      brandPrimary, brandAccent, customFont,
      bookingMethod,
      language, tone, userProvidedServices, wizardServices, regenSeed,
      generationId, businessId,
    } = body;

    // Whitelist bookingMethod — anything else (legacy callers, malformed
    // payloads) defaults to 'none' so we err on the side of "no booking CTA".
    const normalizedBookingMethod: 'appointments' | 'walkin' | 'both' | 'none' =
      bookingMethod === 'appointments' || bookingMethod === 'walkin' ||
      bookingMethod === 'both' || bookingMethod === 'none'
        ? bookingMethod
        : 'none';

    // Normalize archetypeKey: must be 'ai', 'custom', or a known archetype
    // key. Anything else (including legacy 'mood' values) defaults to 'ai'.
    const normalizedArchetypeKey: ArchetypeKey | 'custom' | 'ai' =
      archetypeKey === 'custom' ? 'custom'
      : isArchetypeKey(archetypeKey) ? archetypeKey
      : 'ai';

    if (!brief || !businessName || !industry) {
      return NextResponse.json({ error: 'brief, businessName, industry required' }, { status: 400 });
    }

    // Optional progress streaming. The wizard passes generationId+businessId
    // and subscribes via Realtime; older callers that omit them still work.
    const canEmit = typeof generationId === 'string' && typeof businessId === 'string';
    const userId = userOrResponse.id;

    const canonical = normalizeGenerationIndustry(industry, businessDescription);

    // Look up uploaded photo slots so the prompt can be photo-aware and the
    // post-processor can force a gallery section.
    // Read-only query; gallery_items has a public-SELECT RLS policy
    // (migration 011) so user-scoped client is fine.
    let userHasGalleryPhotos = false;
    let userHasServicePhotos = false;
    let userHasHeroPhoto = false;
    if (typeof businessId === 'string' && businessId.length > 0) {
      const { data: galleryRows } = await supabase
        .from('gallery_items')
        .select('section_key')
        .eq('business_id', businessId);
      const rows = galleryRows ?? [];
      userHasGalleryPhotos = rows.some(r => r.section_key === 'gallery');
      userHasServicePhotos = rows.some(r => r.section_key === 'services');
      userHasHeroPhoto = rows.some(r => r.section_key === 'hero');
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
      archetypeKey: normalizedArchetypeKey,
      brandPrimary,
      brandAccent,
      customFont,
      bookingMethod: normalizedBookingMethod,
      language: language || 'sq',
      tone: tone || 'friendly',
      userProvidedServices: userProvidedServices || '',
      canonicalIndustry: canonical,
      userHasGalleryPhotos,
      userHasServicePhotos,
      regenSeed,
    };

    console.log('[generate-variants] Generating parametric theme', {
      canonical, archetypeKey: args.archetypeKey,
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
      userHasHeroPhoto,
      language: args.language,
      wizardServices: Array.isArray(wizardServices)
        ? (wizardServices as WizardServiceInput[])
        : [],
      businessDescription: args.businessDescription,
      industry: args.industry,
      businessName: args.businessName,
      uniqueness: args.uniqueness,
      city: args.city,
      archetypeKey: args.archetypeKey,
      brandPrimary: args.brandPrimary,
      brandAccent: args.brandAccent,
      customFont: args.customFont,
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
