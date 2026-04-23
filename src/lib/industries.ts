export const INDUSTRIES = ['barbershop', 'restaurant', 'clinic', 'beauty_salon', 'gym', 'other'] as const;

export type Industry = typeof INDUSTRIES[number];

export const INDUSTRY_LABELS: Record<Industry, { en: string; sq: string }> = {
  barbershop:   { en: 'Barbershop',   sq: 'Berber' },
  restaurant:   { en: 'Restaurant',   sq: 'Restorant' },
  clinic:       { en: 'Clinic',       sq: 'Klinikë' },
  beauty_salon: { en: 'Beauty salon', sq: 'Sallon bukurie' },
  gym:          { en: 'Gym',          sq: 'Palestër' },
  other:        { en: 'Other',        sq: 'Tjetër' },
};

export function normalizeIndustry(raw: string | null | undefined): Industry {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().trim();

  if (lower === 'beauty-salon' || lower === 'salon' || lower === 'sallon' || lower === 'sallon bukurie') return 'beauty_salon';
  if (lower === 'general' || lower === 'custom') return 'other';
  if (lower === 'berber') return 'barbershop';
  if (lower === 'restorant') return 'restaurant';
  if (lower === 'klinikë' || lower === 'klinike') return 'clinic';
  if (lower === 'palestër' || lower === 'palester') return 'gym';
  if (lower === 'tjetër' || lower === 'tjeter') return 'other';

  if ((INDUSTRIES as readonly string[]).includes(lower)) return lower as Industry;
  return 'other';
}
