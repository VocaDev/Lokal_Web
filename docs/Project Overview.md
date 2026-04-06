# Analiza Teknike dhe Arkitektura e Projektit: LokalWeb

Ky dokument ofron një zbërthim të thellë arkitekturor dhe funksional të platformës **LokalWeb**. Dokumenti është hartuar për inxhinierë softuerikë, arkitektë sistemi dhe palë të interesuara që kërkojnë të kuptojnë mekanizmat e brendshëm të këtij ekosistemi SaaS (Software as a Service) multi-tenant.

---

## 1. Vizioni i Projektit

**LokalWeb** është një platformë "all-in-one" e krijuar për të fuqizuar bizneset lokale (barberat, klinikat, restorantet, sallonet e bukurisë) me një prezencë profesionale në ueb dhe një sistem efikas të rezervimeve. Qëllimi është automatizimi i procesit të rezervimeve dhe menaxhimit të klientëve, duke ofruar një eksperiencë premium që zakonisht është e rezervuar për ndërmarrjet e mëdha.

---

## 2. Stack-u Teknologjik (Comprehensive Tech Stack)

Zgjedhja e veglave është diktuar nga nevoja për performancë maksimale, shkallëzim (scalability) dhe siguri tipizimi.

- **Framework-u Kryesor:** [Next.js 14+](https://nextjs.org/) me **App Router**. Përdoret për Rendering Hybrid (Server-side & Client-side), duke siguruar SEO të shkëlqyer për faqet e bizneseve dhe ndërveprim të shpejtë për dashboard-in.
- **Gjuha:** [TypeScript](https://www.typescriptlang.org/). Implementohet në të gjithë sistemin për të parandaluar gabimet në "runtime" dhe për të siguruar një "developer experience" të nivelit të lartë përmes autocompletion dhe validimit të interfaces.
- **UI & Stilimi:**
  - **Tailwind CSS:** Për stilim utilitar dhe adaptiv. Siguron madhësi të vogël të skedarëve CSS përmes procesit "purge".
  - **Shadcn UI:** Bazuar në **Radix UI**. Ofron komponentë të aksesueshëm (WAI-ARIA compliant) që mund të personalizohen plotësisht.
  - **Framer Motion:** Përdoret për mikro-animacione dhe tranzicione të rrjedhshme që përmirësojnë UX.
- **Baza e të Dhënave dhe Backend:**
  - **Supabase (PostgreSQL):** Zgjedhur për fuqinë e tij në menaxhimin e të dhënave relacionale dhe integrimin e thjeshtë të **Realtime** updates.
  - **Supabase SSR:** Për autentikim të sigurtë në nivel serveri (cookies) dhe client-i.
- **Menaxhimi i të Dhënave:**
  - **TanStack Query (React Query) v5:** Menaxhon "asynchronous state", caching, dhe sinkronizimin e të dhënave me backend-in pa nevojën e useEffect-ave të tepërt.
- **Validimi dhe Format:**
  - **React Hook Form:** Për menaxhimin e performancës së formave të mëdha.
  - **Zod:** Strategji "schema-first" për validimin e të dhënave në hyrje.

---

## 3. Arkitektura e Sistemit (System Architecture)

LokalWeb ndjek një arkitekturë me shumë shtresa (Multi-layered Architecture) për të ndarë përgjegjësitë dhe për të rritur qëndrueshmërinë:

### A. Shtresa e Prezantimit (UI Layer)

Përbëhet nga **Server Components** (për shpejtësi dhe SEO) dhe **Client Components** (për interaktivitet). Komponentët janë të atomizuar në `src/components/ui` dhe të organizuar në faqet dinamike në `app/`.

### B. Shtresa e Biznesit (Service layer)

Logjika e biznesit (çfarë ndodh kur rezervohet një shërbim, si kalkulohen statuset) është e centralizuar në modulin `src/lib/store.ts` dhe `src/lib/academic-module/services`. Kjo e bën kodin të testueshëm dhe të pavarur nga UI.

### C. Shtresa e të Dhënave (Data Isolation Layer)

Çdo kërkesë drejt Supabase kalon përmes mekanizmit të identifikimit të **Tenant ID** (Business ID). Izolimi i të dhënave bëhet në dy nivele:

1.  **Aplikacioni:** Middleware-i identifikon biznesin bazuar në subdomain.
2.  **Baza e të dhënave:** Supabase RLS (Row Level Security) siguron që një pronar biznesi nuk mund të shohë kurrë rezervimet e një biznesi tjetër.

---

## 4. Struktura e Skedarëve (Detailed Folder Structure)

```text
├── app/                      # Next.js App Router (Routing & Pages)
│   ├── [subdomain]/          # Public Business Sites (Dynamic Routing)
│   ├── dashboard/            # Business Portal (Admin Area)
│   ├── api/                  # Server-side API Endpoints (e.g. Reports)
│   ├── auth/                 # Auth Callbacks & Logic
│   └── (auth-pages)/         # Login, Register, Password Reset
├── src/
│   ├── components/
│   │   ├── ui/               # Lower-level primitives (Shadcn)
│   │   ├── templates/        # Business Website Designs (Dynamic Switcher)
│   │   └── shared/           # Reusable biz components (Sidebar, Nav)
│   ├── lib/
│   │   ├── supabase/         # Clients (Server, Client, Middleware)
│   │   ├── academic-module/  # The Layered Academic CRUD (Repository/Service)
│   │   ├── store.ts          # Central Business Logic & Store
│   │   └── validators.ts     # Zod Schemas & Validation helpers
│   ├── hooks/                # Custom React Hooks (e.g. useMobile)
│   └── types/                # Strict TypeScript Definitions
├── lab-crud/                 # Symlink or Alias for Academic Requirements
├── public/                   # Static Assets & Templates Previews
└── docs/                     # Comprehensive Documentation
```

---

## 5. Katalogu i Veçorive (Feature Catalog)

### 5.1 Sistemi i Autentikimit (Enterprise-grade Auth)

- **Përshkrimi:** Sistemi i regjistrimit dhe identifikimit me nivele sigurie.
- **Si punon:** Përdor Supabase Auth me metoda email/password.
- **Siguria:** Middleware-i kontrollon sesionin në çdo kërkesë (`middleware.ts`). Nëse sesioni skadon, përdoruesi ridrejtohet automatikisht në `/login`.
- **Modulet:** `app/(auth-pages)`, `lib/supabase/middleware.ts`.

### 5.2 Multi-Tenancy & Subdomain Routing

- **Përshkrimi:** Çdo biznes ka shtëpinë e tij: `biznesi-1.lokalweb.com`.
- **Implementimi:** Middleware-i lexon `host` header-in, ekstrahton subdomain, dhe bën "rewrite" të rrugës drejt `app/[subdomain]`.
- **Dinamizmi:** `app/[subdomain]/page.tsx` merr subdomain-in si parameter dhe ngarkon të dhënat e biznesit përkatës.

### 5.3 Dashboard-i i Biznesit

- **Overview:** Statistikat e javës dhe ditës duke përdorur **Recharts**.
- **Rezervimet (Booking Management):** Tabelë interaktive me opsione për Konfirmim, Anulim ose Përfundim të shërbimit.
- **Shërbimet:** CRUD i plotë për shërbimet (Emri, Çmimi, Kohëzgjatja).
- **Oraret:** Menaxhim i orareve të punës me validim për pushime dhe orare mbylljeje.
- **Galeria:** Ngarkimi i imazheve të biznesit në Supabase Storage me integrim në UI.

### 5.4 Sistemi i Rezervimeve (Public-Facing)

- **Rrjedha:** Klienti viziton faqen publike -> Zgjedh shërbimin -> Zgjedh datën/orën -> Vendos të dhënat -> Rezervimi shkon në "pending".
- **Mekanizmi:** `BookingDrawer` komponentë që menaxhon state-in e rezervimit hap pas hapi.

### 5.5 Error Handling & Edge Cases

- **Zod Validation:** Validim në kohë reale për numrin e telefonit (+383), formatin e email-it dhe gjatësinë e fjalëkalimit.
- **Global Error Boundaries:** Next.js `error.tsx` trajton gabimet fatale pa u rrëzuar aplikacioni.
- **Offline/Loading States:** Skeleton screens (Shadcn) përdoren për të mbajtur UX-in gjatë ngarkimit të të dhënave.

---

## 6. Databaza & Row Level Security (RLS)

PostgreSQL në Supabase është "trupi" i sistemit. Skema kryesore përfshin:

- **`businesses`:** Detajet e biznesit (name, subdomain, industry, template_id).
- **`profiles`:** Lidhja mes User-it të Supabase dhe Biznesit të tij.
- **`bookings`:** Rezervimet me relacione drejt (business_id) dhe (service_id).
- **`services`:** Katalogu i punës së biznesit.
- **`business_hours`:** Strukturat e oarave për çdo ditë të javës.

> [!IMPORTANT]
> **RLS Policies:** Çdo tabelë ka politika aktive (p.sh. `owner_id = auth.uid()`). Kjo garanton që asnjë thirrje API nuk mund të modifikojë të dhënat e dikujt tjetër, edhe nëse "piratohet" klienti i Supabase në ueb.

---

## 7. Moduli Akademik (Lab-CRUD)

Një komponent unik që dëshmon kuptimin e arkitekturave tradicionale softuerike:

- **Arkitektura:** Dekuplatim i plotë (UI -> API -> Service -> Repository).
- **Dependency Injection (DI):** `ServiceService` merr një instancë të `ServiceRepository` në konstruktor, duke lehtësuar "mocking" dhe testimin.
- **Persistenca:** Nuk përdor SQL, por një skedar **CSV** lokal përmes modulit `fs` të Node.js. Kjo tregon aftësinë për të punuar me burime të papërpunuara të dhënash.
- **Raportet:** Përfshin logjikën e gjenerimit të raporteve tekstuale (.txt) për analizë biznesore.

---

## 8. Performanca dhe Caching

- **Optimistic UI:** Kur bëhet një update (p.sh. ndryshimi i statusit të rezervimit), UI reagon menjëherë duke u bazuar në kërkesën e nisur, duke u sinkronizuar më pas me përgjigjen e serverit.
- **TanStack Query Caching:** Rezultatet e kërkesave (p.sh. lista e shërbimeve) ruhen në memorie me një "staleTime" të konfiguruar, duke parandaluar DB calls të panevojshme në çdo lëvizje faqeje.
- **Image Optimization:** Përdorimi i komponentit `next/image` për kompresim automatik të fotove të biznesit.

---

## 9. Limitimet Aktuale (Nuances)

- **Subdomains në Localhost:** Kërkon modifikimin e skedarit `hosts` të Windows për të testuar subdomenet lokalisht.
- **Supabase Storage:** Aktualisht suporton imazhe deri në 5MB për biznes.

---

## 10. Roadmap Teknik (Vizioni i Radhës)

1.  **AI Scheduling:** Sugjerimi i orareve optimale bazuar në historikun e klientit.
2.  **Notifikimet:** Integrimi me WhatsApp/Email për rikujtimin e rezervimeve.
3.  **Analytics Advanced:** Raporte më të detajuara mbi performancën mujore të biznesit.
4.  **Multi-Language Support:** Lokalizimi i plotë i dashboard-it (Shqip, Anglisht, Gjermanisht).

---

**Dokumenti u përgatit nga:** Antigravity (Senior AI Architect)
**Versioni:** 2.1 (Mars 2026)
**Projekti:** LokalWeb SaaS Platform
