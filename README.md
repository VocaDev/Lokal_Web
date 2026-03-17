<div align="center">

# LokalWeb

**Website-as-a-Service for small businesses in Kosovo.**

*Get your business online in minutes — no code, no hassle.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

</div>

---

## What is LokalWeb?

Most small businesses in Kosovo — barbershops, restaurants, beauty salons, clinics — rely entirely on social media for their online presence. They cannot manage bookings efficiently, they cannot present structured service and pricing information, and they lack a professional digital identity they actually own.

**LokalWeb fixes this.**

Every registered business gets a fully functional website at a unique subdomain (`business.lokalweb.com`), a dashboard to manage their content, and an online booking system — all from one centralized platform, in minutes.

---

## Features

### For Business Owners
- Instant website at `yourname.lokalweb.com` on registration
- Dashboard to manage profile, services, hours, gallery, and bookings
- Industry-specific templates — barbershop, restaurant, clinic, beauty salon
- Service and pricing management with duration tracking
- Booking management — confirm, cancel, and complete appointments
- Image gallery upload
- Social media links, WhatsApp contact, click-to-call

### For Customers
- Browse services and pricing on a clean public website
- Book appointments online in 3 steps — pick service, pick time, confirm
- View business hours and location
- Contact via phone, WhatsApp, or email

### For Platform Admins
- Super admin panel to manage all registered businesses
- Activate or suspend accounts
- Monitor platform-wide usage and bookings

### Coming Soon
- Custom domain support (`www.mybarbershop.com`)
- SMS and WhatsApp booking notifications
- Multi-staff scheduling
- Analytics dashboard
- Subscription billing
- Mobile app for business owners
- Multi-language support (Albanian, English, Serbian)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server-side rendering, routing, middleware |
| Language | TypeScript | Type safety across the entire codebase |
| Styling | Tailwind CSS + shadcn/ui | Utility-first design system |
| Database | Supabase (PostgreSQL) | Multi-tenant data with Row Level Security |
| Auth | Supabase Auth | Email/password and OAuth |
| Storage | Supabase Storage | Business images and logos |
| Hosting | Vercel | Edge deployment with wildcard subdomain support |

---

## Architecture

LokalWeb is built on a **shared database, single schema** multi-tenancy model.

Every table has a `business_id` foreign key that ties records to a specific tenant. Supabase **Row Level Security (RLS)** enforces data isolation at the database level — a business owner can never read or write another business's data, even if they try.

**Subdomain routing** is handled by a Next.js middleware file at the root. When a request comes in for `barbershop.lokalweb.com`, the middleware reads the hostname, extracts `barbershop`, and rewrites the request to `/barbershop` — so the correct tenant data is resolved before anything renders.

```
Request: barbershop.lokalweb.com
    ↓
middleware.ts — reads hostname, extracts subdomain
    ↓
Rewrites to: lokalweb.com/barbershop
    ↓
app/[subdomain]/page.tsx — fetches business from Supabase
    ↓
Public business website renders with correct tenant data
```

### Database Schema

```sql
businesses
  id uuid PK, name text, subdomain text UNIQUE,
  owner_id uuid FK, industry text, description text,
  phone text, address text, logo_url text,
  accent_color text, social_links jsonb, gallery_images text[],
  created_at timestamptz

services
  id uuid PK, business_id uuid FK,
  name text, description text, price numeric,
  duration_minutes integer, created_at timestamptz

business_hours
  id uuid PK, business_id uuid FK,
  day_of_week integer (0–6), is_open boolean,
  open_time time, close_time time

bookings
  id uuid PK, business_id uuid FK, service_id uuid FK,
  customer_name text, customer_phone text,
  appointment_at timestamptz,
  status text (pending | confirmed | cancelled | completed),
  created_at timestamptz
```

### Supabase Client Architecture

Three separate clients depending on context:

```
src/lib/supabase/
├── client.ts      # Browser — used in Client Components ('use client')
├── server.ts      # Server — used in Server Components and Route Handlers
└── middleware.ts  # Middleware — used only in middleware.ts
```

### Project Structure

```
LokalWeb/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, fonts)
│   ├── page.tsx                # Landing page
│   ├── not-found.tsx           # 404 page
│   ├── register/
│   │   ├── page.tsx            # Business registration (multi-step)
│   │   └── success/page.tsx    # Post-registration success screen
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Overview + stats
│   │   ├── bookings/page.tsx   # Booking management
│   │   ├── services/page.tsx   # Service and pricing management
│   │   ├── hours/page.tsx      # Business hours configuration
│   │   ├── gallery/page.tsx    # Image gallery
│   │   └── profile/page.tsx    # Business profile editor
│   └── [subdomain]/page.tsx    # Public business website (dynamic tenant)
├── src/
│   ├── components/             # Shared UI components + shadcn/ui
│   ├── hooks/                  # Custom React hooks
│   └── lib/
│       ├── supabase/           # Three Supabase client files
│       ├── store.ts            # All data operations (Supabase queries)
│       ├── types.ts            # TypeScript types for all entities
│       └── utils.ts            # Shared utilities
├── middleware.ts               # Subdomain routing (root level)
├── next.config.mjs             # Next.js configuration
├── .env.local                  # Local secrets (not committed)
└── .env.example                # Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account for deployment

### 1. Clone the repository

```bash
git clone https://github.com/VocaDev/LokalWeb.git
cd LokalWeb
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials (found in **Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Set up the database

Run the following SQL in your Supabase **SQL Editor**:

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null, subdomain text unique not null,
  industry text, phone text, address text, description text,
  logo_url text, accent_color text default '#2563EB',
  social_links jsonb default '{}', gallery_images text[] default '{}',
  owner_id uuid, created_at timestamptz default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null, description text,
  price numeric not null, duration_minutes integer not null,
  created_at timestamptz default now()
);

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  is_open boolean default true,
  open_time time default '09:00', close_time time default '18:00'
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  service_id uuid references services(id),
  customer_name text not null, customer_phone text,
  appointment_at timestamptz not null,
  status text default 'pending'
    check (status in ('pending','confirmed','cancelled','completed')),
  created_at timestamptz default now()
);

alter table businesses enable row level security;
alter table services enable row level security;
alter table business_hours enable row level security;
alter table bookings enable row level security;

create policy "Public reads businesses" on businesses for select using (true);
create policy "Public reads services" on services for select using (true);
create policy "Public reads hours" on business_hours for select using (true);
create policy "Public inserts bookings" on bookings for insert with check (true);
create policy "Anyone manages businesses" on businesses for all using (true);
create policy "Anyone manages services" on services for all using (true);
create policy "Anyone manages hours" on business_hours for all using (true);
create policy "Anyone manages bookings" on bookings for all using (true);
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the LokalWeb landing page.

---

## User Flows

**Business Owner** → Register → success page with live website link → dashboard → manage profile, services, hours, gallery, bookings

**Customer** → Visit `business.lokalweb.com` → browse services → pick time slot → enter details → booking confirmed

**Super Admin** → Login → view all businesses → activate or suspend → manage platform settings

---

## Roadmap

Built over 13 weeks as a university Software Engineering project.

| Week | Milestone | Status |
|---|---|---|
| 1–2 | Requirements, architecture, database schema | ✅ Done |
| 3–4 | Next.js setup, Supabase integration, data layer | ✅ Done |
| 5–6 | Multi-tenancy, subdomain middleware, Vite → Next.js migration | ✅ Done |
| 7–8 | Authentication — login, register, protected routes, Google OAuth | 🔄 In progress |
| 9–10 | Booking system — full customer flow and owner management | ⏳ Upcoming |
| 11 | Image gallery, Google Maps, contact integration | ⏳ Upcoming |
| 12 | Super admin panel | ⏳ Upcoming |
| 13 | Testing, polish, Vercel deployment | ⏳ Upcoming |

---

## Author

Built by **VocaDev** — second year Software Engineering student — as a university project with the ambition of becoming a real product for the Kosovo market.

---

## License

This project is currently unlicensed. All rights reserved.
