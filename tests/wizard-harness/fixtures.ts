// Fixtures for the AI wizard testing harness. Edit / add / remove freely.
// Each entry drives one full wizard run end-to-end and produces a screenshot
// folder under output/<timestamp>/<name>/.
//
// Layout fields each accept a specific value OR 'ai' to let the model decide.
// Mixed coverage in this list — half lock specific layouts (so we can verify
// the post-process layout-lock pass works), half use 'ai' across the board
// (so we exercise the AI free-choice + brief-driven decision tree).

export interface WizardFixture {
  name: string;
  businessName: string;
  industryChip?: 'barbershop' | 'restaurant' | 'clinic' | 'beauty_salon' | 'gym' | 'other';
  industryText?: string;
  city: string;
  uniqueness: string;
  services: { name: string; price?: string; duration?: string }[];
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  heroLayout: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'ai';
  storyLayout: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote' | 'ai';
  servicesLayout: 'list' | 'grid-3' | 'editorial-rows' | 'cards' | 'ai';
  galleryLayout: 'masonry' | 'grid-uniform' | 'showcase' | 'strip' | 'ai';
  mood: 'warm' | 'cool' | 'bold' | 'elegant' | 'custom';
  fontPersonality: 'editorial' | 'modern' | 'friendly' | 'bold' | 'elegant';
  language: 'sq' | 'en';
  tone: 'friendly' | 'professional' | 'bold';
}

export const FIXTURES: WizardFixture[] = [
  // 1. Fully locked — every section uses a specific layout.
  {
    name: 'barbershop-traditional',
    businessName: 'Berberi i Babës',
    industryChip: 'barbershop',
    city: 'Prizren, Shadërvan',
    uniqueness: 'Tre karrige. Dyzet vjet. Prerja e babait tim është e njëjta sot si në vitin 1985.',
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
    mood: 'warm',
    fontPersonality: 'editorial',
    language: 'sq',
    tone: 'friendly',
  },
  // 2. All AI — nothing locked, full creative latitude.
  {
    name: 'coffee-modern',
    businessName: 'Hana Coffee Lab',
    industryChip: 'other',
    industryText: 'Kafene specialiteti',
    city: 'Prishtinë, Sunny Hill',
    uniqueness: 'Kokrrat tona piqen çdo të hënë në mëngjes. Kafja që pi sot është pjekur më pak se 96 orë më parë.',
    services: [
      { name: 'Espresso', price: '2', duration: '3' },
      { name: 'Latte', price: '3', duration: '5' },
      { name: 'Filtër V60', price: '4', duration: '8' },
    ],
    bookingMethod: 'walkin',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
    mood: 'cool',
    fontPersonality: 'modern',
    language: 'sq',
    tone: 'professional',
  },
  // 3. Fully locked, bold direction.
  {
    name: 'gym-bold',
    businessName: 'Forca Studio',
    industryChip: 'gym',
    city: 'Pejë, Qendër',
    uniqueness: 'Maksimumi 8 njerëz në një orë. Çdo seancë ka trajner. Pa pasqyra dramatike.',
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
    mood: 'bold',
    fontPersonality: 'bold',
    language: 'sq',
    tone: 'bold',
  },
  // 4. All AI, elegant direction.
  {
    name: 'salon-elegant',
    businessName: 'Studio Adelina',
    industryChip: 'beauty_salon',
    city: 'Prishtinë, Dardania',
    uniqueness: 'Çdo klient takim 90 minuta. Pa dy klientë në të njëjtën kohë. Stilistja dëgjon para se prek flokët.',
    services: [
      { name: 'Prerje + stil', price: '35', duration: '90' },
      { name: 'Ngjyrosje e plotë', price: '60', duration: '120' },
      { name: 'Paketa nuse', price: '150', duration: '240' },
    ],
    bookingMethod: 'appointments',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
    mood: 'elegant',
    fontPersonality: 'elegant',
    language: 'sq',
    tone: 'friendly',
  },
  // 5. Mixed — hero + services locked, story + gallery on AI. Tests the
  //    "some locked, some AI" path the post-processor must handle cleanly.
  {
    name: 'clinic-trust',
    businessName: 'Klinika Familjare Dr. Krasniqi',
    industryChip: 'clinic',
    city: 'Mitrovicë',
    uniqueness: 'Pritja mesatare 8 minuta. Mjekët tanë trajnohen në Vjenë çdo dy vjet. Familja juaj është familja jonë.',
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
    mood: 'cool',
    fontPersonality: 'friendly',
    language: 'sq',
    tone: 'professional',
  },
];
