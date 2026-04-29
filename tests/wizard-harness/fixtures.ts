// Fixtures for the AI wizard testing harness. Edit / add / remove freely.
// Each entry drives one full wizard run end-to-end and produces a screenshot
// folder under output/<timestamp>/<name>/.
//
// `hero` is restricted to the four layouts the wizard UI actually exposes
// in Step 3. The AI itself can emit `asymmetric`/`fullbleed` heroes, but a
// human user can never pick those, so testing them via this harness would
// not represent real usage.

export interface WizardFixture {
  name: string;
  businessName: string;
  industryChip?: 'barbershop' | 'restaurant' | 'clinic' | 'beauty_salon' | 'gym' | 'other';
  industryText?: string;
  city: string;
  uniqueness: string;
  services: { name: string; price?: string; duration?: string }[];
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  hero: 'cinematic' | 'split' | 'centered' | 'editorial';
  sectionPriority: 'services' | 'story' | 'gallery';
  density: 'sparse' | 'dense';
  mood: 'warm' | 'cool' | 'bold' | 'elegant' | 'custom';
  fontPersonality: 'editorial' | 'modern' | 'friendly' | 'bold' | 'elegant';
  language: 'sq' | 'en';
  tone: 'friendly' | 'professional' | 'bold';
}

export const FIXTURES: WizardFixture[] = [
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
    hero: 'editorial',
    sectionPriority: 'story',
    density: 'dense',
    mood: 'warm',
    fontPersonality: 'editorial',
    language: 'sq',
    tone: 'friendly',
  },
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
    hero: 'editorial',
    sectionPriority: 'story',
    density: 'sparse',
    mood: 'cool',
    fontPersonality: 'modern',
    language: 'sq',
    tone: 'professional',
  },
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
    hero: 'cinematic',
    sectionPriority: 'services',
    density: 'dense',
    mood: 'bold',
    fontPersonality: 'bold',
    language: 'sq',
    tone: 'bold',
  },
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
    hero: 'centered',
    sectionPriority: 'story',
    density: 'sparse',
    mood: 'elegant',
    fontPersonality: 'elegant',
    language: 'sq',
    tone: 'friendly',
  },
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
    hero: 'split',
    sectionPriority: 'services',
    density: 'dense',
    mood: 'cool',
    fontPersonality: 'friendly',
    language: 'sq',
    tone: 'professional',
  },
];
