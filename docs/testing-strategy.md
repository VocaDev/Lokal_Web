# Strategjia e Testimit — LokalWeb

## Pse Testimi është i Rëndësishëm për këtë Projekt

LokalWeb është një platformë multi-tenant që menaxhon rezervime dhe biznese të ndryshme, ku saktësia e të dhënave dhe stabiliteti i tranzicioneve të statusit janë kritike. Testimi siguron që proceset si kalimi i një rezervimi nga 'pending' në 'confirmed' të funksionojnë sipas rregullave të biznesit, pa lejuar veprime të paautorizuara. Gjithashtu, validimi i saktë i të dhënave të klientëve dhe zgjidhja e problemeve të dokumentuara me konvertimin e camelCase në snake_case janë thelbësore për integritetin e bazës së të dhënave.

## Llojet e Testeve të Zgjedhura

### 1. Unit Tests (Vitest)
**Çfarë janë:** Teste që verifikojnë funksionalitetin e njësive më të vogla të kodit, si funksionet individuale, në mënyrë të izoluar.
**Pse i zgjodhëm:** Janë të shpejta për t'u ekzekutuar dhe na lejojnë të mbulojmë logjikën komplekse pa pasur nevojë për një bazë të dhënash apo server aktiv.
**Çfarë testojnë në projekt:**
- `bookingService.test.ts` — Verifikon logjikën e tranzicioneve të statusit të rezervimeve, duke u siguruar që vetëm kalimet e lejuara të ndodhin.
- `validators.test.ts` — Siguron që formatet e telefonave kosovarë, email-eve dhe fjalëkalimeve të jenë të vlefshme, duke parandaluar hyrjen e të dhënave të gabuara.
- `caseMapping.test.ts` — Teston konvertimet mes formateve camelCase dhe snake_case, veçanërisht për të mbrojtur kundër bug-ut të mëparshëm me `websiteCreationMethod`.

### 2. Validation Tests (Vitest + Zod)
**Çfarë janë:** Teste që përdorin skema të definuara (me Zod) për të verifikuar që objektet e të dhënave plotësojnë kriteret e kërkuara para se të përpunohen më tej.
**Pse i zgjodhëm:** Kjo adreson direkt dobësinë e identifikuar në auditim për mungesën e kontrollit të rreptë të inputs para se ato të dërgohen në databazë.
**Çfarë testojnë në projekt:**
- `bookingSchema.test.ts` — Verifikon që të dhënat e rezervimit (emri, telefoni, ID e shërbimit, data) janë të plota dhe në formatin e duhur.

### 3. End-to-End Tests (Playwright)
**Çfarë janë:** Teste që simulojnë sjelljen e përdoruesit real në shfletues, duke testuar rrjedhën e plotë të aplikacionit nga fillimi në fund.
**Pse i zgjodhëm:** Për të garantuar që faqet kryesore si logini dhe dashboard-i funksionojnë mirë dhe që middleware-i mbron rrugët e rezervuara.
**Çfarë testojnë në projekt:**
- `auth.spec.ts` — Teston procesin e kyçjes, trajtimin e gabimeve në login dhe ridrejtimin e përdoruesve të paautorizuar.
- `publicSite.spec.ts` — Verifikon që rrugët publike (subdomenet) ngarkohen saktë pa shkaktuar dështime të serverit.

## Tabela e Mbulimit (Coverage)

| Skedari i Testuar | Lloji | Nr. Testeve | Çfarë Mbulon |
|---|---|---|---|
| `bookingService.ts` | Unit | 14 | Tranzicionet e statusit, kontrata 'non-throwing' |
| `validators.ts` | Unit | 14 | Telefon kosovar, email, password |
| `store.ts` (fromSnake/toSnake) | Unit | 10 | Konvertimi camelCase↔snake_case, bug i dokumentuar |
| `bookingSchema` | Validation | 8 | Pastrimi i input-eve para dërgimit në DB |
| Auth flow | E2E | 3 | Formularin e loginit, mesazhet e gabimit, mbrojtjen middleware |
| Public site routing | E2E | 2 | Routing-un e subdomeneve, parandalimin e gabimeve 500 |

## Çfarë Nuk Testohet (dhe Pse)

1. Supabase RLS direkt — kërkon një mjedis të veçantë testimi me qasje administrative për të testuar politikat e sigurisë.
2. AI website generation — kërkon kredencialet e Groq API dhe kushton kohë/para për t'u ekzekutuar automatikisht.
3. Image upload — kërkon konfigurim të plotë të Supabase Storage dhe mokim të file API-ve.
4. Multi-staff dhe funksionalitete të ardhshme — këto pjesë të sistemit nuk janë implementuar ende në kodin burim.

## Si të Ekzekutohen Testet

### Unit + Validation Tests
```bash
npm run test
```

### Me output të detajuar
```bash
npx vitest run --reporter=verbose
```

### E2E Tests (kërkon server aktiv)
```bash
# Terminali 1:
npm run dev

# Terminali 2:
npx playwright test tests/e2e/
```

### Një test specifik
```bash
npx vitest run tests/unit/bookingService.test.ts
```
