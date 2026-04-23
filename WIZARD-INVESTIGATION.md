# LokalWeb — Wizard Investigation (Read-Only)

Date: 2026-04-24
Scope: Read-only audit of the current AI wizard + industry flow across the codebase.
No files were modified during this investigation.

---

## SECTION 1 — Current Wizard Flow

### 1.1 Full source: `src/components/website-builder/WebsiteBuilderWizard.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import GenerationLoader, { Brief, LoaderStage } from './GenerationLoader'
import VariantPicker, { Variant } from './VariantPicker'

type Phase = 'form' | LoaderStage | 'picking'

export const MOODS = [
  { id: 'heritage', label: 'Heritage & Warm', keywords: ['traditional', 'timeless', 'rooted'],
    primaryColor: '#8b6f47', bgColor: '#1a1512', fontFamily: "'Playfair Display', serif",
    preview: 'Where craft is passed down.' },
  { id: 'modern', label: 'Modern & Sharp', keywords: ['clean', 'precise', 'confident'],
    primaryColor: '#3b82f6', bgColor: '#0a0a0f', fontFamily: "'Inter', sans-serif",
    preview: 'Designed for today.' },
  { id: 'bold', label: 'Bold & Unforgettable', keywords: ['high-contrast', 'striking', 'memorable'],
    primaryColor: '#ef4444', bgColor: '#0a0a0f', fontFamily: "'Space Grotesk', sans-serif",
    preview: 'You will remember this.' },
  { id: 'premium', label: 'Premium & Refined', keywords: ['elegant', 'discreet', 'quality'],
    primaryColor: '#d4af37', bgColor: '#0d0a0a', fontFamily: "'Playfair Display', serif",
    preview: 'The quiet signal of quality.' },
  { id: 'warm', label: 'Warm & Welcoming', keywords: ['friendly', 'approachable', 'honest'],
    primaryColor: '#ea580c', bgColor: '#1a110a', fontFamily: "'Poppins', sans-serif",
    preview: 'Come in, stay awhile.' },
] as const

const INDUSTRY_SUGGESTIONS = [
  'Berber', 'Restorant', 'Klinikë', 'Sallon Bukurie',
  'Kafene', 'Gym', 'Fotograf', 'Tjetër',
]

interface FormState {
  businessName: string
  industry: string
  tagline: string
  moodId: string
}

export default function WebsiteBuilderWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [phase, setPhase] = useState<Phase>('form')
  const [brief, setBrief] = useState<Brief>(null)
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  const [formData, setFormData] = useState<FormState>({
    businessName: '',
    industry: '',
    tagline: '',
    moodId: 'premium',
  })

  // On mount: fetch current user's most recent business; pre-fill businessName + industry.
  useEffect(() => { /* bootstrap — fetches biz.id, biz.name, biz.industry */ }, [router])

  // Advances step with validation (step 1: name + industry ≥ 2 chars; step 2: moodId required).
  const nextStep = () => { /* ... */ }

  const handleGenerate = async () => {
    if (!businessId) return toast.error('Biznesi nuk u gjet...')
    setPhase('thinking'); setBrief(null); setVariants(null)
    try {
      const moodKeywords = MOODS.find((m) => m.id === formData.moodId)?.keywords ?? []

      const briefRes = await fetch('/api/brand-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName,
          industry: formData.industry,
          tagline: formData.tagline,
          moodKeywords,
        }),
      })
      if (!briefRes.ok) throw new Error((await briefRes.json()).error || `Brief ${briefRes.status}`)
      const briefData = await briefRes.json()
      setBrief(briefData.brief); setPhase('brief-revealing')

      const revealMin = new Promise<void>((r) => setTimeout(r, 4500))
      const variantsPromise = fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefData.brief,
          businessName: formData.businessName,
          industry: formData.industry,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || `Variants ${r.status}`)
        return r.json() as Promise<{ variants: Variant[] }>
      })

      const [, variantsData] = await Promise.all([revealMin, variantsPromise])
      setPhase('designing')
      await new Promise<void>((r) => setTimeout(r, 1000))
      setVariants(variantsData.variants); setPhase('picking')
    } catch (error: any) {
      toast.error(error.message || 'Dështoi gjenerimi i temës')
      setPhase('form')
    }
  }

  // Render guards
  if (bootstrapping) return <Spinner />
  if (phase === 'thinking' || phase === 'brief-revealing' || phase === 'designing')
    return <GenerationLoader stage={phase} brief={brief} />
  if (phase === 'picking' && variants && businessId)
    return <VariantPicker variants={variants} businessId={businessId} onRegenerate={handleGenerate} />

  // else: 3-step form UI (Step 1: Basics, Step 2: Mood, Step 3: Review+Generate)
}
```

*(The above is a tight paraphrase showing the orchestration + state shape. The Step-1/2/3 JSX and animation classes are in the actual file but omitted here for signal-density. See the unabridged source at the path above.)*

### 1.2 Steps, fields, state

| Step | Field | Required? | State location |
|---|---|---|---|
| 1 | `businessName` (text input, pre-filled from Supabase) | yes, ≥2 chars | `formData.businessName` |
| 1 | `industry` (text input + 8 suggestion chips: Berber, Restorant, Klinikë, Sallon Bukurie, Kafene, Gym, Fotograf, Tjetër) | yes, ≥2 chars | `formData.industry` |
| 1 | `tagline` (text input) | no | `formData.tagline` |
| 2 | `moodId` (5 cards: heritage / modern / bold / premium / warm — default 'premium') | yes | `formData.moodId` |
| 3 | — (review + single Generate button) | — | — |

Additional component state:

- `currentStep: 1 | 2 | 3` — form step.
- `phase: 'form' | 'thinking' | 'brief-revealing' | 'designing' | 'picking'` — generation lifecycle.
- `brief: Brief | null` — result of `/api/brand-brief`.
- `variants: Variant[] | null` — result of `/api/generate-variants`.
- `businessId: string | null` — fetched on mount.
- `bootstrapping: boolean` — blocks render while fetching current business.

### 1.3 Exact payloads

**POST `/api/brand-brief`:**
```json
{
  "businessName": "<formData.businessName>",
  "industry": "<formData.industry — free text, e.g. 'Berber' or 'Lavazh Makinash'>",
  "tagline": "<formData.tagline>",
  "moodKeywords": ["<3 keywords from the selected MOOD>"]
}
```

Example for `moodId = 'heritage'`: `moodKeywords: ['traditional', 'timeless', 'rooted']`.

**POST `/api/generate-variants`:**
```json
{
  "brief": { "positioning": "...", "definingTraits": [...], "targetCustomer": "...", "voice": "...", "culturalAnchor": "..." },
  "businessName": "<formData.businessName>",
  "industry": "<formData.industry — same free-text string as above>"
}
```

Note: `moodId` / `moodKeywords` is **not** passed to `generate-variants`. Mood propagates only indirectly via the brief content.

After user picks a variant in `VariantPicker`, **POST `/api/apply-theme`:**
```json
{ "businessId": "<uuid>", "theme": { /* the full variant object */ } }
```

---

## SECTION 2 — Industry Detection Points

All files touching the `industry` field (write-to-DB, read-from-DB, or UI):

| File:line | Kind | What it does |
|---|---|---|
| `app/register/page.tsx:139` | write (DB) | On account signup, inserts a businesses row with `industry: 'general'` as a placeholder. |
| `app/dashboard/new-business/page.tsx:224-231` | UI | `<Select>` with 4 fixed values: `barbershop`, `restaurant`, `clinic`, `beauty-salon`. User picks one during dashboard onboarding. |
| `app/dashboard/new-business/page.tsx:119` | write (local) | Auto-selects first matching template by `t.industry === form.industry`. |
| `app/dashboard/new-business/page.tsx:348` | read (UI) | Displays industry on the review step (with `.replace("-", " ")`). |
| `src/lib/store.ts:113` | write (DB) | Inside `registerBusiness()`, inserts the new businesses row with `industry: form.industry`. |
| `app/dashboard/profile/page.tsx:40,89,106,109` | read/write (DB) | Profile edit form: `<Select>` to change industry, then updates businesses. Filters templates by `t.industry === form.industry`. Special-cases `form.industry === 'custom'`. |
| `app/dashboard/website-builder/page.tsx` | read (DB) | Server-side: selects `name, industry` from businesses to seed the wizard page. |
| `src/components/website-builder/WebsiteBuilderWizard.tsx:129` | read (DB → state) | Bootstrap: `setFormData(prev => ({ ...prev, industry: biz.industry ?? '' }))`. |
| `src/components/website-builder/WebsiteBuilderWizard.tsx:145,177,197,291,302,396` | read (state/UI) | Validation, payload construction for both API calls, suggestion-chip highlight, free-text input, review summary. |
| `src/components/website-builder/GenerationLoader.tsx` | — | Contains the string "Understanding your industry..." in `THINKING_MESSAGES`. No actual industry read. |
| `app/api/brand-brief/route.ts` | read (request body) | Uses `industry` to look up `INDUSTRY_CONTEXT` map (4 keys + `general` fallback). Also interpolated into user prompt. |
| `app/api/generate-variants/route.ts` | read (request body) | Industry passed through user prompt verbatim. |
| `app/[subdomain]/page.tsx:66` | read (DB → Business type) | Public page passes `business.industry` into `TemplateRouter`. |
| `src/components/templates/index.tsx:33` | read (routing) | `switch (business.industry)` picks template tree. |
| `src/components/templates/RestaurantTemplate.tsx:78` | read (UI) | Renders `business.industry.replace('-', ' ')` as a pill above the hero. |
| `src/lib/types/index.ts:1` | — | `IndustryType = 'barbershop' \| 'restaurant' \| 'clinic' \| 'beauty-salon' \| 'custom'`. Does NOT include `'general'`. |

---

## SECTION 3 — Current Industries Supported

### 3.1 What the TypeScript type says

`src/lib/types/index.ts:1`:
```ts
export type IndustryType = 'barbershop' | 'restaurant' | 'clinic' | 'beauty-salon' | 'custom';
```

### 3.2 What registration flows actually write

| Flow | File | Values written |
|---|---|---|
| `/register` (auth-only signup) | `app/register/page.tsx:139` | **`'general'`** (hardcoded placeholder — NOT in IndustryType enum) |
| `/dashboard/new-business` (full business setup) | `app/dashboard/new-business/page.tsx:227-230` → `src/lib/store.ts:113` | One of: `barbershop`, `restaurant`, `clinic`, `beauty-salon` (4 fixed values) |
| `/dashboard/profile` (edit) | `app/dashboard/profile/page.tsx:89` | One of the 4 above + `'custom'` (per the `form.industry === 'custom'` branch at :109) |
| `/dashboard/website-builder` wizard | (not written — read-only use) | Free-text including 8 suggestions: `Berber, Restorant, Klinikë, Sallon Bukurie, Kafene, Gym, Fotograf, Tjetër`. **NB**: the wizard never persists `formData.industry` back to businesses — it only passes it to the AI APIs. The DB column keeps whatever `/new-business` or `/profile` set. |

### 3.3 Effective set at runtime

A business row in Supabase will have `industry` equal to one of:
- `'barbershop'`, `'restaurant'`, `'clinic'`, `'beauty-salon'` (from `/new-business` or `/profile`)
- `'custom'` (from `/profile` override)
- `'general'` (from `/register` if the user never completes `/new-business`)

**None** of the 8 Albanian wizard suggestion chips (Berber, Restorant, …) are persisted to the DB. They are runtime-only context for the LLM prompts.

---

## SECTION 4 — Template → Industry Mapping

### 4.1 `TemplateRouter` logic (from `src/components/templates/index.tsx:29-82`)

```tsx
switch (business.industry) {
  case 'barbershop':
    if (tid === 'bold')     return <BarberShopFirstTemplate {...props} />
    if (tid === 'minimal')  return <BarbershopMinimal {...props} />
    if (tid === 'modern')   return <BarbershopModern {...props} />
    return <BarberShopFirstTemplate {...props} /> // default for barbershop

  case 'restaurant':
    if (tid === 'elegant')  return <RestaurantElegant {...props} />
    if (tid === 'casual')   return <RestaurantCasual {...props} />
    if (tid === 'bistro')   return <RestaurantBistro {...props} />
    return <RestaurantBistro {...props} /> // default for restaurant

  case 'clinic':
    if (tid === 'clean')    return <ClinicClean {...props} />
    if (tid === 'modern')   return <ClinicModern {...props} />
    if (tid === 'premium')  return <ClinicPremium {...props} />
    return <ClinicPremium {...props} /> // default for clinic

  case 'beauty-salon':
    if (tid === 'luxury')   return <BeautyLuxury {...props} />
    if (tid === 'minimal')  return <BeautyMinimal {...props} />
    return <BeautyLuxury {...props} /> // default for beauty-salon

  default:
    return <BarberShopFirstTemplate {...props} />
}
```

`tid` = `business.templateId`.

### 4.2 Industry → available templateIds

| Industry | Valid `templateId`s | Default (industry match, tid doesn't) |
|---|---|---|
| `barbershop` | `bold`, `minimal`, `modern` | **BarberShopFirstTemplate** (same as `bold`) |
| `restaurant` | `elegant`, `casual`, `bistro` | **RestaurantBistro** |
| `clinic` | `clean`, `modern`, `premium` | **ClinicPremium** |
| `beauty-salon` | `luxury`, `minimal` | **BeautyLuxury** |
| `custom` / `general` / anything else / undefined | — | **BarberShopFirstTemplate** (top-level `default:` case) |

### 4.3 AI mismatch hazard

The AI `generate-variants` schema forces `templateId` into one of **`modern | minimal | bold | elegant`** (from the JSON schema `enum` at `app/api/generate-variants/route.ts:19`). These don't cleanly intersect with every industry's templateId set:

| AI `templateId` | barbershop | restaurant | clinic | beauty-salon |
|---|---|---|---|---|
| `modern` | ✓ BarbershopModern | ✗ → RestaurantBistro default | ✓ ClinicModern | ✗ → BeautyLuxury default |
| `minimal` | ✓ BarbershopMinimal | ✗ → RestaurantBistro default | ✗ → ClinicPremium default | ✓ BeautyMinimal |
| `bold` | ✓ BarberShopFirstTemplate (bold) | ✗ → RestaurantBistro default | ✗ → ClinicPremium default | ✗ → BeautyLuxury default |
| `elegant` | ✗ → BarberShopFirstTemplate default | ✓ RestaurantElegant | ✗ → ClinicPremium default | ✗ → BeautyLuxury default |

Businesses with `industry = 'general'` (from `/register`) always render **BarberShopFirstTemplate** regardless of what the AI chose, since the switch never matches.

---

## SECTION 5 — Services Rendering Check

Most-used default template: **`BarberShopFirstTemplate`** — it is the industry default for `barbershop`, AND the top-level fallback default (catches `general` / `custom` / unknown). Any business without a properly-typed industry lands here.

### 5.1 "WHAT WE DO" source (`src/components/templates/custom/BarberShopFirstTemplate.tsx:111-148`)

```tsx
{/* SERVICES */}
<section
  id="services"
  className="py-32 px-8"
  style={{ backgroundColor: 'var(--bg-color, #0a0a0f)' }}
>
  <div className="max-w-6xl mx-auto">
    <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">OUR SERVICES</p>
    <h2 className="font-black text-white"
        style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontFamily: 'var(--heading-font, inherit)' }}>
      WHAT WE DO
    </h2>
    <div className="w-16 h-px bg-white/20 mt-6 mb-16" />
  </div>
  <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px"
       style={{ backgroundColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
    {services.map((s, i) => (
      <div
        key={s.id}
        className="p-10 cursor-pointer group hover:bg-white/5 transition-colors"
        style={{ backgroundColor: 'var(--surface-color, #0a0a0f)' }}
        onClick={() => openBooking(s)}
      >
        <span className="text-white/10 text-6xl font-black block mb-4">
          {String(i + 1).padStart(2, '0')}
        </span>
        <h3 className="text-white font-black text-xl tracking-widest uppercase mb-3">
          {s.name.toUpperCase()}
        </h3>
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          {s.description ?? ''}
        </p>
        <div className="flex justify-between items-end">
          <span className="text-white/30 text-xs tracking-widest">
            {s.durationMinutes} MIN
          </span>
          <span className="text-white font-black text-3xl">€{s.price}</span>
        </div>
      </div>
    ))}
  </div>
</section>
```

### 5.2 Check — why "WHAT WE DO" is blank on AI-generated sites

- **Reads from:** the `services` prop (passed from `app/[subdomain]/page.tsx` which fetches `services` rows for this `business_id` from Supabase).
- **No hardcoded fallback.** The `{services.map(...)}` returns an empty array when `services.length === 0`. No `services.length === 0 ? <placeholder /> : ...` branch.
- **Visibility conditions:** none. The `<section>` renders unconditionally. The headline and underline always appear even with zero services.

**Root cause of the blank section:** businesses created via the AI wizard path have **no services rows in Supabase** unless the user visited `/dashboard/services` and added them manually. The AI wizard generates copy + theme but does **not** seed services. The LLM's `valueProps` / `testimonials` / `faq` arrays are stored in `website_customization`, not in the `services` table. So the public site renders an empty services grid under the headline.

Comparable behaviour in other templates:
- `ClinicPremium.tsx`: has a `services.length === 0 ? <"Services coming soon"> : ...` guard — renders a placeholder instead of silent empty.
- `RestaurantBistro.tsx`: same "Menu coming soon" guard.
- `ClinicClean.tsx`: same.
- `BarberShopFirstTemplate`, `BarbershopMinimal`, `BarbershopModern`, `BeautyLuxury`, `BeautyMinimal`, `RestaurantCasual`, `RestaurantElegant`, and all 4 industry-default templates: **no empty-state guard** — they silently render nothing under the heading.

---

## SECTION 6 — Gallery Default Behavior

### 6.1 How the public page collects images (`app/[subdomain]/page.tsx:55-78`)

```tsx
const galleryBySection: Record<string, string[]> = {};
(galleryData || []).forEach((item) => {
  if (!item.image_url) return;
  const key = item.section_key || 'gallery';
  if (!galleryBySection[key]) galleryBySection[key] = [];
  galleryBySection[key].push(item.image_url as string);
});

const allGalleryImages = [
  ...(bizData.gallery_images || []),            // old text[] column on businesses
  ...Object.values(galleryBySection).flat(),    // new gallery_items rows
];

const business: Business = {
  // ...
  galleryImages: allGalleryImages,
  gallerySections: galleryBySection,
  // ...
};
```

When the wizard publishes a theme and no images have been uploaded, `galleryData` is empty, `bizData.gallery_images` is either `null` or `[]`, so `business.galleryImages` is `[]`.

### 6.2 What the templates do when `galleryImages` is empty

Every template's hero image uses nullish-coalesce to a hardcoded Unsplash URL. Sampled from `BarberShopFirstTemplate.tsx:68-72`:

```tsx
<img
  src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80"}
  alt="Barbershop"
  className="absolute inset-0 w-full h-full object-cover"
/>
```

And About section (`:171-175`):

```tsx
<img
  src={business.galleryImages?.[1] ?? "https://images.unsplash.com/photo-1621605815971-b8f9d4fbb2b3?w=800&q=80"}
  alt="Barber at work"
  className="object-cover w-full h-full min-h-[400px]"
/>
```

Same pattern across every template — each hardcodes industry-appropriate Unsplash URLs as fallbacks (restaurants: interior + plated dish; beauty salons: spa imagery; clinics: medical facility; barbershops: chair + scissors). So a newly-AI-generated business with zero uploads never shows a broken `<img>`; it shows stock Unsplash content for the template's industry.

There is **no dependency** on AI-generated copy for this — the fallback is purely template-level. The LLM does not return image URLs.

---

## SECTION 7 — Prompt Construction

### 7.1 `/api/brand-brief` — exact prompts

**System prompt** (`app/api/brand-brief/route.ts:58-75`):

```
You are a senior brand strategist who has positioned 200+ small businesses across Southeast Europe. You do NOT design yet — you THINK.

Your job: write a brand brief so specific that a stranger reading only your brief could correctly predict what the website should feel like. If your brief could equally apply to any business in the same category, you have failed.

QUALITY EXAMPLES:

BAD positioning: "A quality barbershop offering professional haircuts"
GOOD positioning: "A barbershop that treats every cut like wedding preparation — because half of them are."

BAD definingTraits: ["professional", "modern", "friendly"]
GOOD definingTraits: ["unapologetically traditional", "silent-while-working precision", "masculine without being macho"]

BAD culturalAnchor: "Kosovar hospitality"
GOOD culturalAnchor: "The fifteen minutes of silence after the warm towel — the only moment of the week men don't have to talk."

Every field must be surprising and specific. Output valid JSON matching the schema.
```

**User prompt template** (`:77-86`):

```
BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- Owner's description: ${tagline || '(none provided)'}
- Mood keywords: ${(moodKeywords || []).join(', ') || '(none)'}

INDUSTRY CONTEXT:
${context}

Write the brief. Every field must be specific enough that it couldn't describe a competitor.
```

`${context}` is looked up in `INDUSTRY_CONTEXT` by `industry` value with `INDUSTRY_CONTEXT.general` as the catch-all:

```ts
{
  barbershop:     `Barbershops in Kosovo are masculine social spaces. Pre-wedding prep (dhëndërri), Saturday family grooming rituals, male bonding over straight-razor shaves. Services: cut, fade, beard, shave, child's cut. Price range 5-25 EUR.`,
  restaurant:     `Kosovar restaurants center on shared meals. Traditional: flija, pite, tavë kosi, qebapa. Coffee culture (macchiato, Turkish). Sunday family gatherings. Outdoor terraces (bahçe). Price: 8-30 EUR.`,
  clinic:         `Healthcare clinics blend trust, modernity, family-doctor warmth. Private clinics compete on wait times, equipment, foreign degrees (Germany, Austria). Family recommendations drive growth.`,
  beauty_salon:   `Beauty salons serve everyday grooming + big life events. Bridal sessions (4-6 hours), engagement prep, nail art daily. Strong stylist-client loyalty. Price: 15-50 EUR.`,
  general:        `Small Kosovar business. Currency Euro. Major cities: Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Ferizaj, Gjilan. Bilingual audience (Albanian/English).`,
}
```

**Note — key mismatch hazard.** The INDUSTRY_CONTEXT key for beauty is `beauty_salon` (underscore), but the DB value is `'beauty-salon'` (hyphen). Lookup would miss and fall back to `general`. Also: wizard suggestion chips send free-text `'Berber'`, `'Restorant'`, `'Klinikë'`, `'Sallon Bukurie'`, etc. — none match context keys, so all chip-based submissions fall through to `general` context.

**Model config** (`:88-98`):
- `model: 'openai/gpt-oss-120b'`
- `response_format: { type: 'json_schema', json_schema: BRAND_BRIEF_SCHEMA }` (strict)
- `temperature: 0.3`
- `max_completion_tokens: 4000`
- `reasoning_effort: 'low'`

Schema enforces: `positioning, definingTraits[3], targetCustomer, voice, culturalAnchor` all required, `additionalProperties: false`.

### 7.2 `/api/generate-variants` — exact prompts

**System prompt** (`app/api/generate-variants/route.ts:110-158`) — called twice, once per direction. The direction block is inserted at the top.

Direction A (`:93-97`):
```
A — Refined Category Leader
Execute the industry's best aesthetic playbook with craft and restraint. Colors are rich but traditional. Typography is confident but not attention-seeking. Copy is specific but doesn't subvert. Think: the highest-end version of what established competitors already do — this variant wins by being the most polished version of what customers expect.
```

Direction B (`:98-102`):
```
B — Contrarian Distinctive
Break the category's visual conventions deliberately — but serve the brand brief. Pick colors the category doesn't usually use. Pick typography that creates friction with expectations. Copy has more voice, more edge, more specificity. This variant wins by being unforgettable. It's the choice someone makes when they're confident enough to stand out.
```

Full system prompt (per-call):

```
You are a senior designer translating a brand strategy brief into a complete website theme.

YOUR DIRECTION — ${direction.name}:
${direction.directive}

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
- "top-notch"
- "premium quality"
- "one-stop shop"
- "we pride ourselves"
- "commitment to excellence"
- "passionate about"
- "unmatched quality"
- "unparalleled"
- "state-of-the-art"
- "cutting-edge"
- "delighting our customers"
- "satisfaction is our priority"
- "experience the difference"
- "a cut above"
- "second to none"
- "elevate your"
- "unleash your"
- "discover the"
- "where style meets"
- "more than just"

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

Output valid JSON matching the schema.
```

**User prompt template** (`:160-172`):

```
BRAND BRIEF (gospel — every design choice must serve it):
- Positioning: ${brief.positioning}
- Defining traits: ${brief.definingTraits.join(', ')}
- Target customer: ${brief.targetCustomer}
- Voice: ${brief.voice}
- Cultural anchor: ${brief.culturalAnchor}

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}

Generate the theme as ${direction.name}.
```

**Model config** (`:174-184`):
- `model: 'openai/gpt-oss-120b'`
- `response_format: { type: 'json_schema', json_schema: THEME_SCHEMA }` (strict)
- `temperature: direction.temperature` (A: `0.85`, B: `1.0`)
- `max_completion_tokens: 8000`
- `reasoning_effort: 'low'`

Schema enforces 26 required fields including the design tokens, hero/about/CTA copy, `valueProps[3]`, `testimonials[3]`, `faq[5]`, and `showTestimonials/showTeam/showContact` bools — all with `additionalProperties: false` everywhere.

A 20-phrase banned list + minimum-testimonial-length check runs server-side post-generation. Failures get one retry (`:205-212`).

---

## Cross-cutting observations (not asked for, flagged for planning)

1. **Industry free-text drift.** The wizard's chip-suggestions (`Berber`, `Restorant`, …) are never persisted to `businesses.industry`. They exist only in prompt context. `businesses.industry` retains whatever `/new-business` or `/register` set.

2. **`INDUSTRY_CONTEXT.beauty_salon` vs DB `'beauty-salon'` mismatch.** Beauty-salon businesses always get the `general` context block in their brand brief.

3. **`industry = 'general'` from `/register` + TemplateRouter default = everyone gets BarberShopFirstTemplate** unless they complete `/new-business`. Likely the most-seen template.

4. **AI-chosen `templateId` cross-industry fit is patchy** — see §4.3 table. In practice, for most industries the AI's templateId is overridden by the industry's default.

5. **Empty services on AI sites** — the AI fills `valueProps` / `testimonials` / `faq` into `website_customization`, but templates render the `services` prop which comes from a separate `services` table that the wizard never seeds. BarberShopFirstTemplate + 10 others render an unlabeled empty grid under "WHAT WE DO" (§5.2).
