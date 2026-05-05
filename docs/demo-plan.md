# Demo Plan — LokalWeb

## 1. Titulli i projektit

**LokalWeb** — Website-as-a-Service për biznese të vogla në Kosovë

---

## 2. Problemi që zgjidh

Shumica e bizneseve të vogla në Kosovë — barberë, restorante, klinika, sallone bukurie, dyqane, rrobaqepëse, lavazhe, autosallone — nuk kanë faqe interneti. Ato ekzistojnë vetëm në Instagram ose TikTok, ku klientët e kanë të vështirë të gjejnë orarin, shërbimet apo çmimet.

LokalWeb e zgjidh këtë duke ofruar një platformë që krijon faqe profesionale në më pak se 5 minuta — pa nevojë për dizajner, pa kod. Biznesi përshkruan veten me fjalë të thjeshta dhe AI gjeneron faqen e plotë: tekst, layout, ngjyra, përmbajtje.

---

## 3. Përdoruesit kryesorë

**Përdoruesi kryesor:** Pronarë të bizneseve të vogla në Kosovë — barberë, restorante, klinika, sallone bukurie, dyqane, rrobaqepëse, palestra, lavazhe, fotografë, akademi/kurse. Tipikisht persona pa njohuri teknike që menaxhojnë biznesin vetë dhe nuk kanë buxhet për dizajner ose zhvillues web.

**Përdoruesi sekondar:** Klientët e këtyre bizneseve që vizitojnë faqen për të parë shërbimet, oraret dhe — ku është e zbatueshme — për të rezervuar termin online.

---

## 4. Flow-i që do ta demonstroni

**Flow-i:** Wizard 5-hapësh → Gjenerim me AI → Faqe publike në subdomain unik

Përdoruesi (i loguar në një llogari testi) hyn në `/dashboard/website-builder`, përshkruan biznesin e vet (industria, qyteti, shërbimet, përshkrimi, çfarë e bën të veçantë), zgjedh tonin, gjuhën dhe stilin vizual, dhe klikon "Gjenero faqen ✨". Sistemi thërret dy modele AI në sekuencë (brand brief → tema parametrike), aplikon validim dhe normalizim në backend, dhe brenda 30-60 sekondash shfaqet preview-i. Klikohet "Përdor këtë" dhe faqja del menjëherë në subdomain-in unik të biznesit.

**Pse pikërisht ky flow:**

Ky është thelbi i projektit dhe pjesa më e fortë e implementuar. Demonstron në një hark të vetëm:

- integrim real me modele AI (jo demo, jo mock) — Anthropic Claude Haiku/Sonnet
- arkitekturë multi-tenant me subdomain routing përmes `middleware.ts`
- pipeline backend me dy faza, post-processing dhe validim me retry
- render parametrik (`DynamicSiteRenderer`) që interpreton seksione të gjeneruara — `hero`, `services`, `story`, `gallery`, `footer`
- arketipa vizualë (8 stile, palet WCAG-compliant) që eliminojnë bug-et e kontrastit të AI-it
- lokalizim specifik për tregun e Kosovës (regjistër kosovar, qytete, monedha Euro)
- progress streaming në kohë reale përmes Supabase Realtime gjatë gjenerimit

Pjesë të tjera (auth, konfirmim emaili, RLS, dashboard menaxhimi i shërbimeve/orareve, customization hub me editim të drejtpërdrejtë të tekstit) janë të zhvilluara dhe funksionale, por nuk shtojnë vlerë demonstrative në 6-7 minuta. Wizard → Website është ~90% e impresionit teknik në ~30% të kohës.

---

## 5. Një problem real që e ke zgjidhur

**Problemi:** Modelet e AI-it janë të papërcaktuar — japin tekst të lirë, halucinojnë çmime dhe vite, ndonjëherë shkruajnë në regjistrin e Tiranës në vend të atij kosovar, dhe gjenerojnë palet ngjyrash që dështojnë në kontrast (p.sh. tekst krem mbi sfond krem). Më duhej një mënyrë që AI të prodhonte JSON të strukturuar, faktualisht të saktë, vizualisht të lexueshëm, dhe me gjuhë autentike për Kosovën.

**Ku ishte problemi:** Versioni i parë ishte një thirrje e vetme: "krijo faqe për biznesin X". Rezultati ishte i bukur, por i palidhur me realitetin — çmime të shpikura, shërbime që biznesi nuk i ofron, përmbajtje që ndryshonte plotësisht çdo herë, dhe kontraste të dështuara në UI.

**Si e zgjidha:** Ndava gjenerimin në një pipeline me katër faza:

1. **Brand Brief (Haiku)** — `src/lib/ai/brand-brief.ts`. Modeli i parë lexon inputet dhe prodhon një strategji marke të strukturuar (positioning, definingTraits, targetCustomer, voice, culturalAnchor) përmes JSON Schema strict.
2. **Theme Generation (Haiku/Sonnet)** — `src/lib/ai/theme.ts`. Modeli i dytë merr brief-in dhe prodhon strukturën e plotë të faqes — një listë `sections[]` me layout-e parametrike (hero, services, story, gallery, footer) që janë të mjaftueshme për një renderer dinamik.
3. **Post-processor** — kodi merr përgjegjësinë për gjithçka që nuk i besohet AI-it: aplikon palet nga arketipa të para-validuar (`src/lib/archetypes.ts`), ridrejton çmimet/kohëzgjatjet nga inputet e përdoruesit, validon CTA-të kundër veprimeve reale të faqes, dhe aplikon zëvendësime leksikore për regjistrin kosovar (`tani` → `tash`, `çfarë` → `çka`, `tek` → `te`) përmes `src/lib/kosovo-substitutions.ts`.
4. **Validim & Rigjenerim** — outputi kalon nëpër validim (gjatësi tekstesh, fraza të ndaluara në `src/lib/banned-phrases.ts`, kontrast). Nëse dështon, sistemi rigjeneron një herë me feedback specifik.

**Çfarë mësova:** AI nuk është magjistar — është bashkëpunëtor që duhet kontrolluar. Krijimit i lihet liria; saktësisë faktike, paletave, dhe gjuhës i takon kodi tradicional. Arkitektura "AI + post-processor + validator" është më e besueshme se çdo prompt-engineering i izoluar.

---

## 6. Çka mbetet ende e dobët

**Pjesa më e dobët: outputi i AI-it ende konvergjon në mënyrë të padëshiruar.**

Kur të njëjtin biznes e gjeneroj 5-7 herë rresht, AI-i jep tekste shumë të ngjashme me njëri-tjetrin. P.sh., një berberhane traditionale me input të njëjtë mund të prodhojë çdo herë variacione të "Tre karrige. Dyzet vjet." Strukturat e seksioneve gjithashtu vijnë me sekuencë të njëjtë — hero → shërbime → histori → galeri → footer — pavarësisht llojit të biznesit. Rezultati ndihet pak si "AI-vibes" sesa si faqe e dizajnuar nga njerëz të vërtetë.

**Pse ndodh:** Modeli optimizon për "rregullat" e prompt-it. Kur kemi shumë rregulla që e ngushtojnë krijimtarinë (anti-template checks, concrete detail requirements, banned phrases, voice guidelines, archetype guardrails), AI-i konvergjon në "zgjidhjen më të sigurt që plotëson të gjitha rregullat" — dhe kjo zgjidhje është gati e njëjta çdo herë.

**Çka kam bërë deri tani:**

- Shtova shtresën e zëvendësimeve leksikore për regjistrin kosovar
- Shtova rregull anti-aforizëm (max një frazë e mençur për faqe)
- Shtova rregull anti-konvergjencë (shembujt si referencë angle, jo si template)
- Hoqa palet ngjyrash nga AI-i — ato vijnë gjithmonë nga arketipa të para-validuar
- Bëra layout-et brenda seksioneve të zgjedhshme nga përdoruesi (Step 3 i wizard-it) ose të lëna në "AI vendos"

**Çka mbetet:** Sekuenca e seksioneve është ende e ngurta. Pas demos, planifikoj të eksperimentoj me struktura më të lira — disa biznese mund të mos kenë seksion histori fare, të tjera mund të nisin me galeri ose me menu. Kjo do kërkonte rishikim të AI-it për të vendosur jo vetëm përmbajtjen, por edhe se cilat seksione duhen dhe në çfarë radhe.

---

## 7. Struktura e prezantimit (6–7 min)

Prezantimi është 6-7 minuta, i ndarë në pesë pjesë:

### 1. Hyrja (45 sekonda)

Prezantim i shpejtë i problemit dhe i projektit. "Shumica e bizneseve të vogla në Kosovë nuk kanë faqe interneti — ekzistojnë vetëm në Instagram. LokalWeb e zgjidh këtë duke krijuar faqe profesionale në më pak se 5 minuta përmes AI-it." Pa slides, vetëm flas ndërsa hap browser-in.

### 2. Demo Live (3 minuta)

Shfaq flow-in kryesor: wizard → gjenerim → faqe publike.

- Hap `/dashboard/website-builder` (i loguar tashmë në një llogari testi me emër real biznesi)
- Plotësoj inputet nëpër 5 hapa: të dhënat bazë → përshkrimi & shërbimet → layout-i → stili vizual → toni & gjuha (~75 sek)
- Klikoj "Gjenero faqen ✨" dhe shpjegoj çfarë po ndodh në backend ndërsa pres (~45 sek). Progress-i streamohet live nga Supabase Realtime.
- Shfaq preview-n dhe komentoj seksionet kryesore (~50 sek)
- Klikoj "Përdor këtë" dhe hap faqen publike në subdomain-in unik (~10 sek)

### 3. Shpjegimi teknik (90 sekonda)

Shpjegoj shkurtimisht arkitekturën:

- Stack: Next.js 14 App Router, Supabase, Vercel
- Multi-tenancy me subdomain routing — `middleware.ts` rezolvon tenant-in nga hostname dhe rishkruan në `/[subdomain]`
- Pipeline AI me dy modele (Haiku për brief, Haiku/Sonnet për tema) plus një post-processor në kod
- Renderer parametrik (`DynamicSiteRenderer`) që interpreton seksionet e gjeneruara
- 8 arketipa vizualë me palet WCAG-compliant — AI nuk shpik ngjyra
- RLS në Supabase për izolim të të dhënave për tenant

Tregoj shkurtimisht strukturën e kodit në GitHub.

### 4. Problemi + Zgjidhja (60 sekonda)

Tregoj problemin e arkitekturës AI-it (siç është në seksionin 5): si AI single-call jepte halucinacione dhe palet të dështuara në kontrast, dhe si pipeline 4-fazësh me post-processor + arketipa e zgjidhi. Kjo është pjesa më teknike e prezantimit dhe pjesa që e dallon këtë projekt nga zgjidhjet e thjeshta "wrap a prompt".

### 5. Mbyllja (30 sekonda)

Përmbledhje shumë e shkurtër: çka mbetet për të ardhmen (refactor i strukturës së seksioneve për diversitet më të madh, integrim me WhatsApp për notifikime, super admin panel, sistem pagesash për abonime). Pyetje nga profesori.

### Plan B nëse demo live dështon

Kam pre-gjeneruar 2-3 faqe shembuj të ruajtura në llogari testi. Nëse gjenerimi në kohë reale dështon ose vonohet, hap drejtpërdrejt një nga faqet e gjeneruara më parë dhe vazhdoj me shpjegimin teknik. Screenshots të wizard-it dhe të faqes publike janë gati në `docs/screenshots/` për referencë vizuale. Gjithashtu, harness-i `npm run test:wizard` mban output në `tests/wizard-harness/output/` me screenshot-e nga rune të mëparshme nëse më duhet vërtetim që pipeline-i punon.
