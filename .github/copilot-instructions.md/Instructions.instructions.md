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
- Auth: Supabase Auth (email/password + Google OAuth)
- Storage: Supabase Storage (business images, logos)
- Hosting: Vercel with wildcard subdomain support

## Multi-Tenancy Model

- Shared database, single schema
- Every table has a `business_id` foreign key for tenant isolation
- RLS enforces data isolation at the database level
- Subdomain routing via middleware.ts at the root level
- Request flow: barbershop.lokalweb.com → middleware extracts subdomain
  → rewrites to /barbershop → app/[subdomain]/page.tsx renders tenant

## Supabase Client Architecture

Three separate clients — always use the correct one:

- src/lib/supabase/client.ts → Client Components ('use client')
- src/lib/supabase/server.ts → Server Components and Route Handlers
- src/lib/supabase/middleware.ts → middleware.ts only

## Project Structure

- app/ → Next.js App Router pages
- app/[subdomain]/page.tsx → Public business website (dynamic tenant)
- app/dashboard/ → Owner dashboard (protected)
- app/register/ → Business registration (multi-step)
- src/components/ → Shared UI components + shadcn/ui
- src/hooks/ → Custom React hooks
- src/lib/store.ts → ALL Supabase data operations go here
- src/lib/types.ts → TypeScript types for all entities
- src/lib/utils.ts → Shared utilities
- middleware.ts → Subdomain routing (root level, do not move)

## Database Tables

- businesses — one row per tenant (id, name, subdomain, owner_id, industry...)
- services — services per business (business_id FK)
- business_hours — hours per business (business_id FK, day_of_week 0–6)
- bookings — appointments (business_id FK, service_id FK, status: pending|confirmed|cancelled|completed)

## Code Rules

- Always use App Router patterns — never suggest Pages Router
- Server Components by default — add 'use client' only when needed
- Use next/navigation not next/router
- All Supabase queries go through src/lib/store.ts
- All types come from src/lib/types.ts — never define inline types
- Tailwind + shadcn/ui for all styling — no inline styles
- Always scope queries to the current business_id
- Always handle loading and error states
- Never hardcode tenant IDs or business subdomains
- Never use the service role key on the frontend

## Current Status (Week 7–8)

- Done: architecture, database schema, multi-tenancy, subdomain middleware
- In progress: Authentication (login, register, protected routes, Google OAuth)
- Upcoming: booking system, image gallery, super admin panel, Vercel deployment
