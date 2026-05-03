// Fixtures for the AI wizard testing harness. Edit / add / remove freely.
// Each entry drives one full wizard run end-to-end and produces a screenshot
// folder under output/<timestamp>/<name>/.
//
// Layout fields each accept a specific value OR 'ai' to let the model decide.
// Mixed coverage in this list — half lock specific layouts (so we can verify
// the post-process layout-lock pass works), half use 'ai' across the board
// (so we exercise the AI free-choice + brief-driven decision tree).
//
// Services may be empty []. Some fixtures intentionally provide ONLY a
// businessDescription with no service rows — those exercise the "infer
// services from description" path on the theme prompt.

export interface WizardFixture {
  name: string;
  industryChip?: 'barbershop' | 'restaurant' | 'clinic' | 'beauty_salon' | 'gym' | 'other';
  industryText?: string;
  city: string;
  uniqueness: string;
  businessDescription: string;
  services: { name: string; price?: string; duration?: string }[];
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  heroLayout: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'ai';
  storyLayout: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote' | 'ai';
  servicesLayout: 'list' | 'grid-3' | 'editorial-rows' | 'cards' | 'ai';
  galleryLayout: 'masonry' | 'grid-uniform' | 'showcase' | 'strip' | 'ai';
  // Visual archetype — replaces the old mood + fontPersonality pickers.
  // Use any key from src/lib/archetypes.ts, or 'ai' (Sonnet picks) or
  // 'custom' (user provides brandPrimary/brandAccent + customFont).
  archetypeKey:
    | 'i-ngrohte' | 'erresi-karakter' | 'besim-qartesi' | 'gjalleri-moderne'
    | 'leter-stil' | 'studioja' | 'familjar-mirprites' | 'elegant-rafinuar'
    | 'ai' | 'custom';
  brandPrimary?: string;   // only when archetypeKey === 'custom'
  brandAccent?: string;    // only when archetypeKey === 'custom'
  customFont?: 'playfair' | 'space-grotesk' | 'dm-sans' | 'poppins';
  language: 'sq' | 'en';
  tone: 'friendly' | 'professional' | 'bold';
}

export const FIXTURES: WizardFixture[] = [
  // 1. Fully locked — every section uses a specific layout. With services.
  {
    name: 'barbershop-traditional',
    industryChip: 'barbershop',
    city: 'Prizren, Shadërvan',
    uniqueness: 'Tre karrige. Dyzet vjet. Prerja e babait tim është e njëjta sot si në vitin 1985.',
    businessDescription: 'Berber tradicional që ofron qethje, brisk dhe paketa të plota për burra në Shadërvan, Prizren — i njëjti zanat prej dyzet vjetësh.',
    services: [
      { name: 'Qethje klasike', price: '8', duration: '30' },
      { name: 'Brisk i nxehtë', price: '12', duration: '40' },
      { name: 'Paketa e plotë', price: '18', duration: '60' },
    ],
    bookingMethod: 'appointments',
    heroLayout: 'editorial',
    storyLayout: 'pull-quote',
    servicesLayout: 'editorial-rows',
    galleryLayout: 'grid-uniform',
    archetypeKey: 'i-ngrohte',
    language: 'sq',
    tone: 'friendly',
  },
  // 2. All AI — broad-business case. NO specific services rows: exercises
  //    the "infer 3-5 representative services from the businessDescription"
  //    path. The hero must NOT reduce to "Mëso Python dhe Anglisht" — it
  //    must speak to the institution.
  {
    name: 'coding-academy',
    industryChip: 'other',
    industryText: 'Akademi mësimi',
    city: 'Prishtinë, Qyteti i Ri',
    uniqueness: 'Grupe të vogla. Mësues që përgjigjen te WhatsApp pas orarit. Të gjithë studentët dalin me një projekt që mund ta tregojnë.',
    businessDescription: 'Mësoj programim dhe gjuhë të huaja për të rinj dhe profesionistë — kurse në grupe të vogla, niveli fillestar deri i avancuar, online dhe në klasë.',
    services: [],
    bookingMethod: 'appointments',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
    archetypeKey: 'ai',
    language: 'sq',
    tone: 'professional',
  },
  // 3. Fully locked, bold direction. With services.
  {
    name: 'gym-bold',
    industryChip: 'gym',
    city: 'Pejë, Qendër',
    uniqueness: 'Maksimumi 8 njerëz në një orë. Çdo seancë ka trajner. Pa pasqyra dramatike.',
    businessDescription: 'Palestër me kapacitet të kufizuar dhe trajnim personal — funksional, fuqi, kondicion. Pa muzikë dramatike, pa pasqyra; vetëm hekur dhe trajnerë që të shohin formën.',
    services: [
      { name: 'Seancë e vetme', price: '20', duration: '60' },
      { name: 'Paket 10 seancash', price: '180', duration: '60' },
      { name: 'Anëtarësim mujor', price: '100', duration: '60' },
    ],
    bookingMethod: 'appointments',
    heroLayout: 'fullbleed',
    storyLayout: 'two-column',
    servicesLayout: 'cards',
    galleryLayout: 'masonry',
    archetypeKey: 'studioja',
    language: 'sq',
    tone: 'bold',
  },
  // 4. All AI — freelance case. NO specific services rows: services come
  //    from the description. Tests the empty-services path with a fully
  //    AI-driven layout pass.
  {
    name: 'freelance-designer',
    industryChip: 'other',
    industryText: 'Dizajn dhe identitet vizual',
    city: 'Prishtinë, Dardania',
    uniqueness: 'Punoj me një klient në një kohë. Pa agjenci, pa email-zinxhirë — vetëm WhatsApp dhe një takim në javë.',
    businessDescription: 'Dizajnere e pavarur që ndërton identitete vizuale për biznese të vogla — logo, tipografi, sjellje në rrjete sociale, paketim. Procesi nis me bisedë, jo me brief.',
    services: [],
    bookingMethod: 'walkin',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
    archetypeKey: 'elegant-rafinuar',
    language: 'sq',
    tone: 'friendly',
  },
  // 5. Mixed — hero + services locked, story + gallery on AI. Tests the
  //    "some locked, some AI" path the post-processor must handle cleanly.
  {
    name: 'clinic-trust',
    industryChip: 'clinic',
    city: 'Mitrovicë',
    uniqueness: 'Pritja mesatare 8 minuta. Mjekët tanë trajnohen në Vjenë çdo dy vjet. Familja juaj është familja jonë.',
    businessDescription: 'Klinikë familjare që ofron konsulta të përgjithshme, specialistë dhe analiza në Mitrovicë — pritje të shkurtra, mjekë me trajnim ndërkombëtar dhe komunikim të qartë me familjen.',
    services: [
      { name: 'Konsultë e përgjithshme', price: '30', duration: '20' },
      { name: 'Specialist', price: '60', duration: '30' },
      { name: 'Analizë gjaku', price: '25', duration: '15' },
    ],
    bookingMethod: 'appointments',
    heroLayout: 'split',
    storyLayout: 'ai',
    servicesLayout: 'list',
    galleryLayout: 'ai',
    archetypeKey: 'besim-qartesi',
    language: 'sq',
    tone: 'professional',
  },
  // 6. Public institution — specific programs but no prices/durations. The
  //    services section should present academic programs, not appointments:
  //    no euros, no "180 min"; duration labels should be years if shown.
  {
    name: 'public-university',
    industryChip: 'other',
    industryText: 'Universitet publik shtetëror',
    city: 'Mitrovicë',
    uniqueness: 'Universitet publik pa pagesë studimi, me programe të akredituara dhe fokus në zhvillimin e kapitalit njerëzor të rajonit.',
    businessDescription: 'Universitet publik shtetëror që ofron programe Bachelor dhe Master falas në shkenca kompjuterike, drejtësi, menaxhim publik dhe inxhinieri për studentët e Mitrovicës dhe rajonit.',
    services: [
      { name: 'Bachelor në Shkenca Kompjuterike' },
      { name: 'Bachelor në Drejtësi' },
      { name: 'Master në Menaxhim Publik' },
      { name: 'Master në Inxhinieri dhe Teknologji' },
    ],
    bookingMethod: 'none',
    heroLayout: 'fullbleed',
    storyLayout: 'long-form',
    servicesLayout: 'editorial-rows',
    galleryLayout: 'ai',
    archetypeKey: 'leter-stil',
    language: 'sq',
    tone: 'professional',
  },
];
