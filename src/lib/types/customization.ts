export type GallerySectionKey = 'hero' | 'story' | 'services' | 'gallery';

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

  // AI parametric renderer payload (migration 015)
  ai_sections?: AiSection[];
  ai_layout_seed?: string;

  // AI art-direction captions for the hero/story photo slots (migration 018)
  hero_photo_caption?: string;
  story_photo_caption?: string;

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
  // businessName is no longer asked in the wizard — it's set at registration
  // and pre-loaded into the wizard via props. Keep it OUT of WizardInput.
  industry: string;
  industryChip?: string;
  city: string;
  uniqueness?: string;
  // Free-text description of the business — primary scope signal for the AI.
  // Required at the wizard layer (>=30 chars) so the brief and theme prompts
  // always have the user's own framing, not just a list of services.
  businessDescription: string;
  services: Array<{ name: string; price?: string; durationMinutes?: number; description?: string }>;
  bookingMethod: 'appointments' | 'walkin' | 'both' | 'none';
  // Per-section layout pickers. Each can hold a specific layout OR 'ai' to
  // let the model decide. Defaults to 'ai' across the board, so users who
  // skip Step 3 get full AI control. When a specific value is set, the
  // post-processor in /api/generate-variants forces it onto the AI's output.
  heroLayout: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'ai';
  storyLayout: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote' | 'ai';
  servicesLayout: 'list' | 'grid-3' | 'editorial-rows' | 'cards' | 'ai';
  galleryLayout: 'masonry' | 'grid-uniform' | 'showcase' | 'strip' | 'ai';
  // Visual archetype — replaces the previous mood + fontPersonality pickers.
  // 'ai' = let Sonnet pick a key from src/lib/archetypes.ts
  // 'custom' = user provides brandPrimary/brandAccent + customFont; server
  //            generates the remaining 5 palette tokens.
  // Anything else = a key in ARCHETYPES, server expands palette/fonts.
  archetypeKey: import('../archetypes').ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;  // only used when archetypeKey === 'custom'
  brandAccent?: string;   // only used when archetypeKey === 'custom'
  customFont?: 'playfair' | 'space-grotesk' | 'dm-sans' | 'poppins'; // only when custom
  language: 'sq' | 'en' | 'both';
  // 'casual' renders as "Bisedor" in the UI — Gheg-flavored, dropped subject
  // pronouns and apostrophes (n'kafe, t'qojm, vijn') in customer-facing copy.
  tone: 'friendly' | 'professional' | 'bold' | 'casual';
  // Optional social media URLs collected at wizard time. Persisted to
  // businesses.social_links by /api/apply-theme and rendered in the public
  // footer. The /dashboard/profile page is the canonical edit surface; the
  // wizard just lets users set them upfront.
  instagramUrl?: string;
  tiktokUrl?: string;
}

// ----------------------------------------------------------------
// AI parametric renderer (migration 015)
// ----------------------------------------------------------------

export type AiSectionKind = 'hero' | 'services' | 'story' | 'gallery' | 'footer';

export interface AiHeroSection {
  kind: 'hero';
  layout: 'centered' | 'split' | 'fullbleed' | 'editorial' | 'asymmetric';
  imageStyle: 'photo' | 'gradient' | 'pattern' | 'none';
  metadataBar: boolean;
  headlinePosition: 'top' | 'center' | 'bottom-left' | 'bottom-right' | 'left' | 'right';
  ctaCount: 0 | 1 | 2;
  headline: string;
  subheadline?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  metadataLeft?: string;   // only when metadataBar=true
  metadataRight?: string;
  decorativeElement?: 'none' | 'rule' | 'number' | 'glyph';
}

export interface AiServicesSection {
  kind: 'services';
  layout: 'list' | 'grid-2' | 'grid-3' | 'editorial-rows' | 'cards';
  showPrices: boolean;
  showDuration: boolean;
  divider: 'none' | 'line' | 'number';
  intro?: string;
  items: Array<{ name: string; description?: string; price?: number; durationMinutes?: number; durationLabel?: string }>;
}

export interface AiStorySection {
  kind: 'story';
  layout: 'centered-quote' | 'two-column' | 'long-form' | 'pull-quote';
  body: string;
  attribution?: string;
}

export interface AiGallerySection {
  kind: 'gallery';
  layout: 'masonry' | 'grid-uniform' | 'showcase' | 'strip';
  caption?: string;
}

export interface AiFooterSection {
  kind: 'footer';
  layout: 'centered' | 'three-column' | 'editorial' | 'minimal';
  tagline?: string;
}

export type AiSection =
  | AiHeroSection
  | AiServicesSection
  | AiStorySection
  | AiGallerySection
  | AiFooterSection;

export interface AiSitePayload {
  sections: AiSection[];
  // Drives hero CTA behavior — appointments/both → open booking drawer,
  // walkin/none → open contact (WhatsApp / tel link). Sourced from
  // website_customization.booking_method (migration 014).
  bookingMethod?: 'appointments' | 'walkin' | 'both' | 'none';
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  headingFont: 'dm-sans' | 'playfair' | 'inter' | 'poppins' | 'space-grotesk';
  bodyFont: 'dm-sans' | 'inter' | 'poppins';
  metaDescription: string;
}
