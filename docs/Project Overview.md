# Analiza Teknike dhe Arkitektura e Projektit: LokalWeb

Ky dokument ofron një zbërthim të thellë arkitekturor dhe funksional të platformës **LokalWeb**. Dokumenti është hartuar për inxhinierë softuerikë, arkitektë sistemi dhe palë të interesuara që kërkojnë të kuptojnë mekanizmat e brendshëm të këtij ekosistemi SaaS (Software as a Service) multi-tenant.

---

## 1. Vizioni i Projektit

**LokalWeb** është një platformë "all-in-one" e krijuar për të fuqizuar bizneset lokale (barberat, klinikat, restorantet, sallonet e bukurisë) me një prezencë profesionale në ueb dhe një sistem efikas të rezervimeve. Qëllimi është automatizimi i procesit të rezervimeve dhe menaxhimit të klientëve, duke ofruar një eksperiencë premium që zakonisht është e rezervuar për ndërmarrjet e mëdha.

---

## 2. Stack-u Teknologjik (Comprehensive Tech Stack)

- **Framework-u Kryesor:** [Next.js 14+](https://nextjs.org/) me **App Router**.
- **Gjuha:** [TypeScript](https://www.typescriptlang.org/).
- **UI & Stilimi:**
  - **Tailwind CSS:** Stilim utilitar dhe adaptiv.
  - **Shadcn UI:** Komponentë të aksesueshëm dhe modernë.
  - **Framer Motion:** Animacione premium dhe tranzicione të rrjedhshme.
- **Baza e të Dhënave:** [Supabase (PostgreSQL)](https://supabase.com/).
- **Menaxhimi i të Dhënave:** TanStack Query (SWR) dhe React Hook Form + Zod.

---

## 3. Arkitektura e Sistemit (System Architecture)

### 3.1 Website Customization Hub & Theme Engine
LokalWeb përdor një arkitekturë unike të **Live Theme Injection**. 
- **Mekanizmi:** Dashboard-i lejon bizneset të zgjedhin ngjyrat, fontet dhe layout-et. Këto ruhen në tabelën `website_customization`.
- **Injektimi:** Gjatë kohës kur vizitohet subdomain-i i biznesit, serveri injekton CSS Variables (`--primary-color`, `--heading-font`, etj.) direkt në DOM, duke mundësuar ndryshimin e menjëhershëm të brendit pa pasur nevojë për re-build të aplikacionit.

### 3.2 Multi-Tenant Routing Layer
Middleware-i i avancuar trajton subdomenet në mënyrë dinamike, duke ridrejtuar trafikun në `app/[subdomain]` por duke mbajtur URL-në origjinale të pastër.

---

## 4. Katalogu i Veçorive (Feature Catalog)

### 4.1 Customization Hub (Brand New v3.0)
- **Visual Builder:** Kontroll i plotë mbi paletën e ngjyrave dhe tipografinë.
- **Section Manager:** Kontrolli i dukshmërisë së seksioneve (Team, Testimonials, Contact).
- **Gallery Management:** Sistm interaktiv për ngarkimin e fotove sipas kategorive (Hero, About, etc.) me integrim në Supabase Storage.
- **Device Switcher:** Mundësia për të parë ndryshimet në Desktop dhe Mobile në kohë reale brenda Dashboard-it.

### 4.2 Dashboard-i i Biznesit
- **Booking Management:** Menaxhim i plotë i statusit të rezervimeve (Confirm/Cancel/Complete).
- **Service Management:** Katalogu i shërbimeve me çmime dhe kohëzgjatje.
- **Business Hours:** Konfigurim i detajuar i orareve të punës.

### 4.3 Public Business Sites
- **Adaptive Templates:** Switch-eri i template-ve bazohet në industrinë e biznesit.
- **Customized UX:** Faqet publike tani reflektojnë 100% të personalizimeve të bëra në hub.

---

## 5. Databaza & Storage

- **Relation Model:** Përdorimi i UUID për të gjitha lidhjet relacionale (`businesses`, `website_customization`, `gallery_items`).
- **RLS Policies:** Çdo record mbrohet nga politikat e Supabase që verifikojnë `auth.uid() = owner_id`.
- **Integrated Storage:** Bucket-i `business-gallery` trajton të gjitha asetet vizuale me optimizim automatik.

---

## 6. Moduli Akademik (Academic CRUD)
Përfshin një implementim të izoluar (UI -> Service -> Repository -> CSV) që dëshmon aftësitë në arkitekturat tradicionale softuerike dhe punën me skedarë lokalë.

---

**Dokumenti u përditësua nga:** Antigravity (Senior AI Architect)
**Versioni:** 3.0 (Prill 2026)
**Statusi:** Produksion
