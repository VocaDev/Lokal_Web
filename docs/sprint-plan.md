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
- BookingDrawer (side drawer) me 4 hapa: Service → Date+Time → Details → Confirm
- Slot generation nga business_hours reale me anti-double-booking check
- Demo business në /demo me të dhëna reale nga Supabase

### Çka nuk funksionon / probleme ekzistuese:

- Timezone bug i pjesshëm në BookingDrawer — appointment_at ruhet UTC, lexohet si local time
- Image upload nuk është ndërtuar — galleryImages është array bosh për shumicën e bizneseve
- Super Admin panel nuk është ndërtuar

### A kompajlohet dhe ekzekutohet programi:

Po — `next build` kalon me zero errors, `npm run test` kalon me zero errors.

---

## Plani i Sprintit

### Feature e Re: Moduli Akademik (Eksport Raporti)

**Çka bën:**
Ky modul lejon pronarin e biznesit të gjenerojë statistika dhe të eksportojë një raport të plotë në format `.txt`. Ndjek strikt arkitekturën `UI → Service → Repository`.

**Si e përdor useri:**
1. Hyn në faqen /dashboard/bookings.
2. Klikon butonin "Eksporto Raportin (.txt)".
3. Sistemi vizualizon një mesazh "Duke gjeneruar..." dhe më pas njofton me sukses. Skedari i raportit krijohet automatikisht në hard-disk në folderin `/reports`.

**Komponentët që do të ndërtohen:**
- **Repository:** `FileRepository` për Node.js lexim/shkrim, dhe `BookingRepository` për thirrjen nga DB.
- **Service:** `ExportService` që trajton llogaritjen e statistikave (numri i takimeve, shërbimi më i popullarizuar).
- **UI:** Integrimi i butonit tek faqja ekzistuese `page.tsx` pa ndërhyre në strukturën tjetër të aplikacionit.

---

### Error Handling — 3 Shtresa Kufitare

**Rasti 1: Problemet me File System (Në Repository)**
- *Çfarë ndodh:* Nëse FileRepository nuk arrin të lexojë një skedar.
- *Zgjidhja:* Bëhet throw ekzaktsisht error "File nuk u gjet, po krijoj file të ri...".

**Rasti 2: ID ose Formate Inputesh (Në Repository / Service)**
- *Çfarë ndodh:* ID-ja e biznesit është string i mangët apo nuk është UUID valid.
- *Zgjidhja:* `BookingRepository` do të verifikojë regex-in dhe do të hedhë errorin "ID e biznesit nuk është valid".

**Rasti 3: Input Bosh (Në Service)**
- *Çfarë ndodh:* Emri i biznesit dërgohet bosh ose si Integer aksidentalisht.
- *Zgjidhja:* `ExportService` e kontrollon me rregull strict type-checking dhe dërgon error "Emri i biznesit nuk është valid". Të gjitha këto errore përcjellen në UI pa asnjë crash programi.

---

### Teste — Çka do të testohet

**Unit Testing Framework:** `Vitest` (Ekuivalenti bashkëkohor i `xUnit` për JavaScript/TypeScript ecosystems). Projekti përmban follder të posaçëm testesh.

**Rastet Kufitare (4 Test Cases):**
1. **Rast normal:** Input valid, ekzistojnë 3 bookings → Kthehet raporti dhe assert-ohen numrat ('Total rezervime: 3').
2. **Fail Case 1:** `businessId` mungon (String i thatë) → Error me mesazh.
3. **Fail Case 2:** `businessName` i pavlefshëm → Error valid.
4. **Fail Case 3:** Simulimi i ndërprerjes së Repository/Databazës (Throws connection failed) → Kalimi korrekt i errorit nga Service mbrapsht tek funksioni thirrës.

## Afati
- Deadline: Martë, 8 Prill 2026, ora 08:30
