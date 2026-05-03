// Design archetypes — pre-validated visual systems. Each bundles a 7-token
// palette (WCAG AA contrast verified for textColor/bgColor and
// mutedTextColor/bgColor), a heading+body font pair, preferred hero/story
// layouts, and a copy voice hint that the AI prompt anchors to.
//
// The wizard's Step 4 surfaces these as cards. The server resolves palette
// and fonts from the chosen key — Sonnet never invents hex values, which
// eliminates the contrast-failure mode the wizard previously suffered from.
//
// Adding a new archetype: pre-validate the palette using the helpers in
// src/lib/utils.ts (contrastRatio textColor/bgColor must be ≥4.5,
// mutedTextColor/bgColor ≥3) before merging.

export const ARCHETYPES = {
  'i-ngrohte': {
    nameAlb: 'I Ngrohtë',
    descriptor: 'Personal, i bërë me dorë, me shpirt',
    fits: ['barbershop', 'beauty_salon', 'retail', 'freelance'],
    palette: {
      bgColor: '#faf7f2',
      surfaceColor: '#f2ede4',
      textColor: '#1c1410',
      mutedTextColor: '#6b5c4e',
      primaryColor: '#8b6914',
      accentColor: '#c4956a',
      borderColor: 'rgba(139,105,20,0.15)',
    },
    headingFont: 'playfair',
    bodyFont: 'dm-sans',
    preferredHeroLayout: 'editorial',
    preferredStoryLayout: 'centered-quote',
    copyVoiceHint: 'personal, specific, handmade-feel, speaks like a craftsperson',
  },
  'erresi-karakter': {
    nameAlb: 'Errësirë & Karakter',
    descriptor: 'I fortë, i drejtpërdrejtë, pa kompromis',
    fits: ['gym', 'events', 'barbershop'],
    palette: {
      bgColor: '#0a0a0a',
      surfaceColor: '#141414',
      textColor: '#f0ece4',
      mutedTextColor: '#888878',
      primaryColor: '#d4a843',
      accentColor: '#8b7230',
      borderColor: 'rgba(212,168,67,0.15)',
    },
    headingFont: 'space-grotesk',
    bodyFont: 'inter',
    preferredHeroLayout: 'fullbleed',
    preferredStoryLayout: 'pull-quote',
    copyVoiceHint: 'terse, declarative, no-bullshit, sentence fragments are fine',
  },
  'besim-qartesi': {
    nameAlb: 'Besim & Qartësi',
    descriptor: 'I qartë, i besueshëm, profesional',
    fits: ['clinic', 'education', 'other'],
    palette: {
      bgColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      mutedTextColor: '#64748b',
      primaryColor: '#1e4d8c',
      accentColor: '#2d6fc4',
      borderColor: 'rgba(30,77,140,0.12)',
    },
    headingFont: 'dm-sans',
    bodyFont: 'inter',
    preferredHeroLayout: 'split',
    preferredStoryLayout: 'two-column',
    copyVoiceHint: 'precise, warm, authoritative, trust through specificity not superlatives',
  },
  'gjalleri-moderne': {
    nameAlb: 'Gjallëri Moderne',
    descriptor: 'Energjik, i freskët, bashkëkohor',
    fits: ['other', 'education', 'retail', 'restaurant'],
    palette: {
      bgColor: '#ffffff',
      surfaceColor: '#f8f8f8',
      textColor: '#111111',
      mutedTextColor: '#666666',
      primaryColor: '#e84855',
      accentColor: '#f4a261',
      borderColor: 'rgba(232,72,85,0.12)',
    },
    headingFont: 'space-grotesk',
    bodyFont: 'dm-sans',
    preferredHeroLayout: 'asymmetric',
    preferredStoryLayout: 'long-form',
    copyVoiceHint: 'energetic, direct, optimistic, speaks to young audience',
  },
  'leter-stil': {
    nameAlb: 'Letër & Stil',
    descriptor: 'Klasik, me karakter, editorial',
    fits: ['restaurant', 'freelance', 'education'],
    palette: {
      bgColor: '#f5f0e8',
      surfaceColor: '#ede8df',
      textColor: '#1a1208',
      mutedTextColor: '#5c4f3a',
      primaryColor: '#2c1810',
      accentColor: '#8b4513',
      borderColor: 'rgba(44,24,16,0.12)',
    },
    headingFont: 'playfair',
    bodyFont: 'inter',
    preferredHeroLayout: 'editorial',
    preferredStoryLayout: 'long-form',
    copyVoiceHint: 'refined, literary, uses specifics, avoids marketing language',
  },
  'studioja': {
    nameAlb: 'Studioja',
    descriptor: 'I guximshëm, i madh, i papërmbajtur',
    fits: ['gym', 'other', 'events'],
    palette: {
      bgColor: '#0d0d0d',
      surfaceColor: '#1a1a1a',
      textColor: '#ffffff',
      mutedTextColor: '#999999',
      primaryColor: '#ff3d00',
      accentColor: '#ff6b35',
      borderColor: 'rgba(255,61,0,0.15)',
    },
    headingFont: 'space-grotesk',
    bodyFont: 'dm-sans',
    preferredHeroLayout: 'fullbleed',
    preferredStoryLayout: 'pull-quote',
    copyVoiceHint: 'bold, provocative, strong opinions, owns the room',
  },
  'familjar-mirprites': {
    nameAlb: 'Familjar & Mirëpritës',
    descriptor: 'I butë, i ngrohtë, familjar',
    fits: ['restaurant', 'beauty_salon', 'clinic'],
    palette: {
      bgColor: '#fdf6ee',
      surfaceColor: '#faeedd',
      textColor: '#2d1b0e',
      mutedTextColor: '#7a5c3f',
      primaryColor: '#c0633a',
      accentColor: '#e8956d',
      borderColor: 'rgba(192,99,58,0.15)',
    },
    headingFont: 'poppins',
    bodyFont: 'poppins',
    preferredHeroLayout: 'split',
    preferredStoryLayout: 'two-column',
    copyVoiceHint: 'warm, approachable, neighborly, speaks like a friend not a brand',
  },
  'elegant-rafinuar': {
    nameAlb: 'Elegant & i Rafinuar',
    descriptor: 'I sofistikuar, premium, me klasë',
    fits: ['events', 'restaurant', 'beauty_salon'],
    palette: {
      bgColor: '#0c0a08',
      surfaceColor: '#161210',
      textColor: '#f0ead8',
      mutedTextColor: '#a09070',
      primaryColor: '#c9a96e',
      accentColor: '#8b6914',
      borderColor: 'rgba(201,169,110,0.15)',
    },
    headingFont: 'playfair',
    bodyFont: 'inter',
    preferredHeroLayout: 'centered',
    preferredStoryLayout: 'centered-quote',
    copyVoiceHint: 'refined, restrained, premium feel, never oversells',
  },
} as const;

export type ArchetypeKey = keyof typeof ARCHETYPES;

export type Archetype = (typeof ARCHETYPES)[ArchetypeKey];

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as ArchetypeKey[];

export function isArchetypeKey(v: unknown): v is ArchetypeKey {
  return typeof v === 'string' && v in ARCHETYPES;
}
