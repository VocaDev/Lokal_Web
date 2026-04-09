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

  created_at: string;
  updated_at: string;
}

export interface ThemeVariables {
  '--primary-color': string;
  '--accent-color': string;
  '--text-color': string;
  '--muted-text-color': string;
  '--bg-color': string;
  '--surface-color': string;
  '--border-color': string;
  '--heading-font': string;
  '--body-font': string;
  '--hero-height': string;
  '--card-style': string;
}
