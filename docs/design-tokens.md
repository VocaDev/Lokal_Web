# LokalWeb Design Tokens

Source of truth: `docs/design/lokalweb-prototype.html`. Tokens here are the reference for `src/index.css`, `tailwind.config.ts`, and component restyles. This document is descriptive — when the live app and this doc disagree, **fix the app, not the doc**.

Conventions:
- shadcn HSL component format (`220 91% 58%`, no `hsl(...)` wrapper) for everything wired through `tailwind.config.ts`
- Tenant-customizable tokens (per-business via Customization Hub): `--primary`, `--accent`, `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--font-heading`, `--font-sans`
- Chrome-fixed tokens (NOT tenant-customizable): `--success`, `--warning`, `--info`, `--destructive`, `--ring`, `--font-mono`, `--radius`

---

## Color palette

### Primary (cobalt)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `--primary` | `#1d4ed8` | `224 76% 48%` | Primary CTAs, active states, links, focus rings |
| (hover) | `#1e40af` | `226 71% 40%` | Primary button hover |

### Light mode neutrals

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `--background` | `#fafaf7` | `60 14% 98%` | Page background (cream) |
| `--card` (light surface) | `#ffffff` | `0 0% 100%` | Cards, elevated surfaces, inputs |
| `--secondary` | `#f3f1ec` | `40 17% 93%` | Section backgrounds, subtle fills |
| `--foreground` | `#0f172a` | `222 47% 11%` | Primary text |
| `--muted-foreground` | `#475569` | `215 19% 35%` | Secondary text, subtitles |
| (hint) | `#94a3b8` | `215 20% 65%` | Placeholders, helper text |
| `--border` | `rgba(15,23,42,0.08)` | — | Subtle borders |
| (border-strong) | `rgba(15,23,42,0.14)` | — | Input outlines, prominent borders |

### Dark mode neutrals

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `--background` | `#0a0a0f` | `240 22% 5%` | Page background |
| `--card` | `#151522` | `240 23% 11%` | Cards, primary surface |
| (surface-2) | `#1e1e35` | `240 28% 16%` | Elevated surface |
| `--foreground` | `#e8e8f0` | `240 19% 92%` | Primary text |
| `--muted-foreground` | `#8888aa` | `240 18% 60%` | Secondary text |
| (meta) | `#5a5a7a` | `240 15% 42%` | Tertiary, metadata, timestamps |
| `--border` | `rgba(120,120,255,0.12)` | — | Subtle borders |
| (border-strong) | `rgba(120,120,255,0.22)` | — | Prominent borders |

### Status colors (chrome-fixed)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `--success` | `#16a34a` | `142 71% 36%` | Confirmations, "open" badges, ✓ marks |
| `--warning` | `#d97706` | `30 91% 44%` | Pending, caution, amber alerts |
| `--destructive` | `#dc2626` | `0 73% 50%` | Error states, delete actions |
| `--info` | `#2563eb` | `221 83% 53%` | Informational tone (rare) |

### Accent (defaults; tenant-overridable)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `--accent` | `#8b5cf6` | `258 90% 66%` | Secondary brand accent (gradients, decorative) |

### Specialty palettes (template-only AI moods, NOT chrome)

These are MOOD presets used by `WebsiteBuilderWizard` to seed `WebsiteCustomization` for new tenants. Chrome never uses them directly.

- **Heritage** (gold/tan, barbershop): `#c9a876`, `#f4e4cc`, `#8b6f47`
- **Salon** (rose/mauve, beauty): `#d4a8c4`, `#f4dee8`, `#2a1a2a`
- **Fitness** (orange/fire, gym): `#ff8c4d`, `#ef4444`, `#2a1812`
- **Clinical** (blue, healthcare): `#2a4a6a`, `#f0f4f8`, `#d4e4f0`
- **Bistro** (warm brown, restaurant): `#d9b27c`, `#2c1f12`, `#fef9f0`

---

## Typography

### Font families

| Family | Role | Weights |
|---|---|---|
| `Geist` | Chrome body, buttons, labels (`--font-sans`) | 400, 500, 600, 700 |
| `Geist Mono` | Eyebrows, timestamps, code (`--font-mono`) | 400, 500 |
| `Georgia, serif` | Heritage / accent for templates only | — |

Tenant-side options (Customization Hub `WebsiteCustomization.heading_font` / `body_font`):
`'dm-sans' | 'inter' | 'poppins' | 'playfair'`. These remain loaded in `app/layout.tsx`.

### Type scale

| Token / class | Size | Weight | Line height | Letter spacing | Usage |
|---|---|---|---|---|---|
| `text-display` (h1) | 76px | 600 | 1.02 | -0.025em | Hero headlines |
| `text-h2` | 56px | 600 | 1.10 | -0.020em | Section headers |
| `text-h3` | 48px | 600 | 1.10 | -0.020em | Subsection titles |
| `text-lg` (body large) | 18px | 400 | 1.65 | — | Hero paragraph |
| `text-base` | 16px | 400 | 1.65 | — | Body copy |
| `text-sm` | 15px | 400 | 1.60 | — | Lists, dense content |
| `text-button` | 14px | 500 | — | — | CTA labels |
| `text-label` | 13px | 500 | — | — | Form labels |
| `text-xs` | 12px | 400 | — | — | Metadata, helper text |
| `text-eyebrow` | 11px | 500 | — | 0.12em–0.14em | Section eyebrows (uppercase, mono) |
| `text-micro` | 10px | 600 | — | 0.10em–0.15em | Chip labels (uppercase) |

---

## Spacing scale

8px base; common values: `4 6 8 10 12 14 16 20 24 28 32 36 40 48 56 80 100 120` (px).

| Layer | Value |
|---|---|
| Container max-width | `1280px` (shell), `1200px` (content), `1100px` (dashboard), `1000px` (onboarding), `720px` (forms) |
| Mobile viewport | `390px` w/ 12px border, 36px radius (device mockup) |
| Section vertical rhythm | `100–120px` between major sections |
| Card padding (default) | `24px` |
| Card padding (pricing/feature) | `32px 28px` |
| Form field padding | `12px 14px` |
| Button padding | `11px 22px` (default), `14px 28px` (lg), `8px 14px` (sm) |
| Navbar padding | `18px 36px` |
| Sidebar padding | `20px 12px` |
| Sidebar nav item | `9px 14px` |

---

## Border radius scale

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | `4px` | Small chips, badges |
| `--radius-sm` | `6px` | Service price tags, filter pills |
| `--radius` | `8px` | Form inputs, sidebar nav, default buttons |
| `--radius-md` | `10px` | Cards, sticky headers |
| `--radius-lg` | `12px` | Modal cards, hero images |
| `--radius-xl` | `14px` | Service cards, dashboard cards, template tiles |
| `--radius-2xl` | `18px` | Pricing cards, onboarding cards |
| `--radius-3xl` | `20px` | Variant picker, large feature cards |
| `--radius-full` | `999px` | Pills, toggles, navigation bubbles |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-focus` | `0 0 0 3px rgba(29,78,216,0.10)` | Input/button focus ring |
| `--shadow-sm` | `0 8px 16px rgba(15,23,42,0.08)` | Subtle elevation (light mode) |
| `--shadow` | `0 8px 24px rgba(0,0,0,0.30)` | Standard card shadow (dark mode) |
| `--shadow-lg` | `0 16px 40px rgba(0,0,0,0.50)` | Floating panels |
| `--shadow-xl` | `0 24px 48px rgba(0,0,0,0.40)` | Device mockup, modals |
| `--shadow-glow` | `0 0 40px rgba(29,78,216,0.40)` | Success / hero glow |

---

## Transitions & animation

- Standard: `transition: all 0.15s` (button hover, state change)
- Focus: `transition: border-color 0.15s, box-shadow 0.15s`
- Modal / overlay: `transition: opacity 0.30s`
- Hover lift: `transform: translateY(-1px)`
- Click compress: `transform: scale(0.95)`

Keyframes:

```css
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes blink  { 50% { opacity: 0.3; } }
@keyframes pulse  { 0%,100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.4; transform: scale(1.3); } }
```

Backdrop blur (navbar / sticky):
```css
backdrop-filter: blur(14px);
-webkit-backdrop-filter: blur(14px);
```

---

## Component patterns

### Primary button

```css
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 11px 22px;
  font-family: var(--font-sans); font-weight: 500; font-size: 14px;
  background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  border: none; border-radius: var(--radius); cursor: pointer;
  transition: all 0.15s;
}
.btn-primary:hover { background: hsl(var(--primary) / 0.9); transform: translateY(-1px); }
.btn-lg { padding: 14px 28px; font-size: 15px; }
.btn-sm { padding:  8px 14px; font-size: 13px; }
```

### Ghost (secondary) button

```css
.btn-ghost {
  background: transparent; color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  transition: all 0.15s;
}
.btn-ghost:hover { background: hsl(var(--card)); border-color: hsl(var(--muted-foreground)); }
```

### Input

```css
input, select, textarea {
  width: 100%; padding: 12px 14px;
  font-family: var(--font-sans); font-size: 14px;
  background: hsl(var(--card)); color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.10); }
```

### Card

```css
.card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 24px;
}
```

### Pricing card (feature variant)

- Default: `bg-card`, `border`, `radius 18px`, `padding 32px 28px`
- Featured: `bg-foreground` (inverts), `text-background`, `translateY(-12px)`, badge pinned at top with `bg-primary text-primary-foreground`, `rounded-full`, eyebrow style

### Badge / chip

```css
.badge-tonal {
  background: hsl(var(--primary) / 0.10);
  color: hsl(var(--primary));
  padding: 3px 8px; border-radius: 4px;
  font-size: 10px; font-weight: 500;
}
.badge-pill {
  background: hsl(var(--primary) / 0.10);
  color: hsl(var(--primary));
  padding: 5px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 600;
}
```

### Navbar (sticky, glass)

```css
nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 36px;
  background: hsl(var(--background) / 0.94);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid hsl(var(--border));
}
```

### Sidebar (dashboard)

```css
aside {
  width: 240px;
  display: flex; flex-direction: column;
  padding: 20px 12px;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 14px; margin-bottom: 2px;
  border-radius: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.nav-item.active {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  border-left: 3px solid hsl(var(--primary));
}
.nav-item:hover:not(.active) { background: hsl(var(--foreground) / 0.04); }
```

### Hero (landing)

```css
section.hero {
  display: grid; grid-template-columns: 1fr 1.05fr;
  gap: 64px; align-items: center;
  max-width: 1200px; margin: 0 auto;
  padding: 100px 36px 120px;
}
h1 {
  font-size: 76px; font-weight: 600;
  line-height: 1.02; letter-spacing: -0.025em;
  margin-bottom: 24px;
}
section.hero p {
  font-size: 18px; line-height: 1.65;
  color: hsl(var(--muted-foreground));
  max-width: 46ch; margin-bottom: 32px;
}
```

### Footer

```css
footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32px 36px;
  background: hsl(var(--secondary));
  border-top: 1px solid hsl(var(--border));
}
footer a { font-size: 13px; color: hsl(var(--muted-foreground) / 0.8); }
```

---

## Aesthetic principles

1. **Cool palette only.** No warm-tinted neutrals in chrome (warm tones are tenant-side template moods). `--background` cream is `#fafaf7` (not `#fffaf0`).
2. **Generous whitespace.** Section vertical rhythm is `100–120px`; card padding is generous (24–32px).
3. **Tight headlines.** Display sizes use negative letter-spacing (`-0.02em` to `-0.025em`).
4. **Glass surfaces.** Sticky navbar uses `backdrop-filter: blur(14px)` over background-with-alpha.
5. **Cobalt accent everywhere.** Focus rings, active states, primary CTAs all converge on `--primary` (cobalt). Nothing competes for attention.
6. **Consistent radius family.** 8/10/14/18 dominate; avoid stacking different radii in the same component.
7. **Subtle motion.** All transitions are `0.15s`; hover lift is `1px`; click compress is `0.95`. No bouncy or spring animations in chrome.
