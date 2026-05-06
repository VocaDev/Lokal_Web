# Wizard Redesign Discovery Report

**Status:** Discovery only. No implementation has started. Several open questions
below need a human decision before the new wizard can be built end-to-end.

---

## Wizard callers

The current `WizardV2` component is rendered by exactly **two** server pages,
plus referenced by one Playwright harness and incidentally by one API route
and one doc.

| # | File | What it does |
|---|---|---|
| 1 | [app/dashboard/website-builder/page.tsx:26](../app/dashboard/website-builder/page.tsx#L26) | Loads the most recent business for the current user; renders `<WizardV2 businessId subdomain businessName bookingEnabled />`. |
| 2 | [app/register/website-builder/page.tsx:26](../app/register/website-builder/page.tsx#L26) | Identical render — same props, same pre-flight (load latest business). The only difference vs. (1) is the URL the user is sitting at; the wizard component itself is unaware. |
| 3 | [tests/wizard-harness/run.ts:165](../tests/wizard-harness/run.ts#L165) | Playwright harness comment naming the component as the entry point; not a runtime caller, but updates may need to retarget selectors. |
| 4 | [app/api/apply-theme/route.ts:149](../app/api/apply-theme/route.ts#L149) | Variable named `withoutWizardV2` for a destructured fallback payload. Pure naming — does not import the component. Safe to rename or leave. |
| 5 | [docs/architecture.md:183](./architecture.md#L183) | Doc reference (5-step wizard description). Will need an update after the redesign. |

**Conclusion:** the surface to update is small — two server pages, both of which
pass the exact same four props. Renaming or replacing the component is a 2-file
import swap.

## Existing wizard contract

### Props (input from the host page)

```ts
type Props = {
  businessId: string;       // FK into businesses + website_customization
  subdomain: string;        // shown in the preview URL bar (read-only)
  businessName: string;     // captured at registration; never re-asked here
  bookingEnabled: boolean;  // toggles step-2 "booking method" chip group
};
```

Source: [src/components/website-builder/WizardV2.tsx:24-33](../src/components/website-builder/WizardV2.tsx#L24-L33)

### Internal state shape (`WizardInput`)

Defined at [src/lib/types/customization.ts:95-140](../src/lib/types/customization.ts#L95-L140):

```ts
interface WizardInput {
  industry: string;
  industryChip?: string;                                  // canonical id when chip clicked
  city: string;
  uniqueness?: string;
  businessDescription: string;                            // required, >=10 chars
  services: Array<{
    name: string;
    price?: string;
    durationMinutes?: number;
    description?: string;                                 // tri-state: undefined | '' | text
  }>;
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  heroLayout:     'centered' | 'split' | 'fullbleed' | 'editorial' | 'ai';
  storyLayout:    'centered-quote' | 'two-column' | 'long-form' | 'pull-quote' | 'ai';
  servicesLayout: 'list' | 'grid-3' | 'editorial-rows' | 'cards' | 'ai';
  galleryLayout:  'masonry' | 'grid-uniform' | 'showcase' | 'strip' | 'ai';
  archetypeKey:   ArchetypeKey | 'custom' | 'ai';         // 8 archetypes + custom + ai
  brandPrimary?:  string;                                 // hex, only when archetypeKey='custom'
  brandAccent?:   string;                                 // hex, only when archetypeKey='custom'
  customFont?:    'playfair' | 'space-grotesk' | 'dm-sans' | 'poppins';
  language:       'sq' | 'en' | 'both';
  tone:           'friendly' | 'professional' | 'bold' | 'casual';
  instagramUrl?:  string;
  tiktokUrl?:     string;
  phoneNumber?:   string;
}
```

This shape is the **contract** with three downstream APIs. The new wizard MUST
produce a `WizardInput` of this shape (or a proper superset) at submit time.

### Submit-time API calls

The wizard calls three endpoints in sequence. The body fields are the contract.

**Stage 1 — `POST /api/brand-brief`** ([WizardV2.tsx:300-323](../src/components/website-builder/WizardV2.tsx#L300-L323)):

```
{
  businessName, industry, industryChip, city, uniqueness, businessDescription,
  services: [{ name, price, durationMinutes }],
  bookingMethod, language, tone,
  generationId, businessId
}
```

Required by route validator ([app/api/brand-brief/route.ts:44-57](../app/api/brand-brief/route.ts#L44-L57)):
`businessName`, `industry`, `city`, `businessId`, `generationId`. Rest is optional
but functionally needed for the AI prompt to be useful.

**Stage 2 — `POST /api/generate-variants`** ([WizardV2.tsx:333-383](../src/components/website-builder/WizardV2.tsx#L333-L383)):

```
{
  brief, businessName, industry, city, uniqueness, businessDescription,
  heroLayout, storyLayout, servicesLayout, galleryLayout,
  archetypeKey, brandPrimary, brandAccent, customFont,
  bookingMethod, language, tone,
  userProvidedServices,    // human-readable string
  wizardServices,          // structured for postProcessTheme overlay
  regenSeed,               // only on regenerate
  generationId, businessId
}
```

**Stage 3 — `POST /api/apply-theme`** ([WizardV2.tsx:411-437](../src/components/website-builder/WizardV2.tsx#L411-L437) → [app/api/apply-theme/route.ts:5-67](../app/api/apply-theme/route.ts#L5-L67)):

```
{
  businessId, theme,
  siteLanguage, siteTone, uniquenessStatement, bookingMethod, wizardServices,
  instagramUrl, tiktokUrl, phoneNumber
}
```

`apply-theme` also writes `website_builder_completed: true` on the business row
(see Side effects below).

### Side effects (must be preserved)

1. **Realtime progress subscription** — [WizardV2.tsx:198-241](../src/components/website-builder/WizardV2.tsx#L198-L241). Subscribes to `ai_generation_events` filtered by `generation_id` and updates the `SUBSTEPS` UI as `analyzing_business → building_brief → designing_theme → writing_copy → finalizing`. Includes an 8s fallback timer ([WizardV2.tsx:178-194](../src/components/website-builder/WizardV2.tsx#L178-L194)) that auto-advances when no event arrives. The new wizard's "generating" overlay must keep this wiring.
2. **`website_builder_completed` flag** — set true by `/api/apply-theme` at [app/api/apply-theme/route.ts:52](../app/api/apply-theme/route.ts#L52). Read by [app/auth/callback/route.ts:20-25](../app/auth/callback/route.ts#L20-L25) to decide whether to send a returning user to the wizard or the dashboard, and by [src/lib/store.ts:25](../src/lib/store.ts#L25). The wizard never writes this directly — apply-theme does — so the flag is preserved automatically as long as the new wizard still calls `/api/apply-theme` on submit.
3. **Social-links + phone merge into `businesses` row** — [app/api/apply-theme/route.ts:31-61](../app/api/apply-theme/route.ts#L31-L61). The wizard collects `instagramUrl`, `tiktokUrl`, `phoneNumber` and apply-theme merges non-empty values into `businesses.social_links` and `businesses.phone`. Empty strings are not written (prevents clobbering values the user already set on `/dashboard/profile`).
4. **Rate-limit / generation lock** — `claimWebsiteGeneration` ([app/api/brand-brief/route.ts:59](../app/api/brand-brief/route.ts#L59)) prevents parallel generations per business. Survives unchanged because the new wizard still calls the same endpoint.
5. **Window redirect to `/dashboard`** on apply success — [WizardV2.tsx:440](../src/components/website-builder/WizardV2.tsx#L440). Worth preserving so users land in the dashboard after generation.

---

## Functionality the prototype is missing

The spec implies the prototype is design-only and many existing wizard features
are not represented in the 11-screen flow. Below is a side-by-side audit.

| # | Feature | Exists in current wizard? | Location | Must preserve? | Notes |
|---|---|---|---|---|---|
| 1 | **Subdomain availability check** | **No** in wizard. | Subdomain is set at registration (passed in as a prop, displayed in preview URL bar only). | n/a | Not a wizard concern — leave alone. |
| 2 | **Photo / logo upload** | **No** in wizard. | Photos live behind `/dashboard/customization`, populated post-generation. | n/a | Out of scope. |
| 3 | **Phone number (WhatsApp / call)** | **Yes**. | [WizardV2.tsx:794-805](../src/components/website-builder/WizardV2.tsx#L794-L805); shipped to apply-theme. | **Yes** | Spec's 11 screens **do not include phone**. Open question: drop, defer to profile page, or add a 12th screen? See open questions. |
| 4 | **Social links (Instagram / TikTok)** | **Yes**. | [WizardV2.tsx:769-788](../src/components/website-builder/WizardV2.tsx#L769-L788); merged into `businesses.social_links` by apply-theme. | **Yes** | Spec's 11 screens **do not include social**. Same open question as phone. |
| 5 | **Industry normalization** | **Yes** (server-side). | [app/api/generate-variants/route.ts:33-50](../app/api/generate-variants/route.ts#L33-L50) (`normalizeGenerationIndustry`). | Yes — automatically | Server-only. Wizard sends free `industry` text + optional `industryChip`; server normalizes. The new wizard must keep both fields in the API payload. |
| 6 | **Email format validation** | **No** — wizard never collects email (set at registration). | n/a | n/a | Out of scope. |
| 7 | **Phone format validation (Kosovo)** | **No** — current wizard only does `trim()`, no regex. | [app/api/apply-theme/route.ts:60-61](../app/api/apply-theme/route.ts#L60-L61) just trims. | No (parity) | If we keep phone in the new wizard (open question 1), parity = same loose validation. |
| 8 | **Subdomain auto-generation from business name** | **No** in wizard. | Done at registration. | n/a | Out of scope. |
| 9 | **Brand-brief API call (Stage 1)** | **Yes**. | [WizardV2.tsx:300-331](../src/components/website-builder/WizardV2.tsx#L300-L331). | **Yes** | Submit handler must call this with the same field shape. |
| 10 | **Generate-variants API call (Stage 2)** | **Yes**. | [WizardV2.tsx:333-396](../src/components/website-builder/WizardV2.tsx#L333-L396). | **Yes** | Submit handler must call this with the same field shape, including the structured `wizardServices` array. |
| 11 | **Realtime progress streaming + fallback timer** | **Yes**. | [WizardV2.tsx:178-241](../src/components/website-builder/WizardV2.tsx#L178-L241). | **Yes** | The "generating" overlay in the new wizard must keep the Supabase channel subscription, the 5-substep list, and the 8s fallback advance. Spec says "remove the Mbylle prototipin button" and "connect to actual progress streaming" — that's exactly the existing wiring; reuse it. |
| 12 | **Tour / onboarding completion tracking** | **Yes** (downstream of apply). | `website_builder_completed` flag, set at [app/api/apply-theme/route.ts:52](../app/api/apply-theme/route.ts#L52). Used by [app/auth/callback/route.ts:25](../app/auth/callback/route.ts#L25) to gate dashboard redirect. | **Yes — automatic** | Preserved automatically as long as the new wizard still calls `/api/apply-theme` on submit. |
| 13 | **Field-level validation gates** | **Yes** in current wizard. | [WizardV2.tsx:246-270](../src/components/website-builder/WizardV2.tsx#L246-L270). Step 1: industry+city >= 2 chars. Step 2: businessDescription >= 10 chars. Step 4: archetypeKey set; if `custom`, both hex colors valid. Step 5: language + tone set. | **Partially** | Spec says: *"validation surfaces at submit, not per-screen, to keep the prototype-feel."* This is a behavior change — the current wizard blocks `Vazhdo` until valid; the new wizard wants to allow forward navigation and gate only at the final submit. Confirmed acceptable per spec, but it does relax the contract; need a clear submit-time error path. |
| 14 | **Booking method (`appointments / walkin / both / none`)** | **Yes**. | [WizardV2.tsx:980-995](../src/components/website-builder/WizardV2.tsx#L980-L995). Conditional on `bookingEnabled` prop. Drives whether the AI is allowed to write booking-style CTAs. | **Yes** | Spec's 11 screens **omit this entirely**. This is a substantive feature drop — `bookingMethod` is sent to all three APIs and gates AI copy choices. See open questions. |
| 15 | **Per-section layout pickers (hero / story / services / gallery)** | **Yes**. | [WizardV2.tsx:1008-1069](../src/components/website-builder/WizardV2.tsx#L1008-L1069). All four default to `'ai'`. | **Yes** | Spec's screen 10 ("Layout") describes "AI vendos" as default + a "Po preferoj të zgjedh vetë (e avancuar)" toggle that expands "the current per-section layout pickers". That maps 1:1 — keep the existing 4 pickers behind the disclosure. |
| 16 | **Custom brand colors + custom font picker** | **Yes**. | [WizardV2.tsx:1476-1596](../src/components/website-builder/WizardV2.tsx#L1476-L1596) — "Ngjyrat e mia" card with two color inputs + font dropdown + hex validation. | **Yes** (open question) | Spec's screen 9 ("Visual style") lists 6 archetype labels but **omits** the "Ngjyrat e mia" custom-colors card and the "AI vendos" archetype card. Two open questions: see below. |
| 17 | **Archetype set (count and labels)** | 8 archetypes ([src/lib/archetypes.ts:14](../src/lib/archetypes.ts#L14)): I Ngrohtë / Errësirë & Karakter / Besim & Qartësi / Gjallëri Moderne / Letër & Stil / Studioja / Familjar & Mirëpritës / Elegant & i Rafinuar. | Spec lists **6**: I Ngrohtë / Errësi & Karakter / Besim & Qartësi / Gjallëri / Letër & Stil / Familjar. | **Yes** | Mismatch: 2 archetypes (Studioja, Elegant & i Rafinuar) not in spec. Also small label drift: "Errësirë" vs "Errësi", "Familjar" vs "Familjar & Mirëpritës", "Gjallëri Moderne" vs "Gjallëri". See open questions. |
| 18 | **Live preview + regenerate flow** | **Yes**. | [WizardV2.tsx:1843-1929](../src/components/website-builder/WizardV2.tsx#L1843-L1929) — `PreviewScreen` renders `DynamicSiteRenderer` with the AI's theme, plus "↻ Rigjenero" (calls `runGeneration({ reuseBrief })`) and "Përdor këtë →" (calls `apply-theme`). | **Yes** | Spec is silent on this. The preview is a major piece of UX between "generation done" and "apply"; it must stay. Suggest treating it as a 12th screen post-summary, or as a modal — see open questions. |
| 19 | **Service description tri-state (`undefined / '' / text`)** | **Yes**. | [WizardV2.tsx:921-953](../src/components/website-builder/WizardV2.tsx#L921-L953) — `description: undefined` means "hidden, not yet asked"; `''` means "expanded, empty"; user can collapse back to `undefined`. Sent through to `wizardServices`. | **Maybe** | Spec's screen 6 lists name / price / duration / remove only — **no description**. Consistent with "+ Add a service" minimalism. Open question: drop description, or carry it forward as the same "+ shto përshkrim" affordance? |
| 20 | **`uniqueness` field word counter** | **Yes**, current wizard does NOT have one (only the description has). | [WizardV2.tsx:634-646](../src/components/website-builder/WizardV2.tsx#L634-L646) — only on `businessDescription`. | n/a | Spec says BOTH screen 4 (uniqueness) and screen 5 (description) get the muted/green word counter. That's a small enhancement, not a regression. |
| 21 | **Suggestion box ("idea prompts") for uniqueness** | **Yes**. | [WizardV2.tsx:759-766](../src/components/website-builder/WizardV2.tsx#L759-L766) — three "Vijn' tek ne se ___" prompt sentences. | Yes (preserve UX) | Spec is silent. Recommend keeping as a small helper card under the textarea on screen 4. |

---

## Discrepancies between spec and reality (worth raising)

These are cases where the spec language presumes something that does not exist
or is named differently in the current codebase. None are blocking, but each
needs a tiny decision.

### A. The prototype HTML file does **not exist**

The spec opens with `[docs/wizard-prototype.html](./wizard-prototype.html)` and
says *"following the design and flow established in the prototype."* I searched
the repo (`docs/`, repo-wide `*.html`); the file is absent. No file matching
`wizard-prototype*` exists anywhere outside `node_modules`.

The spec's textual description of each screen is detailed enough to implement
**without** the HTML, but design fidelity ("Match the prototype exactly") is
not verifiable. **Open question 0 below.**

### B. Design-token naming mismatch

The spec references *"existing LokalWeb design tokens (`--lw-bg`, `--lw-surface`,
`--lw-border`, etc.) from `docs/design-system.md`."*

Reality:
- No `--lw-*` tokens exist anywhere in the codebase (grep confirms zero matches).
- `docs/design-system.md` does **not** exist (no `docs/design*` files at all).
  `src/index.css` references `docs/design-tokens.md`, but that file is also missing.
- The actual tokens follow shadcn convention: `--background`, `--foreground`,
  `--card`, `--primary`, `--accent`, `--border`, `--muted`, `--muted-foreground`,
  `--ring`, etc. ([src/index.css:17-99](../src/index.css#L17-L99)). The current
  wizard uses these (`bg-background`, `text-foreground`, `border-border`,
  `text-muted-foreground`, gradient `from-primary to-accent`).

**Implication:** the new wizard should use the existing shadcn tokens. The spec's
"do NOT introduce new colors" rule is honored automatically because there's
nothing to migrate.

### C. Fonts mismatch

Spec says *"Instrument Serif (display, italic for emphasis), DM Sans (body),
DM Mono (meta/labels). Load from Google Fonts."*

Reality: `src/index.css` uses Geist + Geist Mono (loaded once in `app/layout.tsx`
per the comment at line 14). Adding **three new Google Fonts** to a wizard while
the rest of the app uses Geist would create a font split: the wizard typography
would not match the dashboard, customization hub, or public-site chrome.

**Open question 2 below.**

### D. Spec is silent on dashboard chrome

Both wizard host pages (`app/dashboard/website-builder/page.tsx` and
`app/register/website-builder/page.tsx`) are server components that simply
render the wizard with no surrounding chrome. The wizard owns its full-screen
layout. The new full-screen wizard fits the same shape — no chrome change needed.

---

## Open questions for human review

These need a decision before implementation:

0. **Where is `docs/wizard-prototype.html`?** Was it forgotten in a different
   branch / not committed yet? The spec language ("Match the prototype exactly")
   becomes aspirational without it. Options:
   - (a) Locate and commit the HTML; implement against it.
   - (b) Drop the "match exactly" clause; treat the spec text as the source of
     truth and let me make best-effort design calls within the LokalWeb token set.
   - (c) Defer the redesign until a prototype is produced.

1. **Where do `phoneNumber`, `instagramUrl`, `tiktokUrl`, and `bookingMethod` go?**
   The new 11-screen flow omits all four. They are non-trivial:
   - `bookingMethod` gates AI copy/CTA choices (booking-themed phrases are
     forbidden when 'none' or 'walkin' so customers don't hit broken CTAs).
   - `phoneNumber` powers the public-site contact CTAs and the post-booking
     "Send to WhatsApp" button.
   - Social URLs render in the public-site footer.
   Options:
   - (a) Add a 12th "extras" screen (phone + socials + booking method) before
     summary. Cleanest functional preservation.
   - (b) Inline them into existing screens (e.g., booking method as a chip on
     screen 2; phone+socials at the bottom of summary). Compromises one-question-
     per-screen.
   - (c) Drop them from the wizard and require the user to set them post-
     generation on `/dashboard/profile`. Loses upfront wiring on first generation.
   - **Recommendation:** (a). It keeps API contracts intact and matches the
     "one question per screen" spirit while acknowledging that some answers
     are practical bookkeeping.

2. **Fonts: Instrument Serif + DM Sans + DM Mono, or stick with Geist?**
   The rest of the app is Geist. Bringing in three new Google Fonts only for
   the wizard is a typography split. Options:
   - (a) Match prototype exactly — load the three fonts in `app/layout.tsx`
     globally so the wizard typography matches the prototype.
   - (b) Use Geist throughout. The visual character (weight contrast, italics
     for emphasis) is achievable; it just won't be Instrument Serif.
   - (c) Load Instrument Serif **only** for the wizard's display headlines,
     keep Geist for body. Compromise; modest extra font weight on the route.
   - **Recommendation:** (a) if we have the prototype HTML to match; (b) if not.

3. **Visual-style screen (#9): which archetype set?**
   The spec lists 6; the codebase has 8. Options:
   - (a) Show all 8 archetype cards (preserve full feature). Two extra rows.
   - (b) Show 6 (per spec). Drop "Studioja" and "Elegant & i Rafinuar" from the
     wizard surface but keep them as valid `archetypeKey` values that the
     `'ai'` decider can still select.
   - (c) Show 6 + an "AI decides" card + a "Custom colors" card → 8 cards.
     Matches the existing wizard's slot count, just different labels.
   - **Recommendation:** (c). Preserves the "AI decides" path (which the spec
     contradicts — it says the visual-style screen has card grids that
     auto-advance, so a single "AI decides" card on its own would be
     redundant; better as one option among the cards).

4. **Custom brand colors: keep on screen 9, drop, or move?**
   The current "Ngjyrat e mia" card is a power-user feature with hex input,
   color picker, and font dropdown. It does not fit a card-grid auto-advance
   UX. Options:
   - (a) Keep as a card on screen 9 that does NOT auto-advance — clicking it
     expands inline (current behavior). Auto-advance fires only on
     pre-validated archetypes.
   - (b) Move custom colors behind a "Po preferoj të zgjedh vetë (e avancuar)"
     toggle, mirroring screen 10's pattern. Cleanest; surfaces only when asked.
   - (c) Drop entirely. Loses a real feature.
   - **Recommendation:** (b). It's parallel to the layout-screen pattern and
     keeps the main flow simple.

5. **Live preview + regenerate flow: where in the new wizard?**
   The current step 7 (PreviewScreen) is a substantial UX surface — full site
   render, "Rigjenero" (cheap regen reusing the brief), "Përdor këtë →" (apply).
   Spec is silent on it. Options:
   - (a) Treat as a 12th screen after summary (after the user clicks "Generate
     site", show generating overlay, then preview, then apply). Closest to
     current behavior.
   - (b) Show preview as a modal/drawer on top of the summary screen.
   - (c) Apply immediately on generation success and redirect to a separate
     `/dashboard/preview` route.
   - **Recommendation:** (a). The user expects to see what they got before
     committing, and "Rigjenero" is cheap (skips brand-brief).

6. **Per-screen validation: relax to submit-only?**
   Spec says *"validation gates: button is enabled (empty values allowed for
   prototype-feel; real validation happens at submit)."* This is a real change
   — current wizard refuses to advance with empty industry/city/description.
   Options:
   - (a) Strictly per the spec: allow Vazhdo always; submit shows aggregated
     errors and jumps the user to the first invalid screen.
   - (b) Hybrid: still hard-gate the *strictly required* fields (`industry`,
     `city`, `businessDescription`) per-screen because those are server-side
     400s if missing; loosen everything else.
   - **Recommendation:** (b). Matches server reality and avoids the user
     getting deep into screens 6–10 only to be bounced back.

7. **localStorage draft restore prompt: confirm wording.**
   Spec specifies the prompt text exactly. No ambiguity. Just confirming the
   intended UX is a **modal** on wizard mount (not an inline banner) — the
   spec wording reads modal-flavored ("Po, vazhdo / Jo, fillo nga e para"
   buttons). Confirm before implementing.

8. **Service description field: keep or drop on screen 6?**
   Current wizard has a tri-state "+ shto përshkrim" affordance per row. Spec
   describes screen 6 as "name / price (€) / duration (min) / remove" only —
   no description. If we drop, descriptions are lost from the wizard (still
   editable in `/dashboard/customization` post-generation). If we keep, the row
   gets a touch more complex.
   - **Recommendation:** drop from the wizard. It's editable later in the
     customization hub, and it's the only field with a non-trivial tri-state
     UX that doesn't fit the new flow's clean lines.

---

## Summary of "what changes vs. what doesn't" if all open questions resolve as recommended

**Changes (UI-only):**
- 5 grouped steps → 11 screens (10 questions + summary), with the recommended
  12th screen for "extras" (phone + socials + booking) and a 13th preview screen.
- Per-screen animations, font swap (only if Q2 → option a), screen-level word
  counters on uniqueness + description.
- localStorage draft persistence under `lokalweb_wizard_draft_v1`.
- Auto-advance on cards (screens 7/8/9), keyboard nav (Enter/Esc/Tab).
- Submit-only validation for non-critical fields; hard-gate `industry`/`city`/
  `businessDescription`.
- Edit-from-summary navigation.

**Stays unchanged:**
- All three API contracts (`/api/brand-brief`, `/api/generate-variants`,
  `/api/apply-theme`).
- `WizardInput` shape (with the recommended drop of `service.description`,
  which is optional and the API tolerates omission).
- Realtime progress streaming + 8s fallback timer.
- `website_builder_completed` flag wiring (downstream of apply-theme).
- Preview + regenerate UX.
- Industry normalization (server-side, untouched).
- Custom brand colors + custom font picker (relocated behind an advanced toggle
  per Q4 → option b, but field semantics unchanged).
- Per-section layout pickers (relocated to screen 10's advanced toggle).

---

## Files expected to change (best estimate, pending decisions)

- `src/components/website-builder/WizardV2.tsx` → replaced (or renamed
  `Wizard.tsx`).
- New: `src/components/website-builder/wizard/` directory with one file per
  screen (`Screen01BusinessName.tsx`, etc.) plus shared `ScreenShell.tsx`,
  `useLocalStorageDraft.ts`, `ServicesEditor.tsx`.
- `app/dashboard/website-builder/page.tsx` → 1-line import swap.
- `app/register/website-builder/page.tsx` → 1-line import swap.
- `docs/architecture.md` → update the wizard description.
- Maybe `app/layout.tsx` if Q2 → option (a) (add Instrument Serif/DM Sans/DM Mono).
- Maybe `tests/wizard-harness/run.ts` selector updates if any harness step
  targets the old DOM.

## Files that MUST NOT change (per spec, confirmed)

- `app/api/brand-brief/route.ts`
- `app/api/generate-variants/route.ts`
- `app/api/apply-theme/route.ts` *(spec doesn't list this, but its contract is
  load-bearing — if we don't change the wizard's submit body, this is safe)*
- `src/lib/types/customization.ts` — `WizardInput` shape (additions OK; field
  removals would break existing apply-theme code paths).
- All RLS, migrations, the post-processor, the renderer, all dashboard pages.

---

## Stop here

Per the spec, implementation does not begin until this report is reviewed and
the open questions above are answered. Ready to proceed once you respond.
