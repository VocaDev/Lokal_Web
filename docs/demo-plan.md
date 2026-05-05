# Demo Plan — LokalWeb

## 1. Titulli i projektit

**LokalWeb** — Website-as-a-Service për biznese të vogla në Kosovë

---

## 2. Problemi që zgjidh

Shumica e bizneseve të vogla në Kosovë — barberë, restorante, klinika, dyqane, rrobaqepëse — nuk kanë faqe interneti. Ato ekzistojnë vetëm në Instagram ose TikTok, ku klientët e kanë të vështirë të gjejnë orarin, shërbimet apo çmimet.

LokalWeb e zgjidh këtë duke ofruar një platformë që krijon faqe profesionale në më pak se 5 minuta — pa nevojë për dizajner, pa kod. Biznesi përshkruan veten me fjalë të thjeshta, dhe AI gjeneron faqen e plotë.

---

## 3. Përdoruesit kryesorë

**Përdoruesi kryesor:** Pronarë të bizneseve të vogla në Kosovë — barberë, restorante, klinika, sallone bukurie, dyqane, rrobaqepëse, palestra. Tipikisht persona pa njohuri teknike që menaxhojnë biznesin vetë dhe nuk kanë buxhet për dizajner ose zhvillues web.

**Përdoruesi sekondar:** Klientët e këtyre bizneseve që vizitojnë faqen për të parë shërbimet, oraret dhe për të rezervuar termin online.

---

## 4. Flow-i që do ta demonstroni

**Flow-i:** Wizard → Gjenerim me AI → Faqe publike

Përdoruesi (i loguar tashmë në një llogari testi) hyn në wizard-in 5-hapësh, përshkruan biznesin e vet, zgjedh tonin, gjuhën, stilin vizual, dhe klikon "Gjenero faqen". Sistemi thërret dy modele AI në sekuencë (brand brief → tema dhe përmbajtja), aplikon validim dhe normalizim në backend, dhe brenda 30-60 sekondash kthen një faqe të plotë profesionale që mund të aplikohet menjëherë në një subdomain unik.

**Pse pikërisht ky flow:**

Ky është thelbi i projektit dhe pjesa më e fortë e implementuar. Demonstron në një hark të vetëm:

- integrim real me modele AI (jo demo, jo mock)
- arkitekturë multi-tenant me subdomain routing
- pipeline backend me dy faza, validim dhe post-processing
- render dinamik bazuar në një strukturë seksionesh të gjeneruara
- lokalizim specifik për tregun e Kosovës (regjistër kosovar, place names, monedha Euro)

Pjesë të tjera (auth, konfirmim emaili, RLS, dashboard menaxhimi) janë të zhvilluara por nuk shtojnë vlerë demonstrative në 6-7 minuta. Wizard → Website është 90% e impresionit teknik në 30% të kohës.

---

## 5. Një problem real që e ke zgjidhur

**Problemi:** Modelet e AI-it janë të papërcaktuar — japin tekst të lirë, halucinojnë çmime dhe vite, ndonjëherë shkruajnë në regjistrin e Tiranës në vend të atij kosovar. Më duhej një mënyrë që AI të prodhonte JSON të strukturuar, faktualisht të saktë, dhe me gjuhë autentike për Kosovën.

**Ku ishte problemi:** Versioni i parë ishte një thirrje e vetme: "krijo faqe për biznesin X". Rezultati ishte i bukur, por i palidhur me realitetin — çmime të shpikura, shërbime që biznesi nuk i ofron, përmbajtje që ndryshonte plotësisht çdo herë.

**Si e zgjidha:** Ndava gjenerimin në një pipeline me katër faza:

1. **Brand Brief (Haiku):** Modeli i parë lexon inputet dhe prodhon një strategji marke të strukturuar përmes JSON Schema.
2. **Theme Generation (Sonnet/Haiku):** Modeli i dytë merr brief-in dhe prodhon strukturën e plotë të faqes — seksione, layout, tekst.
3. **Post-processor:** Kodi merr përgjegjësinë për gjithçka që nuk i besohet AI-it: aplikon paleta nga arketipa të validuar, ridrejton çmimet nga inputet e përdoruesit, validon CTA-të, dhe aplikon zëvendësime leksikore për regjistrin kosovar (`tani` → `tash`, `çfarë` → `çka`).
4. **Validim & Rigjenerim:** Outputi kalon nëpër validim. Nëse dështon, sistemi rigjeneron një herë me feedback specifik.

**Çfarë mësova:** AI nuk është magjistar — është bashkëpunëtor që duhet kontrolluar. Krijimit i lihet liria; saktësisë faktike i takon kodi tradicional. Arkitektura "AI + post-processor" është më e besueshme se çdo prompt-engineering i izoluar.

---

## 6. Çka mbetet ende e dobët

**Pjesa më e dobët: outputi i AI-it ende konvergjon në mënyrë të padëshiruar.**

Kur të njëjtin biznes e gjeneroj 5-7 herë rresht, AI-i jep tekste shumë të ngjashme me njëri-tjetrin. P.sh., një berberhane traditionale me input të njëjtë mund të prodhojë çdo herë variacione të "Tre karrige. Dyzet vjet." Layout-et gjithashtu vijnë me strukturë të njëjtë — hero, shërbime, histori, footer — pavarësisht llojit të biznesit. Rezultati ndihet pak si "AI-vibes" sesa si faqe e dizajnuar nga njerëz të vërtetë.

**Pse ndodh:** Modeli optimizon për "rregullat" e prompt-it. Kur kemi shumë rregulla që e ngushtojnë krijimtarinë (anti-template checks, concrete detail requirements, banned phrases, voice guidelines), AI-i konvergjon në "zgjidhjen më të sigurt që plotëson të gjitha rregullat" — dhe kjo zgjidhje është gati e njëjta çdo herë.

**Çka kam bërë deri tani:**

- Shtova një shtresë zëvendësimesh leksikore për regjistrin kosovar (`tani` → `tash`)
- Shtova rregull anti-aforizëm (max një frazë e mençur për faqe)
- Shtova rregull anti-konvergjencë (shembujt si referencë angle, jo si template)

**Çka mbetet:** Strukturat e seksioneve janë ende të ngurta. Të gjitha faqet ndjekin sekuencën hero → shërbime → histori → footer. Layout-et brenda seksioneve variojnë, por sekuenca jo. Pas demos, planifikoj të eksperimentoj me struktura më të lira — disa biznese mund të mos kenë seksion histori fare, të tjera mund të nisin me galeri ose me menu, etj. Kjo do kërkonte rishikim të AI-it për të vendosur jo vetëm përmbajtjen, por edhe se cilat seksione duhen.

---

## 7. Struktura e prezantimit (6–7 min)

Prezantimi është 6-7 minuta, i ndarë në pesë pjesë:

### 1. Hyrja (45 sekonda)

Prezantim i shpejtë i problemit dhe i projektit. "Shumica e bizneseve të vogla në Kosovë nuk kanë faqe interneti — ekzistojnë vetëm në Instagram. LokalWeb e zgjidh këtë duke krijuar faqe profesionale në më pak se 5 minuta përmes AI-it." Pa slides, vetëm flas ndërsa hap browser-in.

### 2. Demo Live (3 minuta)

Shfaq flow-in kryesor: wizard → gjenerim → faqe publike.

- Hap wizard-in nga `/dashboard` (i loguar tashmë në një llogari testi me emër real biznesi)
- Plotësoj inputet: industria, qyteti, përshkrimi, shërbimet, toni, stili vizual (~60 sek)
- Klikoj "Gjenero" dhe shpjegoj çfarë po ndodh në backend ndërsa pres (~45 sek)
- Shfaq preview-n dhe komentoj seksionet kryesore (~60 sek)
- Klikoj "Aplikoje" dhe hap faqen publike në subdomain-in unik (~15 sek)

### 3. Shpjegimi teknik (90 sekonda)

Shpjegoj shkurtimisht arkitekturën:

- Stack: Next.js 14, Supabase, Vercel
- Multi-tenancy me subdomain routing (middleware në Next.js)
- Pipeline AI me dy modele (Haiku për brief, Haiku/Sonnet për tema)
- Post-processor që validoj, rikalibron dhe normalizon outputin
- RLS në Supabase për izolim të të dhënave për tenant

Tregoj shkurtimisht strukturën e kodit në GitHub.

### 4. Problemi + Zgjidhja (60 sekonda)

Tregoj problemin e arkitekturës AI-it (siç është në seksionin 5 të këtij dokumenti): si AI single-call jepte halucinacione, dhe si pipeline 4-fazësh me post-processor e zgjidhi. Kjo është pjesa më teknike e prezantimit dhe pjesa që e dallon këtë projekt nga zgjidhjet e thjeshta.

### 5. Mbyllja (30 sekonda)

Përmbledhje shumë e shkurtër: çka mbetet për të ardhmen (refactor i strukturës së seksioneve për diversitet më të madh, integrim me WhatsApp, super admin panel). Pyetje nga profesori.

### Plan B nëse demo live dështon

Kam pre-gjeneruar 2-3 faqe shembuj të ruajtura në llogari testi. Nëse gjenerimi në kohë reale dështon ose vonohet, hap drejtpërdrejt një nga faqet e gjeneruara më parë dhe vazhdoj me shpjegimin teknik. Screenshots të wizard-it dhe të faqes publike janë gati në një folder lokal për referencë vizuale.
