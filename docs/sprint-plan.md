# Sprint 2 Plan — Gentian Voca

Data: 1 Prill 2026

## Gjendja Aktuale

### Çka funksionon tani:

- Landing page me Login + Register CTA buttons
- Regjistrim 4-hapësh me Supabase Auth (email + password)
- Email verification flow — Supabase dërgon link, callback route trajton code exchange
- Login page me error messages të lexueshme
- Forgot/Reset password flow i plotë
- Middleware që mbron të gjitha /dashboard routes — redirect te /login nëse nuk ka session
- Dashboard me të dhëna reale nga Supabase: overview, bookings, services, hours, gallery, profile
- Logout nga dashboard sidebar
- Faqe publike e biznesit në /[subdomain] — Server Component, fetch paralel me Promise.all()
- RLS policies që zbatojnë owner-scoped data access
- Template router (src/components/templates/index.tsx) — zgjedh template bazuar në business.industry
- 4 template bazë: BarbershopTemplate, BeautySalonTemplate, RestaurantTemplate, ClinicTemplate
- BookingDrawer (side drawer) me 4 hapa: Service → Date+Time → Details → Confirm
- Slot generation nga business_hours reale me anti-double-booking check
- WhatsApp button në success screen
- generateMetadata() për SEO dinamik per biznes
- Demo business në /demo me të dhëna reale nga Supabase

### Çka nuk funksionon / probleme ekzistuese:

- Timezone bug i pjesshëm në BookingDrawer — appointment_at ruhet UTC, lexohet si local time
- 4 templates ekzistues duken vizualisht të ngjashëm — nuk kanë identitet të dallueshëm per industri
- Nuk ka template_id në businesses tabela — të gjithë bizneset marrin të njëjtin template
- Gjatë regjistrimit, useri zgjedh ngjyrë por nuk shikon preview të website-it
- Image upload nuk është ndërtuar — galleryImages është array bosh për shumicën e bizneseve
- Super Admin panel nuk është ndërtuar
- Google OAuth nuk është implementuar
- Vercel deployment nuk është konfiguruar

### A kompajlohet dhe ekzekutohet programi:

Po — `next build` kalon me zero errors, `tsc` kalon me zero errors.

---

## Plani i Sprintit

### Feature e Re: Industry-Specific Template System me Preview

**Çka bën:**
Sistemi i ri i templates i lejon secilit biznes të ketë një faqe publike vizualisht unike
bazuar në industrinë dhe template-in e zgjedhur gjatë regjistrimit.

**Si e përdor useri (flow i plotë):**

1. Gjatë regjistrimit, pasi zgjedh industrinë (p.sh. "barbershop"), useri sheh 2-3 variante
   template me preview të live-it — jo ngjyra, por dizajne të plota të ndryshme
2. Klikon njërën dhe shikon si do të duket website-i i tij me të dhënat e tij reale
3. Zgjedhja ruhet si `template_id` në tabelën `businesses` (kolona e re)
4. Kur klienti viziton /slug-i-biznesit, sheh saktësisht templatein e zgjedhur

**Komponentët që do të ndërtohen:**

- `src/components/templates/custom/BarbershopBold.tsx` — template i importuar nga Lovable,
  i transformuar për të pranuar props reale (Business, Service[], BusinessHours[])
- `docs/sprint-plan.md` — ky file
- Kolonë e re `template_id TEXT DEFAULT 'classic'` në tabelën `businesses`
- Template router i përditësuar që zgjedh mes varianteve

**Rezultati i pritshëm:**
Biznesi demo në /demo shfaq BarbershopBold template me të dhëna reale nga Supabase,
BookingDrawer funksional, hero image dinamike, services dhe hours nga databaza.

---

### Error Handling — 3 raste specifike

**Rasti 1: Slug i panjohur — /[subdomain] me biznes që nuk ekziston**

- Problem aktual: nëse dikush viziton /biznes-qe-seksiston, serveri kthehet blank
- Zgjidhja: `getBusinessBySubdomain()` kthen `null` → `notFound()` → renders `app/not-found.tsx`
- Implementuar: Po, tashmë funksionon

**Rasti 2: BookingDrawer — slot i zënë nga dy përdorues njëkohësisht**

- Problem aktual: dy klientë mund të rezervojnë të njëjtin slot nëse klikojnë Confirm njëkohësisht
- Zgjidhja: Para `addBooking()`, bëj një query të fundit te Supabase për të konfirmuar
  se `appointment_at` i zgjedhur nuk ekziston ende. Nëse ekziston → kthe userin te Step 2
  me mesazh "That slot was just taken. Please pick another time."
- Implementuar: Po, conflict check i shtuar

**Rasti 3: Template nuk gjendet — industry e panjohur ose template_id invalid**

- Problem aktual: nëse `business.industry` ka vlerë të papritur, template router mund të kthehet blank
- Zgjidhja: `switch` statement me `default` case që kthen `BarbershopTemplate` si fallback
- Implementuar: Po, default case ekziston në index.tsx

---

### Teste — Çka do të testohet

**Metodat që do të testohen:**

1. `getBusinessBySubdomain(slug)` — raste kufitare:
   - Slug ekziston → kthen Business objektin me të gjitha kolonat
   - Slug nuk ekziston → kthen null (jo throw error)
   - Slug me karaktere speciale → duhet të trajtohet pa crash

2. Slot generation në BookingDrawer — raste kufitare:
   - Dita e zgjedhur është e mbyllur (is_open = false) → nuk shfaq asnjë slot
   - open_time = "09:00:00" format me sekonda → duhet parsed saktë (bug i njohur i fiksuar)
   - Të gjithë slots janë të zënë → shfaq mesazh "No available slots" jo ekran bosh
   - Data e zgjedhur është e diel (day_of_week = 0, is_open = false) → chip greyed out

3. Template routing — raste kufitare:
   - industry = "barbershop" → BarbershopTemplate (ose BarbershopBold nëse template_id = 'bold')
   - industry = "beauty-salon" → BeautySalonTemplate
   - industry = "restaurant" → RestaurantTemplate
   - industry = "clinic" → ClinicTemplate
   - industry = vlera e panjohur → BarbershopTemplate (fallback)

**Si do të testohen:**

- Manualisht duke ndryshuar `industry` dhe `template_id` në Supabase SQL Editor
  dhe verifikuar output-in vizual në browser
- Double booking test: dy tabs të hapura njëkohësisht, zgjedhja e të njëjtit slot,
  konfirmimi i njëkohshëm — vetëm njëri duhet të kalojë
