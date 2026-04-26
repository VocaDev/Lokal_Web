export type GallerySectionKey = 'hero' | 'about' | 'services' | 'team' | 'contact';

export interface GalleryItem {
  id: string;
  business_id: string;
  section_key: GallerySectionKey;
  image_url: string | null;
  alt_text: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface WebsiteCustomization {
  id: string;
  business_id: string;

  // Colors
  primary_color: string;
  accent_color: string;
  text_color: string;
  muted_text_color: string;
  bg_color: string;
  surface_color: string;
  border_color: string;

  // Typography
  heading_font: 'dm-sans' | 'inter' | 'poppins' | 'playfair';
  body_font: 'dm-sans' | 'inter' | 'poppins' | 'playfair';

  // Layout
  hero_height: 'small' | 'medium' | 'large';
  card_style: 'minimal' | 'rounded' | 'bordered';
  show_testimonials: boolean;
  show_team: boolean;
  show_contact: boolean;

  // Wizard v2 inputs (migration 014)
  site_language?: 'sq' | 'en' | 'both';
  site_tone?: 'friendly' | 'professional' | 'bold';
  hero_style?: 'cinematic' | 'split' | 'centered' | 'editorial';
  section_priority?: 'services' | 'story' | 'gallery';
  density?: 'sparse' | 'dense';
  uniqueness_statement?: string;
  booking_method?: 'appointments' | 'walkin' | 'both' | 'none';

  created_at: string;
  updated_at: string;
}

/*
 * Runtime CSS variables written by ThemeProvider.applyThemeToDocument() and
 * the SSR themeStyles builder in app/[subdomain]/page.tsx. Names follow shadcn
 * convention; values are HSL components (e.g. "220 91% 58%") wrapped at the
 * Tailwind layer with hsl(var(--name)). Hex storage in DB is converted at
 * runtime via hexToHsl() in src/lib/utils.ts.
 *
 * This is informational; the actual writes use root.style.setProperty so they
 * are not type-checked against this shape, but keep this in sync as the
 * canonical contract.
 */
export interface ThemeVariables {
  '--primary': string;
  '--accent': string;
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--secondary-foreground': string;
  '--border': string;
  '--input': string;
  '--ring': string;
  '--font-heading': string;
  '--font-sans': string;
  '--hero-height': string;
  '--card-style': string;
}

export interface WizardInput {
  businessName: string;
  industry: string;
  industryChip?: string;
  city: string;
  uniqueness?: string;
  services: Array<{ name: string; price?: string; durationMinutes?: number }>;
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  hero: 'cinematic' | 'split' | 'centered' | 'editorial';
  sectionPriority: 'services' | 'story' | 'gallery';
  density: 'sparse' | 'dense';
  mood: 'warm' | 'cool' | 'bold' | 'elegant' | 'custom';
  brandPrimary?: string;
  brandAccent?: string;
  fontPersonality: 'editorial' | 'modern' | 'friendly' | 'bold' | 'elegant';
  language: 'sq' | 'en' | 'both';
  tone: 'friendly' | 'professional' | 'bold';
}
