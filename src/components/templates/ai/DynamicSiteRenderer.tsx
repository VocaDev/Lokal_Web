'use client';

import type { Business, Service, BusinessHours } from '@/lib/types';
import type { AiSitePayload, AiSection } from '@/lib/types/customization';
import { HeroSection } from './sections/HeroSection';
import { ServicesSection } from './sections/ServicesSection';
import { StorySection } from './sections/StorySection';
import { GallerySection } from './sections/GallerySection';
import { FooterSection } from './sections/FooterSection';
import { BookingDrawerProvider } from './BookingDrawerContext';
import { SiteNavbar } from './SiteNavbar';

interface Props {
  business: Business;
  services: Service[];
  hours: BusinessHours[];
  payload: AiSitePayload;
  previewMode?: boolean;
}

// Stable anchor IDs per section kind. SiteNavbar's nav links target these.
// Albanian-flavored slugs match the navbar's user-facing labels.
const SECTION_ID: Record<string, string> = {
  hero: 'hero',
  services: 'sherbimet',
  story: 'historia',
  gallery: 'galeria',
  footer: 'kontakti',
};

export function DynamicSiteRenderer({ business, services, hours, payload, previewMode }: Props) {
  const themeStyle: React.CSSProperties = {
    ['--ai-primary' as any]: payload.primaryColor,
    ['--ai-accent' as any]: payload.accentColor,
    ['--ai-bg' as any]: payload.bgColor,
    ['--ai-surface' as any]: payload.surfaceColor,
    ['--ai-text' as any]: payload.textColor,
    ['--ai-muted' as any]: payload.mutedTextColor,
    ['--ai-border' as any]: payload.borderColor,
    backgroundColor: payload.bgColor,
    color: payload.textColor,
    fontFamily: bodyFontFamily(payload.bodyFont),
  };

  return (
    <div style={themeStyle} className={previewMode ? "min-h-0" : "min-h-screen"}>
      <BookingDrawerProvider
        business={business}
        services={services}
        hours={hours}
        bookingMethod={payload.bookingMethod}
        bookingEnabled={business.bookingEnabled !== false}
      >
        {/* Navbar lives inside the BookingDrawerProvider so the "Rezervo"
            button can call useBookingDrawer().open() directly. Skipped in
            previewMode (the wizard preview frame already has its own chrome). */}
        {!previewMode && (
          <SiteNavbar
            business={business}
            payload={payload}
            sections={payload.sections}
            bookingEnabled={business.bookingEnabled}
          />
        )}
        {payload.sections.map((section, i) => (
          <div key={i} id={SECTION_ID[section.kind] || section.kind} style={{ scrollMarginTop: '3.5rem' }}>
            <SectionRouter
              section={section}
              business={business}
              services={services}
              hours={hours}
              payload={payload}
              previewMode={previewMode}
            />
          </div>
        ))}
      </BookingDrawerProvider>
    </div>
  );
}

function SectionRouter({
  section, business, services, hours, payload, previewMode,
}: {
  section: AiSection;
  business: Business;
  services: Service[];
  hours: BusinessHours[];
  payload: AiSitePayload;
  previewMode?: boolean;
}) {
  switch (section.kind) {
    case 'hero':
      return <HeroSection section={section} business={business} payload={payload} bookingMethod={payload.bookingMethod} previewMode={previewMode} />;
    case 'services':
      return <ServicesSection section={section} business={business} services={services} payload={payload} />;
    case 'story':
      return <StorySection section={section} payload={payload} business={business} />;
    case 'gallery':
      return <GallerySection section={section} business={business} payload={payload} />;
    case 'footer':
      return <FooterSection section={section} business={business} hours={hours} payload={payload} />;
    default:
      return null;
  }
}

function bodyFontFamily(font: string): string {
  switch (font) {
    case 'dm-sans': return '"DM Sans", sans-serif';
    case 'inter': return 'Inter, sans-serif';
    case 'poppins': return 'Poppins, sans-serif';
    default: return 'Inter, sans-serif';
  }
}

export default DynamicSiteRenderer;
