# LokalWeb — Copilot Instructions

## What is LokalWeb?

LokalWeb is a Multi-Tenant SaaS / Website-as-a-Service platform targeting
small businesses in Kosovo (barbershops, restaurants, clinics, beauty salons).
Each business gets a fully functional website at a unique subdomain
(e.g. barbershop.lokalweb.com), a dashboard to manage their content,
and an online booking system — all from one centralized platform.

## Tech Stack

- Framework: Next.js 14 (App Router) — NOT Pages Router
- Language: TypeScript 5 — no `any` types
- Styling: Tailwind CSS + shadcn/ui
- Database: Supabase (PostgreSQL) with Row Level Security
- Auth: Supabase Auth (email/password)
- Storage: Supabase Storage (business images, logos)
- Hosting: Vercel with wildcard subdomain support
- Theme: next-themes (dark/light mode toggle, defaultTheme="dark")

## Multi-Tenancy Model

- Shared database, single schema
- Every table has a `business_id` foreign key for tenant isolation
- RLS enforces data isolation at the database level
- Subdomain routing via middleware.ts at the root level
- Request flow: barbershop.lokalweb.com → middleware extracts subdomain
  → rewrites to /barbershop → app/[subdomain]/page.tsx renders tenant
- MVP uses slug-based routing (/site/[slug]) — true subdomains are post-MVP

## Supabase Client Architecture

Three separate clients — always use the correct one:

- src/lib/supabase/client.ts → Client Components ('use client')
- src/lib/supabase/server.ts → Server Components and Route Handlers
- src/lib/supabase/middleware.ts → middleware.ts only

## Project Structure

- app/ → Next.js App Router pages
- app/[subdomain]/page.tsx → Public business website (dynamic tenant)
- app/dashboard/ → Owner dashboard (protected by middleware)
- app/register/ → Business registration (4-step wizard)
- app/login/ → Login page
- app/forgot-password/ → Forgot password
- app/reset-password/ → Reset password
- app/auth/callback/ → Supabase auth callback route
- src/components/ → Shared UI components + shadcn/ui
- src/hooks/ → Custom React hooks
- src/lib/store.ts → ALL Supabase data operations go here
- src/lib/types.ts → TypeScript types for all entities
- src/lib/validators.ts → Kosovo phone, email, password, subdomain validators
- src/lib/utils.ts → Shared utilities (toSnake, fromSnake camelCase helpers)
- middleware.ts → Subdomain routing + auth protection (root level, do not move)

## Database Tables

- businesses — one row per tenant (id, name, subdomain, owner_id, industry,
  accent_color, social_links jsonb, gallery_images text[])
- services — services per business (business_id FK, price, duration_minutes)
- business_hours — hours per business (business_id FK, day_of_week 0–6,
  is_open, open_time, close_time)
- bookings — appointments (business_id FK, service_id FK,
  status: pending|confirmed|cancelled|completed)

## Code Rules

- Always use App Router patterns — never suggest Pages Router
- Server Components by default — add 'use client' only when needed
- Use next/navigation not next/router
- All Supabase queries go through src/lib/store.ts
- All types come from src/lib/types.ts — never define inline types
- Tailwind + shadcn/ui for all styling — no inline styles except framer-motion
- Always scope queries to the current business_id
- Always handle loading and error states
- Never hardcode tenant IDs or business subdomains
- Never use the service role key on the frontend
- camelCase in TypeScript, snake_case in Supabase — always map with toSnake/fromSnake
- Dashboard pages use two useEffect hooks — first loads business, second
  depends on business?.id to prevent business_id=undefined race condition
- params in Next.js 15 is a Promise — use React.use(params) to unwrap
- Framer Motion is used for animations on the landing page — do not remove

## Authentication Flow

- Registration: 4-step wizard → supabase.auth.signUp() → email verification
  → auth/callback route → /dashboard
- Login: supabase.auth.signInWithPassword() → /dashboard
- Middleware protects all /dashboard routes — redirects to /login if no session
- supabase.auth.signOut() → /login
- suppressHydrationWarning on <html> is required for next-themes

## Current Status (Weeks 3–4 complete, heading into Weeks 5–6)

### Done

- Supabase project setup: 4 tables with RLS policies
- camelCase ↔ snake_case mapping helpers
- Supabase Auth: registration, login, email verification, forgot/reset password
- Middleware: session refresh + /dashboard route protection + subdomain routing
- Dashboard: overview, bookings, services, hours, gallery, profile pages
- Landing page: full UI with dark/light mode toggle (next-themes)
- Design system: CSS variables, dark/light themes, DM Sans font

### In Progress (Weeks 5–6)

- Public business site with slug-based routing (/site/[slug])
- First industry template (barbershop)

### Upcoming

- Weeks 7–8: Booking system (real slot generation from business_hours)
- Weeks 9–10: Image upload to Supabase Storage
- Weeks 11–12: Google Maps + WhatsApp integration
- Week 12: Super Admin panel
- Week 13: Docs, testing, demo
- Post-MVP: True subdomain routing, additional templates, custom domains

## Design System

### Theme

- Dark/light mode via next-themes — defaultTheme is "dark"
- CSS variables in src/index.css: :root = light mode, .dark = dark mode
- Always use semantic Tailwind classes so colors respond to theme switching:
  bg-background, bg-card, text-foreground, text-muted-foreground,
  border-border, bg-primary, bg-secondary etc.
- Never hardcode hex values in new components — use semantic classes only

### Dark Mode Palette (reference only — use semantic classes above)

- Page bg: #0a0a0f
- Card surface: #151522
- Raised surface (inputs, dropdowns): #1e1e35
- Border default: rgba(120,120,255,0.12)
- Border emphasis (hover, focus): rgba(120,120,255,0.22)
- Brand blue: #4f8ef7
- Brand violet: #8b5cf6
- Brand gradient: linear-gradient(135deg, #4f8ef7, #8b5cf6)
- Text primary: #e8e8f0
- Text muted: #8888aa
- Text very muted: #5a5a7a
- Success: #4ade80 / rgba(34,197,94,0.15)
- Warning: #fbbf24 / rgba(251,191,36,0.15)
- Danger: #f87171 / rgba(239,68,68,0.15)

### Typography

- Font: DM Sans for all text, DM Mono for code/tags/subdomain previews only
- Gradient text ONLY on: hero headline, stat numbers, logo mark — nowhere else
- Three text levels only: foreground (headings), muted-foreground (body),
  very muted #5a5a7a (labels/meta)

### Border Radius

- Buttons and inputs: rounded-lg (8px)
- Cards: rounded-xl (12px)
- Modals and panels: rounded-2xl (16px)
- Pills and badges: rounded-full

### Component Rules

- No box-shadows — use border + background difference for depth
- No blobs, glows, or dot-grid texture outside the landing page hero section
- Borders are always rgba semi-transparent — never solid opaque
- Icons: Lucide React only — no mixing icon libraries

### Restyling Rules (when asked to restyle a file)

- Only change className strings — never touch logic, Supabase calls,
  useEffect, useState, async/await, routing, or TypeScript types
- Never remove or rename props, functions, or component names
- Keep all 'use client' directives exactly where they are
- Replace hardcoded hex colors with semantic Tailwind classes
- Replace box-shadow utilities with border + bg approach
- Replace rounded-md with correct radius per element type
- For tables: dark header row (bg-secondary), subtle row dividers
- For forms: dark input pattern (bg-input border-border)
- After restyling, list what changed file by file for review
