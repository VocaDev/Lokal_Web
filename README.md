<div align="center">

# 🚀 LokalWeb

**SaaS Platform (Website-as-a-Service) për Bizneset Lokale në Kosovë.**

*Krijo faqen tënde profesionale dhe menaxho rezervimet në pak minuta — pa kod, pa vonesa.*

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

</div>

---

## 🌟 Përmbledhja
Shumë biznese lokale në Kosovë (barber, klinika, restorante, sallone bukurie) mbështeten vetëm në rrjetet sociale. **LokalWeb** e shton profesionalizmin e tyre duke u ofruar:
- Një uebfaqe unike në nën-domen (`biznesi.lokalweb.com`).
- Panel kontrolli (Dashboard) për menaxhimin e shërbimeve dhe oarave.
- Sistem rezervimesh online (24/7) për klientët.

---

## 🖼️ Pamje nga Platforma (Template Showcase)

LokalWeb ofron template të dedikuara për industri të ndryshme:

| **Barbershop Bold** (Real Design) | **Clinic Premium** (Real Design) |
|:---:|:---:|
| ![Barbershop Bold](/public/screenshots/barbershop-bold.png) | ![Clinic Premium](/public/screenshots/clinic-premium.png) |
| **Restaurant Bistro** | **Beauty Luxury** |
| ![Restaurant Bistro](/public/screenshots/restaurant-bistro.png) | ![Beauty Luxury](/public/screenshots/beauty-salon-luxury.png) |

> [!NOTE]
> Platforma ofron gjithsej **11 variante** unike (3 për Barbershop, 3 për Restorante, 3 për Klinika dhe 2 për Sallone Bukurie), të gjitha të optimizuara për konvertim dhe testimin akademik.


---

## 🛠️ Veçoritë Kryesore (Features)

### 💼 Për Pronarët e Biznesit
- **Regjistrim i Shpejtë**: Krijo llogarinë dhe faqen në më pak se 2 minuta.
- **Dashboard Interaktiv**: Monitoro rezervimet e reja dhe statistikat javore.
- **Menaxhimi i Shërbimeve**: Shto, modifiko dhe fshi shërbime me çmime dhe kohëzgjatje specifike.
- **Orare Fleksibile**: Konfiguro orarin e punës për çdo ditë të javës.
- **Galeria e Punëve**: Ngarko foto reale të shërbimeve tua (Supabase Storage).
- **Multi-Business**: Regjistrim i disa bizneseve me të njëjtën llogari.

### 👥 Për Klientët (Booking Experience)
- **Booking Drawer Modern**: Eksperiencë me 3 hapa (Zgjidh Shërbimin -> Zgjidh Orarin -> Konfirmo).
- **Mobile First**: Faqe plotësisht adaptive që punojnë perfekt në çdo celular.
- **Kontakt i Drejtpërdrejtë**: Integrim me WhatsApp dhe Telefon për komunikim të shpejtë.

### 🧪 Për Zhvilluesit (Pjesa Teknike/Akademike)
- **Multi-tenant Subdomains**: Routing dinamik përmes Next.js Middleware.
- **Data Isolation**: Supabase **Row Level Security (RLS)** mbron të dhënat e çdo biznesi.
- **Lab-CRUD Module**: Implementim akademik i **Layered Architecture** (Repository -> Service -> API -> UI) duke përdorur **CSV** si sirtar të dhënash.

---

## 🏗️ Arkitektura Teknikë

Projekti është ndërtuar mbi shtresa të ndara mirë për të siguruar pastërti dhe mirëmbajtje:

1.  **Frontend**: Next.js 14+ (App Router) & Framer Motion.
2.  **State Management**: TanStack Query (React Query) v5 & Local Storage.
3.  **Backend & Auth**: Supabase (PostgreSQL, RLS, Auth Helpers).
4.  **Academic Layer**: Repository Pattern me Dependency Injection (DI) në `lab-crud`.

### Data Flow Pattern:
```text
Request (subdomain) -> Middleware -> Rewrite to /[subdomain] -> Page (SSR) -> Supabase (RLS check) -> Client render
```

---

## 🚀 Duke Filluar (Quick Start)

### 1. Klonimi
```bash
git clone https://github.com/VocaDev/LokalWeb.git
cd LokalWeb
```

### 2. Instalimi & Konfigurimi
```bash
npm install
cp .env.example .env.local
```
*Vendosni variablat `NEXT_PUBLIC_SUPABASE_URL` dhe `NEXT_PUBLIC_SUPABASE_ANON_KEY`.*

### 3. Serveri i Zhvillimit
```bash
npm run dev
```

---

## 📈 Roadmap & Plani i Zhvillimit
- [x] Migrimi në Next.js 14 App Router.
- [x] Sistemi i Autentikimit & RLS.
- [x] Multi-tenancy (Subdomains).
- [x] Menaxhimi i Rezervimeve & Shërbimeve.
- [ ] Integrimi i SMS notifikimeve.
- [ ] Sistemi i pagesave online.
- [ ] Analitika e avancuar për bizneset.

---

## ✍️ Autori
Ndërtuar me ❤️ nga **Gentian Voca** — Student i vitit të dytë në Software Engineering. Projekti synon të ofrojë një zgjidhje reale për tregun kosovar.

---

## 📜 Licenca
Aktualisht i palicencuar. Të gjitha të drejtat të rezervuara.
