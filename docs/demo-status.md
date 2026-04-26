# LokalWeb Demo Status

Live tracker for the polish + bug-fix pass. Updated as work progresses. Demo is in **1 week**.

Plan file: `C:\Users\genti\.claude\plans\lokalweb-polish-glowing-waffle.md`

---

## Decisions locked

1. **Chrome fonts**: Geist + Geist Mono (matches `docs/design/lokalweb-prototype.html`). Tenant fonts (`dm-sans | inter | poppins | playfair`) unchanged.
2. **Single design source**: `docs/design/lokalweb-prototype.html`. Repo-root `prototype.html` queued for deletion.
3. **`custom_website_html` is dead** — column dropped in migration `013` after demo verification. Read paths removed in Phase 4.6.
4. **Bookings RLS**: SECURITY DEFINER RPC `get_booked_slots(business_id, day)` for public site; `bookings.SELECT` locked to owner. Migration `011`.
5. **CSS variable namespace**: shadcn names. Hex stored in DB; hex→HSL conversion at runtime in `ThemeProvider.applyThemeToDocument()` and `app/[subdomain]/page.tsx`'s `themeStyles` builder.

---

## Migrations to apply (in order)

**The user applies these manually in the Supabase SQL Editor.** Apply in numerical order. After each, run the verification query to confirm.

| File | Status | Phase | One-liner |
|---|---|---|---|
| `007_business_metadata_columns.sql` | 📄 written, ⏳ apply manually | Phase 3 prereq, 4.1 | `tagline`, `founded_year`, `timezone` on `businesses` |
| `008_bookings_party_size_and_uniqueness.sql` | 📄 written, ⏳ apply manually | Phase 4.1, 4.4 | `party_size` column + partial unique index on `(business_id, appointment_at)` |
| `009_industry_normalization_completion.sql` | 📄 written, ⏳ apply manually | Phase 4.6 | Migrate any `'beauty-salon'` → `'beauty_salon'`; CHECK constraint |
| `010_ai_usage_rate_limit.sql` | 📄 written, ⏳ apply manually | Phase 4.2b | `ai_usage` table for daily AI request rate limit |
| `011_rls_tightening.sql` | 📄 written, ⏳ apply manually | Phase 4.3 | Lock `bookings.SELECT` to owner; create `get_booked_slots(business_id, day)` RPC; verify policies on `website_customization` & `gallery_items` |
| ~~`012_customization_hsl_migration.sql`~~ | ❌ skipped | — | Not needed (hex storage retained) |
| `013_drop_custom_website_html.sql` | 📄 written, ⏳ apply manually | Phase 4.6 | Drop dead `custom_website_html` column. **Apply LAST**, after demo verification. |
| `014_wizard_v2_columns.sql` | 📄 written, ⏳ apply manually | Wizard v2 | **Required before testing the new AI wizard flow.** Adds `site_language`, `site_tone`, `hero_style`, `section_priority`, `density`, `uniqueness_statement`, `booking_method` to `website_customization`. |

**IMPORTANT — apply order matters.** Run 007 → 008 → 009 → 010 → 011, then verify demo end-to-end, then 013. The booking drawer's slot-conflict check now calls the `get_booked_slots` RPC defined in 011 — until 011 is applied, slot lookups fall back to throwing (drawer surfaces a "could not load" message but reservations still go through, since the partial unique index in 008 catches races at insert).

### How to apply each

1. Open Supabase Studio → SQL Editor.
2. Paste the contents of `docs/migrations/<file>.sql`. Click **Run**.
3. Run the verification query in the file's header comment.
4. Update this doc (mark status ✅ applied + date).

---

## Completed

### Phase 0
- ✅ Baseline `tsc --noEmit` and `next build` both clean.
- ✅ Wrote `docs/design-tokens.md`.
- ✅ Initialized this file (`docs/demo-status.md`).

### Phase 1 — Token Foundation ✅
- ✅ Wrote prototype-aligned `:root` and `.dark` blocks in `src/index.css`. Cream/cobalt light, ink/dark surface stack dark. Added `--success`, `--warning`, `--info` (previously dead). Added `--font-heading`. Removed duplicate Google Fonts `@import`.
- ✅ `tailwind.config.ts`: switched `font-sans`/`font-mono` to `var(--font-sans)`/`var(--font-mono)`, added `font-heading`, added `info` color slot.
- ✅ `app/layout.tsx`: chrome fonts → Geist + Geist Mono. Tenant fonts (DM Sans, Inter, Poppins, Playfair) still loaded.
- ✅ Added `hexToHsl()`, `fontFamilyOf()`, `isMainDomain()` helpers in `src/lib/utils.ts`.
- ✅ `ThemeProvider.applyThemeToDocument()` rewritten — writes shadcn names (`--primary`, `--background`, `--foreground`, `--card`, `--border`, `--ring`, `--font-heading`, `--font-sans`) in HSL component format, with hex→HSL conversion.
- ✅ `app/[subdomain]/page.tsx` SSR `themeStyles` builder mirrored to shadcn names.
- ✅ `BarberShopFirstTemplate.tsx` migrated from `var(--bg-color)` etc. to semantic Tailwind (`bg-background`, `text-foreground`, `font-heading`).
- ✅ `CustomizationHub` preview components (`PreviewPane`, `PreviewServices`, `PreviewHero`) migrated to scoped shadcn vars + semantic classes.
- ✅ `ThemeVariables` interface in `src/lib/types/customization.ts` updated to shadcn names.
- ✅ Acceptance: grep returns zero hits for old var names. `tsc --noEmit` clean. `next build` clean.

**Carried into Phase 2/3:** Hub UI itself still uses some hardcoded chrome hex (top bar, container shadows). Will be cleaned in Phase 2.5.

### Phase 2 — Chrome Beauty Pass ✅
- ✅ **Landing page** — `app/page.tsx` already used semantic tokens; Phase 1's token migration flows through automatically.
- ✅ **Dashboard shell** — `app/dashboard/layout.tsx` and `src/components/DashboardSidebar.tsx` already used semantic tokens.
- ✅ **Dashboard pages swept** — `bookings/page.tsx` (50 hex literals → tokens), `customization/page.tsx`, `website-builder/page.tsx`, `register/page.tsx` (one stray). All semantic now.
- ✅ **CustomizationHub UI swept** — `ColorPicker`, `ColorSection`, `TypographySection`, `LayoutSection`, `GallerySection`, `GallerySectionItem`, and the Hub `index.tsx`. Save button uses `from-primary to-accent` gradient. The Hub form uses chrome tokens, not hardcoded ones.
- ✅ **`website-builder-choice` fork** — `bg-[#0a0a0f]` → `bg-background`, etc. Cobalt-tinted card aesthetic preserved.

### Phase 3 — Template polish ✅
**Demo blockers:**
- ✅ **`BarberShopFirstTemplate.tsx`** — `EST. 2015` → `EST. {business.foundedYear}` (conditional), `MORE THAN A HAIRCUT` → `business.tagline ?? business.name`, fake `12+ YEARS / 2000+ HAPPY CLIENTS` → `yearsActive` (computed from `foundedYear`) + `services.length`, Unsplash hero/about → gradient placeholders (`from-primary/30 via-background to-accent/20`), footer year now uses `currentYear`.
- ✅ **`BarbershopModern.tsx`** — `Est. 2015 · Prishtina, KS` floating card → conditional `Est. {foundedYear}` + `business.address`. Fake `12+ / 2,000+` stats → `yearsActive` + `services.length`. Hero + story Unsplash → gradients. `bg-[#0a0a0f]` → `bg-background`, `bg-[#080808]` → `bg-card`.
- ✅ **`RestaurantBistro.tsx`** — Hardcoded `Est. 2018 · Prishtina` → conditional `Est. {foundedYear}`. `WHERE EVERY PLATE TELLS A STORY` default → `business.name.toUpperCase()`. `FOOD IS OUR LANGUAGE` → `business.tagline ?? business.name.toUpperCase()`. Fake `6 YEARS OPEN / 100% SCRATCH KITCHEN / Daily FRESH SPECIALS` stats → `yearsActive` + `services.length`. Hero + story Unsplash → gradients. Hardcoded orange `#d97706` → `bg-primary`. `bg-[#0d0d0d]/[#111111]` → `bg-background`/`bg-card`.

**Polish:**
- ✅ **`ClinicPremium.tsx`** — 63 hex literals → tokens. Fake `15+ Years / 4.9★ / 2,000+` stats → conditional `yearsActive` + `services.length`. Fake doctor team with Unsplash stock photos + invented names (`Dr. Arben Krasniqi` etc) **REMOVED entirely** (commented out with note to re-add when team CRUD lands). Floating "4.9 ★ Patient Rating / 2,000+ patients served" card → removed. Hero Unsplash → gradient.
- ✅ **`BarbershopMinimal.tsx`** — 1 hex literal swapped.
- ✅ **`RestaurantElegant.tsx`** — 21 → 0. Orange `#d97706` → `primary`.
- ✅ **`ClinicClean.tsx`** — already token-clean (audit count: 0).
- ✅ **`ClinicModern.tsx`** — 16 → 0. Teal `#0d9488` → `primary`. Hero Unsplash → gradient.
- ✅ **`BeautyLuxury.tsx`** — 21 → 0. Purple `#a855f7` → `primary`.
- ✅ **`BeautyMinimal.tsx`** — 16 → 0. Pink `#f472b6` → `primary`.
- ✅ **`RestaurantCasual.tsx`** — already token-clean.

**Verification:** `grep -r '\[#' src/components/templates/custom/` returns zero. Every custom template now honors `--primary`/`--background`/`--card`/`--foreground` from the tenant's `WebsiteCustomization`. Changing the primary color in the Hub will visibly change every template's primary surfaces on the public site.

### Phase 4 — Bug fixes for demo safety
- ✅ **4.1 booking timezone + duration + race** — extracted slot logic into `src/lib/services/bookingService.ts` (`generateAvailableSlots`, `fetchBookedSlots`, `wallClockToUtc`, `dayOfWeekInTz`, `ymdInTz`, `formatTimeInTz`, `isUniqueViolation`). Both drawers rewritten: business-timezone-aware (defaults to `Europe/Belgrade`), service-duration-aware conflict detection, RPC-based public slot lookup, 23505 unique-violation handling.
- ✅ **4.2 API ownership checks** — wrote `src/lib/api-auth.ts` (`requireUser`, `requireBusinessOwner`, `bumpAiUsage`). Applied to `apply-theme`, `customization/[businessId]` (GET + PATCH), `gallery/[businessId]/upload`, `gallery/[businessId]/[itemId]`. Pattern mirrors `app/api/export-report/route.ts`.
- ✅ **4.2b AI rate limit** — `brand-brief` and `generate-variants` require auth + bump `ai_usage` (10/day default). Fail-open with warning if migration 010 not applied yet.
- ✅ **4.3 app-side safe column allowlist** — `app/[subdomain]/page.tsx` `select(...)` no longer uses `*`; explicit columns only, `owner_id` excluded from public payload.
- ✅ **4.5 phone validation** — `validateKosovoPhone` wired into both booking drawers. Blocks submit + inline error.
- ✅ **4.6 partial — `custom_website_html` dead refs removed** — type field, SSR mapping, store mapping, and the explicit-null write in `apply-theme` all gone. Migration 013 still pending DB-side drop.
- ✅ **4.7 middleware quick wins** — `isMainDomain` extracted to `src/lib/utils.ts` and shared with `app/layout.tsx`. Auth-page redirect list expanded to cover `/forgot-password`, `/reset-password`, all `/register/*`. Fixed dead-code bug introduced by the refactor (`!isMainDomain` was always false because the variable became a function reference).
- ⏳ **4.4 party_size dashboard display** — pending. Column persists; just needs to show in `/dashboard/bookings`.
- ⏳ **4.8 cleanup deletions** — deferred until user confirms each: 4 legacy templates, `app/temp-gallery/page.tsx`, `src/lib/{debug-store,test-profiles}.ts`, repo-root scratch files.

---

## Deferred (post-demo)

- Replace base64 gallery upload with Supabase Storage / CDN (architectural; weeks)
- Merge `BookingDrawer` + `RestaurantBookingDrawer` (cleanup)
- Restaurant menu category structure (`menu_items` table)
- View-based public split for `businesses.SELECT` (column-level public exposure)
- Captcha on `bookings.INSERT` beyond `appointment_at > now()`
- Holidays / closures / lead-time settings on `business_hours`
- Sonner-vs-toast consolidation
- Section-aware galleries (templates only consume `galleryImages[0..1]`)

---

## Known issues (acceptable for demo)

*populated as discovered during the pass*

- `businesses.SELECT` RLS remains `USING(true)` at the policy level. The application layer (`app/[subdomain]/page.tsx`) selects only safe columns, so the public website does not surface owner email/phone, BUT direct `GET /rest/v1/businesses?select=*` with the anon key still returns those fields. Production fix is a `businesses_public` view; deferred to post-demo.

---

## Manual steps still needed before demo

1. **Apply migrations 007–011 in Supabase SQL Editor** in numeric order. Each file's header has the verification query. Migration 011 is the most consequential — it locks down `bookings.SELECT` and creates the `get_booked_slots` RPC that the public booking drawer now depends on. **Until 011 is applied, the public booking flow's slot-conflict greying may show "could not load" in the console; bookings still go through, the partial unique index from 008 catches races at insert.**
2. **Walk through the demo path** in the plan's verification checklist. Most relevant changes to manually verify:
   - Customization Hub primary-color change → public site updates within 5 seconds, dashboard buttons/badges update.
   - Booking drawer in business-local timezone (test with system clock offset to UTC if you want to be sure).
   - Open one of the API endpoints with `curl -X POST /api/apply-theme -d '...'` (no auth) → expect 401.
3. **Hold on migration 013** until after the demo — it drops `custom_website_html`. Code is already cleaned up so dropping won't break anything, but no point doing it during demo week.
4. **Phase 4.8 cleanups need confirmation** — do not run any of these without an explicit go-ahead:
   - Delete the 4 legacy templates `src/components/templates/{Barbershop,Beauty,Restaurant,Clinic}Template.tsx`
   - Delete `app/temp-gallery/page.tsx`
   - Delete `src/lib/{debug-store,test-profiles}.ts`
   - Delete repo-root `prototype.html` / `apply_fixes.py` / `apply_sidebar.cjs`

## What was deferred

- **Phase 4.8 cleanup deletions** — orphaned files identified during audit; deletion needs explicit user confirm. List below in "Manual steps."
- **Auth-page chrome restyle (Phase 2.2)** — `/login`, `/forgot-password`, `/reset-password` already use semantic tokens; no edits made. They visually inherit Phase 1's tokens. If the prototype's centered-card aesthetic differs from the current layout enough to matter, that's a follow-up.
- **Stats granularity** — templates now show only `yearsActive` and `services.length`. Bookings count, completed-appointments count, and rating average would be richer but require new fields on the businesses table.
- **Per-template aesthetic polish** — token migration is complete (every template honors `--primary`/`--background`/`--card`/`--foreground`), but I did NOT redesign the layouts to match the prototype's spacing rhythm or type hierarchy. Each template kept its existing structure; only the colors+fonts now flow from tokens. A redesign-style pass per template (matching prototype's button shapes, container max-widths, etc.) is post-demo work.

## Quick reference for the next contributor

- **Token rename surface area** is now zero — `grep -r 'primary-color\|bg-color\|text-color\|surface-color\|muted-text-color\|border-color\|heading-font\|body-font' src/ app/` returns no hits. Any new code MUST use shadcn names (`--primary`, `--background`, `--foreground`, `--card`, `--border`, `--font-heading`, `--font-sans`).
- **Hex storage in DB is unchanged.** Hex→HSL happens at runtime in two places only: `src/lib/customization/ThemeProvider.tsx::applyThemeToDocument()` (browser) and `app/[subdomain]/page.tsx`'s `themeStyles` builder (server). Both use `hexToHsl()` from `src/lib/utils.ts`.
- **API ownership pattern**: `requireBusinessOwner(supabase, businessId)` from `src/lib/api-auth.ts`. Returns either a User or a `NextResponse` to return directly. Mirror the pattern in `app/api/export-report/route.ts` if you need to verify.
- **Booking slot generation**: `generateAvailableSlots()` in `src/lib/services/bookingService.ts` is the single source of truth — pure function, easy to unit-test. Both drawers consume it.
