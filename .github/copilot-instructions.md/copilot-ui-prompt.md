# LokalWeb — Full UI Rework Prompt for GitHub Copilot

Paste this entire prompt into Copilot Chat (or use it as a starting context block).
Then follow up with page-specific sections below for each file you're working on.

---

## MASTER CONTEXT (always include this first)

You are helping rework the UI of **LokalWeb** — a multi-tenant Website-as-a-Service platform for small businesses in Kosovo (barbershops, restaurants, clinics, beauty salons). The stack is **Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase**.

### Design System — apply these rules to EVERY component you write

**Colors (use these exact hex values, never invent new ones):**

```
Page background:     #0a0a0f
Surface (cards):     #151522
Raised surface:      #1e1e35   ← inputs, dropdowns, hover surfaces
Border default:      rgba(120, 120, 255, 0.12)
Border emphasis:     rgba(120, 120, 255, 0.22)   ← hover, focus, active
Brand blue:          #4f8ef7
Brand violet:        #8b5cf6
Brand gradient:      linear-gradient(135deg, #4f8ef7, #8b5cf6)
Blue tint:           rgba(79, 142, 247, 0.15)     ← badge/pill backgrounds
Violet tint:         rgba(139, 92, 246, 0.15)
Text primary:        #e8e8f0   ← headings
Text muted:          #8888aa   ← body copy
Text very muted:     #5a5a7a   ← labels, meta, captions
Success tint/text:   rgba(34,197,94,0.15)  /  #4ade80
Warning tint/text:   rgba(251,191,36,0.15) /  #fbbf24
Danger tint/text:    rgba(239,68,68,0.15)  /  #f87171
```

**Typography:**

- Font: `DM Sans` for everything. `DM Mono` only for code, tag values, subdomain previews.
- Import via: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Mono&display=swap')`
- Headings: `text-[#e8e8f0]` — never pure white #ffffff
- Body copy: `text-[#8888aa]`
- Meta/labels: `text-[#5a5a7a]`
- Gradient text (ONLY on hero headline, stat numbers, logo mark): `bg-gradient-to-br from-blue-400 to-violet-500 bg-clip-text text-transparent`

**Border radius:**

- Buttons and inputs: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Modals and panels: `rounded-2xl` (16px)
- Pills and badges: `rounded-full`

**Tailwind class patterns (copy-paste these directly):**

```
Page bg:            bg-[#0a0a0f]
Card surface:       bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl
Raised surface:     bg-[#1e1e35] border border-[rgba(120,120,255,0.22)] rounded-xl
Gradient text:      bg-gradient-to-br from-blue-400 to-violet-500 bg-clip-text text-transparent
Primary button:     bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6] text-white font-semibold rounded-lg px-5 py-2.5 hover:opacity-90 active:scale-[0.97] transition-all duration-150
Outline button:     border border-[#4f8ef7] text-[#4f8ef7] rounded-lg px-5 py-2.5 hover:bg-[rgba(79,142,247,0.15)] transition-all duration-200
Ghost button:       bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] rounded-lg px-5 py-2.5 transition-all duration-150
Input field:        bg-[#1e1e35] border border-[rgba(120,120,255,0.22)] rounded-lg px-3 py-2.5 text-[#e8e8f0] placeholder:text-[#5a5a7a] focus:border-[#4f8ef7] outline-none transition-colors duration-200 w-full
Input label:        text-xs font-semibold text-[#8888aa] mb-1 block
Card hover lift:    transition-all duration-250 hover:-translate-y-1 hover:border-[rgba(120,120,255,0.3)]
Badge blue:         bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] rounded-full px-3 py-0.5 text-xs font-semibold
Badge green:        bg-[rgba(34,197,94,0.15)] text-[#4ade80] rounded-full px-3 py-0.5 text-xs font-semibold
Badge amber:        bg-[rgba(251,191,36,0.15)] text-[#fbbf24] rounded-full px-3 py-0.5 text-xs font-semibold
Badge danger:       bg-[rgba(239,68,68,0.15)] text-[#f87171] rounded-full px-3 py-0.5 text-xs font-semibold
Sidebar active:     bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] rounded-lg
Sidebar inactive:   text-[#8888aa] hover:bg-[#1e1e35] hover:text-[#e8e8f0] rounded-lg transition-all duration-150
Stat number:        text-2xl font-black text-[#4f8ef7]
Section label:      text-xs font-semibold uppercase tracking-widest text-[#5a5a7a]
Divider:            border-t border-[rgba(120,120,255,0.12)]
```

**Hard rules — never break these:**

1. No white or light backgrounds anywhere. Every surface is dark.
2. Gradient text only on: hero headline, stat numbers, logo mark. Nowhere else.
3. No box-shadows. Use border + bg difference for depth.
4. No blobs, glows, or dot-grid texture outside the landing page hero section.
5. Borders are always rgba semi-transparent — never solid opaque.
6. Icons: Lucide React only (already in shadcn/ui). No mixing icon sets.
7. Do NOT change any logic, Supabase calls, routing, or TypeScript types — only restyle the JSX and Tailwind classes.
8. Do NOT remove or rename any props, functions, or component names.
9. Keep all `'use client'` directives exactly where they are.
10. Preserve all `useEffect`, `useState`, and async patterns exactly as written.

---

## PAGE-SPECIFIC PROMPTS

Use each section below when working on that specific file.

---

### 1. app/layout.tsx — Root Layout

```
Restyle app/layout.tsx using the LokalWeb design system.

- Set <body> background to bg-[#0a0a0f]
- Set default font to DM Sans via a className or a globals.css import
- Add the Google Fonts import for DM Sans (400, 500, 600, 700, 900) and DM Mono to the <head>
- Set the html element to have a dark color scheme: style={{ colorScheme: 'dark' }}
- Do not change any metadata, Supabase session logic, or children rendering
```

---

### 2. app/page.tsx — Landing Page

```
Restyle the LokalWeb landing page (app/page.tsx) using the design system below.
Do NOT change any logic, routing, or data. Only restyle JSX and Tailwind classes.

NAVBAR:
- Background: bg-[#0a0a0f]/90 backdrop-blur-md sticky top-0 z-50 border-b border-[rgba(120,120,255,0.12)]
- Height: h-16
- Logo: "LokalWeb" in font-black with gradient text (from-blue-400 to-violet-500 bg-clip-text text-transparent)
- Nav links: text-[#8888aa] hover:text-[#e8e8f0] font-medium text-sm transition-colors duration-150
- "Log In" button: outline style — border border-[#4f8ef7] text-[#4f8ef7] rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[rgba(79,142,247,0.15)]
- "Get Started" button: primary gradient — bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90
- Dark/light mode toggle: Sun/Moon icon (Lucide), ghost style, text-[#8888aa]
- Mobile: hamburger menu (Menu icon from Lucide) that opens a drawer with the same nav links stacked vertically on bg-[#151522]

HERO SECTION:
- Full page section, relative overflow-hidden, bg-[#0a0a0f]
- Two background blobs (position absolute, pointer-events-none, z-0):
  - Blue blob: w-[500px] h-[500px] rounded-full bg-[rgba(79,142,247,0.12)] blur-[80px] top-[-100px] left-[-100px] animate-pulse
  - Violet blob: w-[400px] h-[400px] rounded-full bg-[rgba(139,92,246,0.10)] blur-[80px] bottom-[-80px] right-[-80px] animate-pulse delay-[2000ms]
- Dot grid texture on the section: bg-[radial-gradient(rgba(120,120,255,0.15)_1px,transparent_1px)] [background-size:28px_28px]
- "Built for Kosovo" badge: bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-2, with a pulsing dot (6x6 rounded-full bg-[#4f8ef7] animate-pulse)
- Headline: text-5xl md:text-7xl font-black leading-tight, gradient text (from-blue-400 to-violet-500), with a plain white subline below it
- Subtitle: text-lg text-[#8888aa] max-w-xl
- CTA row: "Start Free" primary gradient button (large, px-8 py-3 text-base), "See How It Works" outline button
- Stats row below buttons (4 columns):
  - 2min / 24/7 / 100% / €20 — each value in text-4xl font-black gradient text, label below in text-xs text-[#8888aa]
  - Dividers between stats: w-px h-10 bg-[rgba(120,120,255,0.12)]
- Scroll indicator at bottom center: small vertical line + "Scroll" text in text-[#5a5a7a] text-xs, animate-bounce

INDUSTRIES SECTION:
- Section bg: bg-[#0a0a0f], section title text-3xl font-bold text-[#e8e8f0]
- Pills/cards: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl px-5 py-3 text-[#8888aa] font-medium
- Each pill has an emoji prefix: ✂️ Barbershop, 🍽️ Restaurant, 🏥 Clinic, 💅 Beauty Salon
- Hover: bg-[rgba(79,142,247,0.08)] border-[rgba(120,120,255,0.22)] text-[#4f8ef7] transition-all duration-200

HOW IT WORKS SECTION:
- Section bg: bg-[#0f0f1a]
- Three step cards in a row (md:flex-row):
  - Each card: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-7 flex-1 relative overflow-hidden
  - Ghost number (01/02/03): absolute top-2 right-4, text-8xl font-black text-[rgba(79,142,247,0.07)] select-none pointer-events-none
  - Icon: 40x40 rounded-xl bg-[rgba(79,142,247,0.15)] flex items-center justify-center, Lucide icon in text-[#4f8ef7]
  - Step title: text-base font-bold text-[#e8e8f0] mt-3
  - Step description: text-sm text-[#8888aa] mt-1
  - Horizontal connector line between cards (desktop only): absolute top-[52px] left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px bg-[rgba(120,120,255,0.22)]

FEATURES SECTION:
- Section bg: bg-[#0a0a0f]
- Feature cards: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6
- Hover: translate-y-[-4px] border-[rgba(120,120,255,0.25)] transition-all duration-250
- Icon wrapper: w-10 h-10 rounded-xl bg-[rgba(79,142,247,0.15)] flex items-center justify-center mb-4
- Icon hover: scale-110 transition-transform duration-200
- Title: text-base font-bold text-[#e8e8f0]
- Description: text-sm text-[#8888aa] mt-1 leading-relaxed

PRICING SECTION:
- Section bg: bg-[#0f0f1a]
- Pricing card: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-8 relative overflow-hidden max-w-md mx-auto
- Gradient overlay inside card: absolute inset-0 bg-gradient-to-br from-[rgba(79,142,247,0.05)] to-[rgba(139,92,246,0.05)] pointer-events-none
- Hover: scale-[1.02] transition-transform duration-250
- Floating badge above card: bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] rounded-full px-3 py-1 text-xs font-semibold mb-4 inline-block
- Price: text-5xl font-black text-[#e8e8f0], "/month" in text-[#8888aa] text-lg
- Feature list items: flex items-start gap-3, check icon inside w-5 h-5 rounded-full bg-[rgba(79,142,247,0.15)] flex items-center justify-center text-[#4f8ef7]
- CTA button: primary gradient, full width
- "No credit card required" text below button: text-xs text-[#5a5a7a] text-center mt-2

CTA BANNER SECTION:
- Full-width section: bg-[#4f8ef7] py-16 px-8 text-center
- Headline: text-3xl font-black text-white
- Subtext: text-white/80 text-base mt-2
- CTA button: bg-white text-[#4f8ef7] font-bold rounded-lg px-8 py-3 hover:bg-white/90 transition-all duration-150 mt-6

FOOTER:
- bg-[#0a0a0f] border-t border-[rgba(120,120,255,0.12)] py-8 px-8
- Three columns: logo + tagline left, copyright center, nav links right
- Logo: gradient text font-black
- Tagline: text-xs text-[#5a5a7a] mt-1
- Copyright: text-sm text-[#5a5a7a]
- Links: text-sm text-[#8888aa] hover:text-[#e8e8f0] transition-colors duration-150
```

---

### 3. app/login/page.tsx — Login Page

```
Restyle app/login/page.tsx using the LokalWeb design system.
Do NOT change any Supabase auth logic, form state, or error handling.

- Page: min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4
- Card: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-8 w-full max-w-md
- Logo at top of card: "LokalWeb" gradient text font-black text-2xl text-center mb-2
- Subtitle: "Sign in to your dashboard" text-sm text-[#8888aa] text-center mb-8
- Input fields: bg-[#1e1e35] border border-[rgba(120,120,255,0.22)] rounded-lg px-3 py-2.5 text-[#e8e8f0] placeholder:text-[#5a5a7a] focus:border-[#4f8ef7] outline-none w-full transition-colors duration-200
- Input labels: text-xs font-semibold text-[#8888aa] mb-1 block
- Error messages: bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] text-[#f87171] rounded-lg px-4 py-3 text-sm
- "Sign In" button: bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6] text-white font-semibold rounded-lg py-2.5 w-full hover:opacity-90 active:scale-[0.97] transition-all duration-150
- "Forgot password?" link: text-xs text-[#4f8ef7] hover:underline text-right block mt-1
- "Don't have an account?" row: text-sm text-[#8888aa] text-center mt-6, "Register" link in text-[#4f8ef7] hover:underline
```

---

### 4. app/register/page.tsx — Registration Wizard

```
Restyle app/register/page.tsx using the LokalWeb design system.
Do NOT change any step logic, Supabase signUp calls, subdomain availability checks, or form validation.

- Page: min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12
- Card: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-8 w-full max-w-lg
- Logo at top: "LokalWeb" gradient text font-black text-2xl text-center mb-6

PROGRESS BAR (4 steps):
- Container: flex items-center gap-2 mb-8
- Step dot (inactive): w-8 h-8 rounded-full bg-[#1e1e35] border border-[rgba(120,120,255,0.22)] text-[#5a5a7a] text-xs font-bold flex items-center justify-center
- Step dot (active): bg-gradient-to-br from-[#4f8ef7] to-[#8b5cf6] text-white text-xs font-bold
- Step dot (completed): bg-[rgba(79,142,247,0.15)] text-[#4f8ef7] with a checkmark icon
- Connector line: flex-1 h-px bg-[rgba(120,120,255,0.12)], active connector: bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6]

INPUTS (all steps):
- Same input style as login page
- Subdomain field: has a live indicator — green dot + "Available" in text-[#4ade80], or red dot + "Taken" in text-[#f87171], shown as text-xs mt-1
- Subdomain preview below field: font-mono text-xs text-[#5a5a7a] bg-[#0a0a0f] rounded px-2 py-1 mt-1 inline-block

PASSWORD STRENGTH BAR:
- Container: h-1 rounded-full bg-[#1e1e35] mt-2 overflow-hidden
- Weak fill: bg-[#f87171] w-1/3
- Fair fill: bg-[#fbbf24] w-2/3
- Strong fill: bg-[#4ade80] w-full
- Label below: text-xs text-[#5a5a7a] mt-1

ACCENT COLOR SWATCHES (Step 2):
- 8 color swatches in a flex-wrap row
- Each: w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform duration-150
- Selected: border-white scale-110 ring-2 ring-white/30

STEP 4 — Email verification:
- Large envelope icon (Lucide Mail) in text-[#4f8ef7] text-6xl text-center
- "Check your email" h2 text-xl font-bold text-[#e8e8f0] text-center
- Instruction text: text-sm text-[#8888aa] text-center
- Resend button (disabled during countdown): outline style, shows countdown in text-[#5a5a7a]

BUTTONS:
- "Continue" / "Submit": primary gradient, full width
- "Back": ghost style, full width or text-only link in text-[#8888aa]
- Optional fields note: text-xs text-[#5a5a7a] italic
```

---

### 5. app/forgot-password/page.tsx and app/reset-password/page.tsx

```
Restyle both pages using the LokalWeb design system.
Do NOT change any Supabase auth logic or form state.

Both pages follow the same pattern as the login page:
- Page: min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4
- Card: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-8 w-full max-w-md
- Logo: gradient text at top
- Inputs: same dark input style
- Submit button: primary gradient, full width
- Back to login link: text-sm text-[#4f8ef7] hover:underline text-center mt-4 block

For reset-password specifically:
- Add the same password strength bar as the registration page
```

---

### 6. app/dashboard/layout.tsx — Dashboard Shell

```
Restyle the dashboard layout (app/dashboard/layout.tsx) using the LokalWeb design system.
Do NOT change any auth checks, session logic, or Supabase calls.

OUTER LAYOUT:
- flex h-screen bg-[#0a0a0f] overflow-hidden

SIDEBAR:
- Width: w-56 flex-shrink-0
- Background: bg-[#151522] border-r border-[rgba(120,120,255,0.12)]
- Padding: p-4 flex flex-col h-full

SIDEBAR TOP:
- Logo: "LokalWeb" gradient text font-bold text-lg mb-6

SIDEBAR NAVIGATION ITEMS:
- Each item: flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
- Inactive: text-[#8888aa] hover:bg-[#1e1e35] hover:text-[#e8e8f0]
- Active: bg-[rgba(79,142,247,0.15)] text-[#4f8ef7]
- Icons: Lucide icons, w-4 h-4, same color as text

SIDEBAR ITEMS (with icons):
- Overview — LayoutDashboard
- Services — Scissors (or Layers)
- Bookings — Calendar
- Hours — Clock
- Gallery — Image
- Profile — Settings

SIDEBAR BOTTOM (push to mt-auto):
- "View My Site" link: ghost style btn-sm, full width, ExternalLink icon
- Logout button: text-[#8888aa] hover:text-[#f87171] hover:bg-[rgba(239,68,68,0.08)] rounded-lg px-3 py-2.5 text-sm font-medium flex items-center gap-3 transition-all duration-150, LogOut icon w-4 h-4

MAIN CONTENT AREA:
- flex-1 overflow-y-auto bg-[#0a0a0f] p-8
```

---

### 7. app/dashboard/page.tsx — Overview

```
Restyle the dashboard overview page using the LokalWeb design system.
Do NOT change any Supabase data fetching or business logic.

PAGE HEADER:
- "Overview" in text-2xl font-bold text-[#e8e8f0]
- Subtitle with business name: text-sm text-[#8888aa] mt-1

STAT CARDS ROW (4 columns):
- Grid: grid grid-cols-2 md:grid-cols-4 gap-4 mt-6
- Each card: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-4
- Number: text-2xl font-black text-[#4f8ef7]
- Label: text-xs text-[#8888aa] mt-1
- Icon (top right corner of card): w-8 h-8 rounded-lg bg-[rgba(79,142,247,0.15)] flex items-center justify-center text-[#4f8ef7]

RECENT BOOKINGS TABLE:
- Section title: text-base font-bold text-[#e8e8f0] mt-8 mb-4
- Table wrapper: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl overflow-hidden
- Table header row: bg-[#1e1e35] text-xs font-semibold text-[#5a5a7a] uppercase tracking-wider px-5 py-3
- Table rows: px-5 py-4 border-t border-[rgba(120,120,255,0.08)] text-sm text-[#8888aa]
- Status badges:
  - pending: bg-[rgba(251,191,36,0.15)] text-[#fbbf24]
  - confirmed: bg-[rgba(79,142,247,0.15)] text-[#4f8ef7]
  - completed: bg-[rgba(34,197,94,0.15)] text-[#4ade80]
  - cancelled: bg-[rgba(239,68,68,0.15)] text-[#f87171]
  All badges: rounded-full px-2.5 py-0.5 text-xs font-semibold
```

---

### 8. app/dashboard/services/page.tsx — Services

```
Restyle the services page using the LokalWeb design system.
Do NOT change any CRUD logic, Supabase calls, or form state.

PAGE HEADER:
- "Services" title + "Add Service" primary gradient button (top right)

SERVICE CARDS (grid layout):
- Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6
- Each card: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-5
- Service name: text-base font-bold text-[#e8e8f0]
- Price: text-lg font-black text-[#4f8ef7] mt-1
- Duration: text-xs text-[#5a5a7a] flex items-center gap-1 (Clock icon w-3 h-3)
- Description: text-sm text-[#8888aa] mt-2 line-clamp-2
- Action row at bottom: flex justify-end gap-2 mt-4 pt-4 border-t border-[rgba(120,120,255,0.08)]
  - Edit: ghost button sm
  - Delete: bg-[rgba(239,68,68,0.12)] text-[#f87171] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-1.5 text-xs font-semibold

ADD/EDIT SERVICE MODAL or FORM:
- If modal: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-6
- All inputs: standard dark input style
- Save button: primary gradient, full width
- Cancel button: ghost style, full width
```

---

### 9. app/dashboard/bookings/page.tsx — Bookings

```
Restyle the bookings page using the LokalWeb design system.
Do NOT change any data fetching, status update logic, or Supabase calls.

FILTER ROW:
- Status filter tabs or pills: rounded-full px-4 py-1.5 text-xs font-semibold cursor-pointer
  - All (active): bg-[rgba(79,142,247,0.15)] text-[#4f8ef7]
  - Inactive: bg-[#151522] border border-[rgba(120,120,255,0.12)] text-[#8888aa]

BOOKINGS TABLE:
- Same table pattern as dashboard overview
- Customer name: text-[#e8e8f0] font-medium
- Service, date, time: text-[#8888aa] text-sm
- Status badge: same semantic badge colors as overview
- Action buttons: Confirm (ghost blue sm), Cancel (ghost red sm), Complete (ghost green sm)

EMPTY STATE:
- Center aligned, Calendar icon text-[#5a5a7a] w-12 h-12
- "No bookings yet" text-base font-medium text-[#8888aa]
- Subtext: text-sm text-[#5a5a7a]
```

---

### 10. app/dashboard/hours/page.tsx — Business Hours

```
Restyle the hours page using the LokalWeb design system.
Do NOT change any save logic or Supabase calls.

DAYS LIST:
- Each day row: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl px-5 py-4 flex items-center justify-between mb-3
- Day name: text-sm font-semibold text-[#e8e8f0] w-28
- Toggle (is_open): use shadcn/ui Switch, styled blue when on
- Time inputs (open/close): dark input style, smaller (w-28 text-sm py-1.5)
- Closed state: time inputs opacity-40 pointer-events-none
```

---

### 11. app/dashboard/profile/page.tsx — Profile

```
Restyle the profile page using the LokalWeb design system.
Do NOT change any save logic, Supabase calls, or form state.

SECTIONS:
- Each section wrapped in: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6 mb-6
- Section title: text-base font-bold text-[#e8e8f0] mb-4 pb-3 border-b border-[rgba(120,120,255,0.08)]
- All inputs: standard dark input style
- Field groups: grid grid-cols-1 md:grid-cols-2 gap-4

ACCENT COLOR PICKER:
- 8 swatches in a flex-wrap row, same style as registration page

SAVE BUTTON:
- primary gradient, w-auto px-6, positioned at bottom right of each section
```

---

### 12. app/dashboard/gallery/page.tsx — Gallery

```
Restyle the gallery page using the LokalWeb design system.
Do NOT change any upload logic or Supabase Storage calls.

UPLOAD ZONE:
- Dashed border: border-2 border-dashed border-[rgba(120,120,255,0.22)] rounded-xl p-12 text-center
- Upload icon: Upload from Lucide, text-[#5a5a7a] w-10 h-10 mx-auto mb-3
- Primary text: text-sm font-medium text-[#8888aa]
- Hover: border-[rgba(120,120,255,0.4)] bg-[rgba(79,142,247,0.04)] transition-all duration-200

IMAGE GRID:
- grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6
- Each image card: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl overflow-hidden aspect-square relative group
- Delete overlay on hover: absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center
- Delete button inside overlay: bg-[rgba(239,68,68,0.15)] text-[#f87171] rounded-lg px-3 py-1.5 text-xs font-semibold
```

---

### 13. app/site/[slug]/page.tsx — Public Business Site

```
Restyle the public business website page using the LokalWeb design system.
Do NOT change any Supabase data fetching, slug resolution, or booking logic.

This page uses the same dark theme as the rest of the app, but the hero accent can use the business's chosen accent color.

NAVBAR (public site):
- bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[rgba(120,120,255,0.12)] sticky top-0 z-50
- Business name: font-bold text-[#e8e8f0]
- "Book Now" CTA: primary gradient button sm

HERO SECTION:
- bg-[#0a0a0f] py-20 text-center
- Business name: text-4xl font-black text-[#e8e8f0]
- Description: text-lg text-[#8888aa] max-w-xl mx-auto mt-3
- Phone + address: text-sm text-[#5a5a7a] flex items-center gap-2 justify-center mt-4
- "Book Appointment" button: primary gradient large
- "Chat on WhatsApp" button: bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.2)] rounded-lg px-5 py-2.5 font-semibold

SERVICES SECTION:
- Section title: text-2xl font-bold text-[#e8e8f0] mb-6
- Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Each card: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-5
- Service name: font-bold text-[#e8e8f0]
- Price: text-xl font-black text-[#4f8ef7]
- Duration: text-xs text-[#5a5a7a]
- "Book This" button: ghost style sm

HOURS SECTION:
- Section title: text-2xl font-bold text-[#e8e8f0] mb-4
- Wrapper: bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl overflow-hidden max-w-sm
- Each day row: flex justify-between px-5 py-3 border-t border-[rgba(120,120,255,0.08)] first:border-t-0
- Day name: text-sm font-medium text-[#e8e8f0]
- Hours: text-sm text-[#8888aa]
- Closed: text-sm text-[#5a5a7a] italic

MAPS + CONTACT SECTION:
- Maps embed: rounded-xl overflow-hidden border border-[rgba(120,120,255,0.12)]
- Contact buttons: ghost style for phone, green ghost for WhatsApp
```

---

### 14. Booking Modal (inside public site)

```
Restyle the booking modal using the LokalWeb design system.
Do NOT change any step logic, time slot generation, or Supabase insert logic.

MODAL BACKDROP: bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-end md:items-center justify-center p-4

MODAL CARD: bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-2xl p-6 w-full max-w-md

STEP PROGRESS BAR:
- Container: flex gap-2 mb-6
- Inactive segment: flex-1 h-1 bg-[#1e1e35] rounded-full
- Active/completed segment: flex-1 h-1 bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6] rounded-full

STEP 1 — Select Service:
- Service list: flex flex-col gap-2
- Each option: bg-[#1e1e35] border border-[rgba(120,120,255,0.12)] rounded-xl px-4 py-3 cursor-pointer hover:border-[rgba(120,120,255,0.3)] transition-all duration-150
- Selected: border-[#4f8ef7] bg-[rgba(79,142,247,0.08)]
- Service name: text-sm font-semibold text-[#e8e8f0]
- Price + duration: text-xs text-[#8888aa]

STEP 2 — Select Time Slot:
- Date display: text-sm font-semibold text-[#e8e8f0] mb-3
- Slot grid: grid grid-cols-3 gap-2
- Each slot pill: bg-[#1e1e35] border border-[rgba(120,120,255,0.12)] rounded-full px-3 py-2 text-xs font-semibold text-[#8888aa] text-center cursor-pointer hover:border-[rgba(120,120,255,0.3)] transition-all duration-150
- Selected: bg-[rgba(79,142,247,0.15)] border-[#4f8ef7] text-[#4f8ef7]
- Unavailable: opacity-40 cursor-not-allowed

STEP 3 — Contact Info:
- Standard dark inputs for name, phone, note

CONFIRM BUTTON: primary gradient, full width, "Confirm Booking"

SUCCESS STATE:
- CheckCircle2 icon from Lucide: text-[#4ade80] w-14 h-14 mx-auto
- "Booking Confirmed!" text-xl font-bold text-[#e8e8f0] text-center mt-4
- Details summary: text-sm text-[#8888aa] text-center
- Scale-in animation on the success card: animate-[scale-in_0.3s_ease]
```

---

## GENERAL INSTRUCTIONS FOR COPILOT

When I ask you to restyle a file, apply the above system.

- Identify every hardcoded color (white, gray, black, light backgrounds) and replace with the design system values above.
- Identify every rounded-md and replace with the correct radius for that element type (buttons/inputs = rounded-lg, cards = rounded-xl, modals = rounded-2xl, pills = rounded-full).
- Replace any box-shadow utilities with the border + bg approach.
- Replace any font-sans or default font references with font-['DM_Sans'].
- Never add new state, logic, or Supabase calls.
- Never remove 'use client', useEffect, useState, or async/await.
- Keep the same component structure — only className strings change.
- If a section previously had a white or light bg, replace with the correct dark surface token.
- For any table, use the dark table pattern (dark header row, subtle row dividers).
- For any form, use the dark input pattern.
- After restyling, briefly list what you changed (file by file) so I can review.
