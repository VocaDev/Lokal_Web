# Strategjia e Testimit — LokalWeb

## Pse Testimi është i Rëndësishëm për këtë Projekt

LokalWeb është një platformë multi-tenant që menaxhon rezervime, pagesa potenciale dhe gjenerim të faqeve me AI. Tre fusha kanë rrezikun më të lartë:

1. **Tranzicionet e statusit të rezervimeve** — një kalim i pavlefshëm (p.sh. `cancelled` → `confirmed`) do të prishte rendin e biznesit dhe historikun. Logjika është në `src/lib/services/bookingService.ts` dhe duhet të ekzekutohet në mënyrë identike sa herë që thirret nga UI ose API.
2. **Validimi i inputeve nga klientët** — telefonë kosovarë në formate të ndryshme, email-e, fjalëkalime, dhe payload-e rezervimi që dërgohen drejtpërdrejt në Supabase. Pa validim në kufi, errors-at e DB-së dalin si gabime të papërdorshme te përdoruesi.
3. **Konvertimi camelCase ↔ snake_case** — Supabase i ka kolonat me `snake_case` ndërsa kodi TypeScript punon me `camelCase`. Një bug i mëparshëm me `websiteCreationMethod` solli humbje të dhënash; testimi i këtij konvertimi është rrethi i sigurisë.

## Llojet e Testeve të Zgjedhura

### 1. Unit Tests (Vitest)
**Çfarë janë:** Teste që verifikojnë funksionalitetin e njësive më të vogla të kodit (funksione individuale, klasa) në mënyrë të izoluar, me dependencat e jashtme të mock-uara.

**Pse i zgjodhëm:** Janë të shpejta për t'u ekzekutuar dhe na lejojnë të mbulojmë logjikën komplekse pa pasur nevojë për një bazë të dhënash apo server aktiv.

**Çfarë testojnë në projekt:**
- `tests/unit/bookingService.test.ts` (14 teste) — Verifikon logjikën e tranzicioneve të statusit të rezervimeve, duke u siguruar që vetëm kalimet e lejuara të ndodhin dhe që funksioni nuk hedh excepteione (kontrata "non-throwing").
- `tests/unit/validators.test.ts` (18 teste) — Siguron që formatet e telefonave kosovarë (`+38344…`, `044…` etj.), email-eve, fjalëkalimeve dhe gjenerimit të subdomain-it të jenë të vlefshme, duke parandaluar hyrjen e të dhënave të gabuara.
- `tests/unit/caseMapping.test.ts` (10 teste) — Teston konvertimet mes formateve `camelCase` dhe `snake_case`, veçanërisht për të mbrojtur kundër bug-ut të mëparshëm me `websiteCreationMethod`.
- `src/lib/academic-module/tests/ExportService.test.ts` (4 teste) — Teston shtresën Service të modulit akademik (Repository → Service): happy path me mock-im të BookingRepository dhe FileRepository, plus rastet e gabimit (id mungon, emër i pavlefshëm, repository hedh exception).

### 2. Validation Tests (Vitest + Zod)
**Çfarë janë:** Teste që përdorin skema të definuara me Zod për të verifikuar që objektet e të dhënave plotësojnë kriteret e kërkuara para se të përpunohen më tej.

**Pse i zgjodhëm:** Adresojnë drejtpërdrejt dobësinë e identifikuar në auditim për mungesën e kontrollit të rreptë të input-eve para se ato të dërgohen në databazë.

**Çfarë testojnë në projekt:**
- `tests/validation/bookingSchema.test.ts` (8 teste) — Verifikon që të dhënat e rezervimit (emri, telefoni, ID e shërbimit si UUID, data si datetime ISO) janë të plota dhe në formatin e duhur. Refuzon emër të zbrazët, telefon të zbrazët, UUID të pavlefshëm, datë të pavlefshme dhe objekt krejtësisht bosh.

### 3. End-to-End Tests (Playwright)
**Çfarë janë:** Teste që simulojnë sjelljen e përdoruesit real në shfletues, duke testuar rrjedhën e plotë të aplikacionit nga fillimi në fund.

**Pse i zgjodhëm:** Për të garantuar që faqet kryesore si logini dhe dashboard-i funksionojnë mirë dhe që middleware-i mbron rrugët e rezervuara.

**Çfarë testojnë në projekt:**
- `tests/e2e/auth.spec.ts` (3 teste) — Teston ngarkimin e formularit të login-it, mesazhet e gabimit me kredenciale të gabuara, dhe ridrejtimin e përdoruesve të paautorizuar nga `/dashboard` te `/login`.
- `tests/e2e/publicSite.spec.ts` (2 teste) — Verifikon që rrugët publike (subdomain placeholder + subdomain i panjohur) ngarkohen pa shkaktuar dështime 500 të serverit.

### 4. Wizard Harness (Playwright, vetëm lokal)
**Çfarë është:** Një harness i veçantë në `tests/wizard-harness/` që ekzekutohet me `npm run test:wizard`. Logohet në një llogari testi, kalon nëpër wizard-in 5-hapësh me fixtures të paracaktuara (barbershop tradicional, klinikë, salon, restorant, lavazh, autosallon, freelance, etj.), kapt screenshots të preview-t, dhe i ruan në `tests/wizard-harness/output/<timestamp>/`.

**Pse i zgjodhëm:** Pipeline-i i AI-it nuk mund të testohet me assertion automatike (output-i është krijues, jo deterministik). Harness-i është një mjet zhvilluesi për krahasim vizual njerëzor — kur ndryshohet prompt-i ose post-processor-i, mund të krahasoj outputin e ri me atë të vjetrin pranë e pranë.

**Nuk është pjesë e CI-së**: kërkon kredenciale Anthropic + Supabase, ekzekutohet ndaj site-it të deploy-uar (`https://lokal-web-one.vercel.app` si default), dhe asnjëherë nuk klikon **"Përdor këtë"** — apply-i do të mbishkruante site-in e llogarisë testuese dhe do të prishte fixtures-at e radhës.

## Tabela e Mbulimit (Coverage)

| Skedari i Testuar | Lloji | Nr. Testeve | Çfarë Mbulon |
|---|---|---|---|
| `bookingService.ts` | Unit | 14 | Tranzicionet e statusit, kontrata 'non-throwing', refresh pas update-it |
| `validators.ts` | Unit | 18 | Telefon kosovar (formate ndërkombëtar + lokal), email, password strength, generateSubdomain |
| `store.ts` (fromSnake/toSnake) | Unit | 10 | Konvertimi camelCase↔snake_case, bug i dokumentuar i `websiteCreationMethod` |
| `ExportService.ts` (academic module) | Unit | 4 | Shtresa Service mbi Repository-të, mock-im i Supabase + filesystem |
| `bookingSchema` (Zod) | Validation | 8 | Pastrimi i input-eve para dërgimit në DB |
| Auth flow | E2E | 3 | Formularin e loginit, mesazhet e gabimit, mbrojtjen middleware për `/dashboard` |
| Public site routing | E2E | 2 | Routing-un e subdomeneve, parandalimin e gabimeve 500 për tenant të panjohur |
| Wizard E2E | Harness | N fixtures | Vetëm lokal — screenshots për krahasim njerëzor, jo assertion automatike |

**Total**: 54 teste të automatizuara (Vitest + Playwright e2e), plus harness-i i wizard-it si mjet zhvillimi.

## Çfarë Nuk Testohet (dhe Pse)

1. **Pipeline-i i AI-it (brand-brief, theme generation)** — Output-i është krijues, jo deterministik; assertion-i automatik nuk ka kuptim. Mbulohet manualisht përmes wizard-harness për krahasim vizual, dhe nga A/B harness në `scripts/` (Haiku vs Sonnet) për vlerësim cilësor. Kushton kohë dhe para në çdo run.
2. **Supabase RLS direkt** — Kërkon mjedis testimi me service-role key për të vërtetuar që një user nuk mund të lexojë të dhënat e tjetrit. Politikat e RLS janë në migration 011 dhe verifikohen manualisht në staging.
3. **Image upload në Supabase Storage** — Kërkon konfigurim të plotë të Storage dhe mokim të File API-ve të browser-it. Trajtohet si rrugë e besuar (vetëm pronari mund të ngarkojë).
4. **Progress streaming via Realtime** (`ai_generation_events`, migration 017) — Realtime channel-i është i vështirë për të testuar pa server aktiv; testohet në mënyrë manuale gjatë demos.
5. **Customization Hub direkt-edit i tekstit** — UI me state kompleks (color picker, font picker, preview pane). Testimi do të kërkonte fixture të plotë të DB-së plus snapshot testing.
6. **Multi-staff dhe sistem pagesash** — Funksionalitete të planifikuara, ende të paimplementuara.

## Si të Ekzekutohen Testet

### Unit + Validation Tests (Vitest)
```bash
npm test
```

Ekzekuton të gjitha testet nën `tests/unit/`, `tests/validation/`, dhe `src/lib/academic-module/tests/`.

### Watch mode gjatë zhvillimit
```bash
npm run test:watch
```

### Output i detajuar
```bash
npx vitest run --reporter=verbose
```

### Një test specifik
```bash
npx vitest run tests/unit/bookingService.test.ts
```

### E2E Tests (Playwright)
Kërkon serverin lokal aktiv:
```bash
# Terminali 1:
npm run dev

# Terminali 2:
npx playwright install chromium    # vetëm hera e parë
npx playwright test tests/e2e/
```

### Wizard Harness (vetëm lokal, ndaj site-it të deploy-uar)
```bash
# Vendos kredencialet e llogarisë testuese (jo personalen)
$env:LOKAL_TEST_EMAIL = "test-account@example.com"
$env:LOKAL_TEST_PASSWORD = "your-password"
# Opsionale: ndrysho target URL nga prod te localhost
$env:LOKAL_TEST_URL = "http://localhost:3000"

npm run test:wizard
```

Output-i (screenshot-et + `inputs.json`) ruhet në `tests/wizard-harness/output/<timestamp>/<fixture-name>/`. Folder-i është gitignored.

Më shumë detaje për harness-in: [tests/wizard-harness/README.md](../tests/wizard-harness/README.md).
