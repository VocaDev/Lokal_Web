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

PRE-HERO QUALITY CHECK (run this BEFORE writing any hero content):

Before choosing hero parameters or writing copy, verify:
1. The headline I'm planning: is it 10 words or fewer? (Shorter is almost always stronger)
2. The headline I'm planning: does it contain any banned phrase? (Check the list now)
3. The headline I'm planning: does a competitor in the same industry say something similar? (If yes, start over)
4. The subheadline I'm planning: does it ADD new information, or just rephrase the headline? (If rephrase, cut it or rewrite)

If any answer is wrong, pick a completely different angle before writing the hero.
The hero is the most important section. It deserves the most deliberate choice.

UNIQUENESS ANCHOR FOR HERO:
The user said their business is different because: "${uniqueness || '(not provided — infer from brief positioning)'}"
The HERO HEADLINE must either quote this (distilled, not verbatim) or make it unmistakably clear.
If you cannot point to exactly where the hero reflects this uniqueness claim, REWRITE the headline.

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
The user's claim: "${uniqueness || '(not provided — use brief voice and culturalAnchor instead)'}"
The story body must answer: WHY is this claim true? What's the proof? What's the human reality behind it?
Do not repeat the claim verbatim. Tell the story behind it.

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

4. UNIQUENESS PRESENCE TEST: Search your output for the user's uniqueness statement (or its key phrases).
   If you cannot find it echoed in any section → REWRITE the hero or story to incorporate it.

5. VOICE TRAIT TEST: At least TWO of the brief's defining traits must appear as words or close synonyms in the hero headline/subheadline or story body.
   If not → REWRITE.

6. STORY LENGTH TEST: Count the words in your story body.
   If over 130 words → CUT until under 120.

7. BANNED PHRASE SWEEP: Scan character by character.
   If any banned phrase appears → REPLACE.

8. FABRICATION TEST: Search your output for any specific number, date, or comparative claim (e.g. "45 minutes", "since 1987", "compared to others", "the only one in [city]").
   For each one: was this number/date/claim in the brief or user inputs? If you cannot point to where it came from → REMOVE it.

Output JSON only after all 8 checks pass.

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
  canonicalIndustry: string;
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

  const albanianCopyRules = (language === 'sq' || language === 'both')
    ? `
ALBANIAN COPY QUALITY RULES (applies when language includes 'sq'):

These rules define what AUTHENTIC Albanian marketing copy sounds like vs what AI-generated Albanian sounds like:

SENTENCE STRUCTURE:
- Short sentences. Lots of full stops. Not commas stringing clauses together.
- "Kemi." not "Ne kemi një..." — drop the subject pronoun when context is clear.
- Sentence fragments are a feature, not a bug. "Tri karrige. Dyzet vjet." is stronger than "Ne kemi tri karrige dhe dyzet vjet përvojë."

WORD CHOICE:
- NEVER use: "cilësor" (overused), "eksperiencë" (foreign feel — use "përvojë"), "profesional" as a standalone descriptor, "shërbim i shkëlqyer"
- PREFER: specific nouns over adjectives. "Duar të sigurta" beats "shërbim cilësor". "30 minuta" beats "shpejt".
- Use "ke" (you have) more than "kemi" (we have) — speak TO the customer, not ABOUT the business.
- Numbers feel specific and trustworthy: "tetë vjet" beats "shumë vjet", "gjashtë klientë" beats "klientë të shumtë".

PUNCTUATION AS STYLE:
- Em-dash (—) is used like a beat. "Prerja e duhur — pa sqarim." Use it.
- Parentheses for asides that humanize: "Vjen çdo të shtunë (me djalin)."

THE REAL-PERSON TEST:
Before outputting any copy, ask: "Would a real Kosovar business owner say this out loud to a friend?"
If it sounds like a brochure or a translation from English → REWRITE.
The best Albanian copy sounds like it was spoken first, then written.
`
    : '';

  const uniquenessEchoCheck = uniqueness && uniqueness.trim().length > 0
    ? `
FINAL DYNAMIC CHECK (run AFTER the 8 BEFORE-OUTPUTTING checks above):

9. UNIQUENESS ECHO TEST:
Search your hero headline and story body for any word, phrase, or idea that connects to: "${uniqueness}"
If you cannot find a clear connection in BOTH sections → the uniqueness claim was not communicated. REWRITE one of them.
`
    : '';

  const dynamicSystemPrompt = `REQUEST-SPECIFIC CREATIVE DIRECTION:

Mood: ${mood}
${moodDirective(mood, brandPrimary, brandAccent)}

Font personality: ${fontPersonality}
${fontDirective(fontPersonality)}

Language: ${language}
Write all customer-facing copy and artDirection captions in: ${languageInstruction(language)}
${albanianCopyRules}
Tone: ${tone}
${toneDirective(tone)}

USER'S UNIQUENESS STATEMENT (gospel):
"${uniqueness || '(not provided — derive from positioning)'}"

DEFINING TRAITS (also gospel):
${traitsForVoiceCheck}

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

Voice (how this business SPEAKS — match this register exactly):
"${brief.voice}"

This is not a suggestion. Every sentence of copy must feel like it came from
this voice. If a sentence sounds like generic marketing instead of this specific
voice, rewrite it until it doesn't.

SECTION → BRIEF FIELD MAPPING (each section has a specific job):
- HERO: express "${brief.positioning}" — the brand's core claim in its strongest form
- STORY: embody "${brief.voice}" voice + anchor it in "${brief.culturalAnchor}"
- SERVICES: speak directly to "${brief.targetCustomer}" — use their language, not the owner's
- FOOTER: close with "${primaryTrait}" — the single most defining trait, as a tagline

Each section has ONE primary brief field to honor. Don't let sections become generic —
tie every section back to its assigned brief field.

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

    const canonical = normalizeGenerationIndustry(industry, businessDescription);

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
