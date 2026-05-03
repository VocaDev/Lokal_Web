'use client';

// Sticky top navbar for AI-generated public sites. Auto-generates links from
// the section list (skips hero — it's the landing area; renders footer as a
// "Kontakti" link). The "Rezervo" CTA only appears when booking is actually
// available — anything else would render as a button that does nothing.
//
// Lives inside BookingDrawerProvider in DynamicSiteRenderer so the Rezervo
// click can call useBookingDrawer().open() directly.

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import type { AiSitePayload, AiSection } from '@/lib/types/customization';
import type { Business } from '@/lib/types';
import { useBookingDrawer } from './BookingDrawerContext';
import { headingFontFamily } from './sections/_shared';

interface NavbarProps {
  business: Business;
  payload: AiSitePayload;
  sections: AiSection[];
  // Owner-level opt-in. Treat `undefined` as enabled to match the
  // BookingDrawerProvider's permissive convention used elsewhere in the
  // renderer — see DynamicSiteRenderer.tsx.
  bookingEnabled?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  services: 'Shërbimet',
  story: 'Historia',
  gallery: 'Galeria',
  footer: 'Kontakti',
};

// Anchor IDs must match the wrapper IDs assigned in DynamicSiteRenderer's
// SECTION_ID map. Kept here too so the navbar's hrefs stay self-contained.
const SECTION_IDS: Record<string, string> = {
  services: 'sherbimet',
  story: 'historia',
  gallery: 'galeria',
  footer: 'kontakti',
};

export function SiteNavbar({ business, payload, sections, bookingEnabled }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { open: openBooking } = useBookingDrawer();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Build nav links from the sections that actually exist on the page.
  // Hero is the landing target; users get there via the business-name link.
  const navLinks = sections
    .filter(s => s.kind !== 'hero' && SECTION_LABELS[s.kind])
    .map(s => ({ label: SECTION_LABELS[s.kind], href: `#${SECTION_IDS[s.kind]}` }));

  // Rezervo CTA gate: owner opted in (treat undefined as opted-in to match
  // [subdomain]/page.tsx where bookingEnabled isn't populated for AI sites)
  // AND the bookingMethod actually wires up the drawer. 'walkin' and 'none'
  // would have the drawer no-op, so the button would be a broken promise.
  const ownerOptedIn = bookingEnabled !== false;
  const methodAllows = payload.bookingMethod === 'appointments' || payload.bookingMethod === 'both';
  const showBookingCta = ownerOptedIn && methodAllows;

  const baseStyle: React.CSSProperties = {
    background: scrolled ? `${payload.bgColor}f2` : payload.bgColor,
    borderBottom: scrolled ? `1px solid ${payload.borderColor}` : '1px solid transparent',
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
  };

  const handleMobileLinkClick = () => setMobileOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-200" style={baseStyle}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Business name → scrolls back to hero */}
            <a
              href="#hero"
              className="text-sm font-semibold tracking-wide truncate max-w-[180px] sm:max-w-[260px]"
              style={{
                color: payload.textColor,
                fontFamily: headingFontFamily(payload.headingFont),
              }}
            >
              {business.name}
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
                  style={{ color: payload.mutedTextColor }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {showBookingCta && (
                <button
                  type="button"
                  onClick={openBooking}
                  className="hidden md:block text-xs font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
                  style={{ background: payload.primaryColor, color: payload.bgColor }}
                >
                  Rezervo
                </button>
              )}

              <button
                type="button"
                className="md:hidden p-1.5"
                style={{ color: payload.textColor }}
                onClick={() => setMobileOpen(v => !v)}
                aria-label={mobileOpen ? 'Mbyll menunë' : 'Hap menunë'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden px-4 pb-4 pt-2 space-y-1"
            style={{
              background: payload.bgColor,
              borderTop: `1px solid ${payload.borderColor}`,
            }}
          >
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm font-medium py-2 tracking-wide"
                style={{ color: payload.mutedTextColor }}
                onClick={handleMobileLinkClick}
              >
                {link.label}
              </a>
            ))}
            {showBookingCta && (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); openBooking(); }}
                className="w-full text-sm font-semibold py-2.5 rounded-full mt-3 transition-opacity hover:opacity-80"
                style={{ background: payload.primaryColor, color: payload.bgColor }}
              >
                Rezervo takim
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Spacer so the hero doesn't render under the fixed navbar. */}
      <div className="h-14" aria-hidden="true" />
    </>
  );
}
