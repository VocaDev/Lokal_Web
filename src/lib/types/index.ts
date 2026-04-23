import type { Industry } from '../industries';

export type IndustryType = Industry;
export type { Industry } from '../industries';
export { INDUSTRIES, INDUSTRY_LABELS, normalizeIndustry } from '../industries';

export interface SocialLinks {
  instagram: string;
  facebook: string;
  whatsapp: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}

export interface BusinessHours {
  id: string;
  businessId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...6=Saturday
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Booking {
  id: string;
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  appointmentAt: string; // ISO datetime
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  subdomain: string;
  industry: IndustryType;
  template: string;
  templateId?: string;
  phone: string;
  address: string;
  description: string;
  logoUrl: string;
  accentColor: string;
  socialLinks: SocialLinks;
  galleryImages: string[];
  gallerySections?: Record<string, string[]>;
  ownerId?: string;
  createdAt: string;
  // Customization Flags
  showTestimonials?: boolean;
  showTeam?: boolean;
  showContact?: boolean;
  heroHeight?: 'small' | 'medium' | 'large';
  cardStyle?: 'minimal' | 'rounded' | 'bordered';
  // AI-generated copy (from website_customization)
  heroHeadline?: string;
  heroSubheadline?: string;
  aboutCopy?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  // Website Builder
  websiteCreationMethod?: string;
  customWebsiteHtml?: string;
  aiSetupData?: Record<string, unknown>;
  websiteBuilderCompleted?: boolean;
}

export * from './customization';
