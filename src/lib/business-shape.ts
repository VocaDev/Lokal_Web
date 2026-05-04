// Business-shape detection.
//
// The AI generation pipeline emits a single section labeled "Shërbimet"
// (Services) for every business, regardless of what the business actually
// sells. That works for a barbershop or clinic, but reads as nonsense for
// an autosallon (cars), university (programs), restaurant (menu), or
// events business (tickets/packages). This module classifies the business
// into a coarse "shape" from its industry signals so the renderer can pick
// the correct section header and the prompt can frame items appropriately.
//
// Surface-level fix on top of the existing schema — the `sections[]` array
// and `items[]` shape are unchanged. We only label them differently and
// give the model a small framing hint when shape !== 'service'.

export type BusinessShape =
  | 'service'
  | 'retail'
  | 'restaurant'
  | 'education'
  | 'events'
  | 'freelance';

interface DetectArgs {
  industryChip?: string;
  industryText?: string;
  businessDescription?: string;
}

// Order matters — first matching shape wins. Service is the catch-all.
const SHAPE_KEYWORDS: Array<{ shape: Exclude<BusinessShape, 'service'>; words: string[] }> = [
  {
    shape: 'restaurant',
    words: [
      'restorant', 'restaurant', 'kafene', 'cafe', 'qebaptore', 'byrektore',
      'furrë', 'furre', 'bakery', 'pizzeria', 'pasticeri', 'picërri', 'picerri',
    ],
  },
  {
    shape: 'education',
    words: [
      'universitet', 'university', 'fakultet', 'faculty', 'shkollë', 'shkolle',
      'school', 'akademi', 'academy', 'kurs', 'kurse', 'course', 'mësim', 'mesim',
      'learning', 'trajnim', 'training', 'program',
    ],
  },
  {
    shape: 'events',
    words: [
      'event', 'evente', 'koncert', 'festival', 'dasma', 'wedding', 'party',
      'bilet', 'ticket', 'konferencë', 'konference', 'conference',
    ],
  },
  {
    shape: 'freelance',
    words: [
      'freelance', 'freelancer', 'dizajn', 'dizajner', 'designer', 'fotograf',
      'photographer', 'studio', 'agjenci kreative', 'copywriter', 'creative',
    ],
  },
  // Retail last among non-default — more permissive keywords, would otherwise
  // catch an "auto" mention inside e.g. "automatik" or a "shop"-suffixed word.
  {
    shape: 'retail',
    words: [
      'autosallon', 'auto sallon', 'dyqan', 'shitje', 'produkte', 'boutique',
      'e-commerce', 'ecommerce', 'handmade', 'marketing', 'shop', 'store', 'retail',
    ],
  },
];

export function detectBusinessShape(args: DetectArgs): BusinessShape {
  const haystack = [args.industryChip, args.industryText, args.businessDescription]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  if (!haystack) return 'service';

  for (const { shape, words } of SHAPE_KEYWORDS) {
    if (words.some(w => haystack.includes(w))) return shape;
  }
  return 'service';
}

const HEADERS_SQ: Record<BusinessShape, string> = {
  service: 'Shërbimet',
  retail: 'Pse Te Ne',
  restaurant: 'Menyja',
  education: 'Programet',
  events: 'Paketat',
  freelance: 'Çfarë Bëj',
};

const HEADERS_EN: Record<BusinessShape, string> = {
  service: 'Services',
  retail: 'Why Us',
  restaurant: 'Menu',
  education: 'Programs',
  events: 'Packages',
  freelance: 'What I Do',
};

export function sectionHeaderForShape(shape: BusinessShape, language: 'sq' | 'en'): string {
  return (language === 'en' ? HEADERS_EN : HEADERS_SQ)[shape];
}
