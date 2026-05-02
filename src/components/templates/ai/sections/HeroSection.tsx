'use client';

import type { Business } from '@/lib/types';
import type { AiHeroSection, AiSitePayload } from '@/lib/types/customization';
import { ctaButtonStyle, headingFontFamily, SECTION_PADDING_X } from './_shared';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { useBookingDrawer } from '../BookingDrawerContext';

interface Props {
  section: AiHeroSection;
  business: Business;
  payload: AiSitePayload;
  bookingMethod?: string;
}

interface LayoutProps extends Props {
  heroImageUrl?: string;
  onPrimaryCta: () => void;
  onSecondaryCta: () => void;
}

// Build the click handlers for primary + secondary CTAs based on
// bookingMethod. Primary opens the booking drawer for 'appointments'/'both',
// or the contact path for 'walkin'/'none'. Secondary always opens contact —
// it's a "Call us / WhatsApp" companion to the primary regardless of method.
function buildContactHandler(business: Business): () => void {
  return () => {
    const phoneDigits = (business.phone ?? '').replace(/\D/g, '');
    const wa = business.socialLinks?.whatsapp || phoneDigits;
    const waDigits = (wa ?? '').replace(/\D/g, '');
    if (waDigits) {
      const msg = encodeURIComponent(`Hi! I'd like more info about ${business.name}.`);
      window.open(`https://wa.me/${waDigits}?text=${msg}`, '_blank');
    } else if (business.phone) {
      window.location.href = `tel:${business.phone}`;
    }
  };
}

export function HeroSection({ section, business, payload, bookingMethod }: Props) {
  // gallery_items.section_key='hero' → first uploaded photo, if any.
  const heroImageUrl = business.gallerySections?.hero?.[0];
  const { open: openBooking } = useBookingDrawer();

  const contactClick = buildContactHandler(business);
  const method = bookingMethod ?? 'appointments';
  // Owner-level opt-in (migration 019). When false, even an
  // 'appointments'/'both' bookingMethod must fall through to the contact
  // handler — the BookingDrawer isn't in the DOM and openBooking() is a no-op.
  const ownerOptedIn = business.bookingEnabled !== false;
  const methodAllows = method === 'appointments' || method === 'both';
  const onPrimaryCta = ownerOptedIn && methodAllows ? openBooking : contactClick;
  const onSecondaryCta = contactClick;

  const layoutProps: LayoutProps = {
    section, business, payload, heroImageUrl, bookingMethod,
    onPrimaryCta, onSecondaryCta,
  };

  switch (section.layout) {
    case 'split':       return <SplitHero {...layoutProps} />;
    case 'fullbleed':   return <FullbleedHero {...layoutProps} />;
    case 'editorial':   return <EditorialHero {...layoutProps} />;
    case 'asymmetric':  return <AsymmetricHero {...layoutProps} />;
    case 'centered':
    default:            return <CenteredHero {...layoutProps} />;
  }
}

// ----------------------------------------------------------------
// Background style — chosen by section.imageStyle
// ----------------------------------------------------------------

function backgroundStyle(
  payload: AiSitePayload,
  imageStyle: AiHeroSection['imageStyle'],
  heroImageUrl?: string,
): React.CSSProperties {
  switch (imageStyle) {
    case 'photo':
      // Real upload from gallery_items.section_key='hero' if present.
      // Otherwise return a neutral surface — the layout overlays a dashed
      // PhotoPlaceholder so the user sees exactly where the photo will go.
      if (heroImageUrl) {
        return {
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      }
      return { background: payload.surfaceColor };
    case 'gradient':
      return {
        background: `linear-gradient(135deg, ${payload.primaryColor}, ${payload.accentColor})`,
      };
    case 'pattern':
      return {
        backgroundColor: payload.surfaceColor,
        backgroundImage: `radial-gradient(${payload.borderColor} 1px, transparent 1px)`,
        backgroundSize: '18px 18px',
      };
    case 'none':
    default:
      return { background: payload.bgColor };
  }
}

// ----------------------------------------------------------------
// Decorative element overlay
// ----------------------------------------------------------------

function Decoration({ kind, payload }: { kind: AiHeroSection['decorativeElement']; payload: AiSitePayload }) {
  if (!kind || kind === 'none') return null;
  if (kind === 'rule') {
    return (
      <div
        className="h-px w-16 mb-6"
        style={{ background: payload.primaryColor }}
      />
    );
  }
  if (kind === 'number') {
    return (
      <div
        className="absolute right-6 md:right-12 top-6 md:top-12 text-[120px] md:text-[200px] font-bold leading-none pointer-events-none select-none"
        style={{ color: payload.primaryColor, opacity: 0.06, fontFamily: headingFontFamily(payload.headingFont) }}
      >
        01
      </div>
    );
  }
  if (kind === 'glyph') {
    return (
      <div
        className="absolute left-6 md:left-12 bottom-6 md:bottom-12 text-[80px] md:text-[120px] leading-none pointer-events-none select-none"
        style={{ color: payload.primaryColor, opacity: 0.18, fontFamily: headingFontFamily(payload.headingFont) }}
      >
        §
      </div>
    );
  }
  return null;
}

// ----------------------------------------------------------------
// CTA buttons
// ----------------------------------------------------------------

function HeroCtas({
  section, payload, align, onPrimary, onSecondary,
}: {
  section: AiHeroSection;
  payload: AiSitePayload;
  align?: 'left' | 'center' | 'right';
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  if (!section.ctaCount) return null;
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <div className={`flex flex-wrap gap-3 mt-6 ${justify}`}>
      {section.ctaPrimary && (
        <button
          type="button"
          onClick={onPrimary}
          className="px-6 py-3 rounded-md text-sm font-semibold tracking-wide transition-opacity hover:opacity-90"
          style={ctaButtonStyle(payload, 'primary')}
        >
          {section.ctaPrimary}
        </button>
      )}
      {section.ctaCount === 2 && section.ctaSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          className="px-6 py-3 rounded-md text-sm font-semibold tracking-wide transition-opacity hover:opacity-90"
          style={ctaButtonStyle(payload, 'secondary')}
        >
          {section.ctaSecondary}
        </button>
      )}
    </div>
  );
}

function shouldShowHeroPlaceholder(section: AiHeroSection, heroImageUrl?: string): boolean {
  return section.imageStyle === 'photo' && !heroImageUrl;
}

// ----------------------------------------------------------------
// Centered hero — minimal, all-text. No image area, lots of whitespace.
// ----------------------------------------------------------------

function CenteredHero({ section, business, payload, heroImageUrl, onPrimaryCta, onSecondaryCta }: LayoutProps) {
  const singleCtaSection: AiHeroSection = section.ctaCount
    ? { ...section, ctaCount: 1 }
    : section;
  const hasHeroPhoto = !!heroImageUrl;
  const textColor = hasHeroPhoto ? '#ffffff' : payload.textColor;
  const mutedColor = hasHeroPhoto ? '#ffffff' : payload.mutedTextColor;
  return (
    <section
      className={`${SECTION_PADDING_X} relative flex items-center justify-center text-center min-h-[600px] py-28 md:py-44`}
      style={hasHeroPhoto ? backgroundStyle(payload, 'photo', heroImageUrl) : { background: payload.bgColor }}
    >
      {hasHeroPhoto && (
        <div className="absolute inset-0 pointer-events-none bg-black/55" />
      )}
      <div className="max-w-2xl mx-auto relative z-10">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.3em] mb-10 border"
          style={{
            color: hasHeroPhoto ? '#ffffff' : payload.mutedTextColor,
            borderColor: hasHeroPhoto ? 'rgba(255,255,255,0.35)' : payload.borderColor,
            background: hasHeroPhoto ? 'rgba(0,0,0,0.25)' : payload.surfaceColor,
          }}
        >
          {business.name}
        </span>
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: mutedColor, opacity: hasHeroPhoto ? 0.9 : 1 }}
          >
            {section.subheadline}
          </p>
        )}
        <HeroCtas section={singleCtaSection} payload={payload} align="center" onPrimary={onPrimaryCta} onSecondary={onSecondaryCta} />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Split hero
// ----------------------------------------------------------------

function SplitHero({ section, business, payload, heroImageUrl, onPrimaryCta, onSecondaryCta }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  const imageStyle = heroImageUrl ? 'photo' : section.imageStyle === 'none' ? 'gradient' : section.imageStyle;
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[520px] md:min-h-[640px] relative overflow-hidden">
      <div
        className="relative min-h-[260px] md:min-h-full"
        style={backgroundStyle(payload, imageStyle, heroImageUrl)}
      >
        {showPlaceholder && (
          <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
        )}
      </div>
      <div
        className="flex flex-col justify-center px-8 md:px-14 py-16 md:py-20"
        style={{ background: payload.surfaceColor }}
      >
        <div className="max-w-lg">
          <div
            className="text-[10px] uppercase tracking-[0.4em] mb-6"
            style={{ color: payload.primaryColor }}
          >
            {business.name}
          </div>
          <h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] mb-5"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            {section.headline}
          </h1>
          {section.subheadline && (
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: payload.mutedTextColor }}
            >
              {section.subheadline}
            </p>
          )}
          <HeroCtas section={section} payload={payload} align="left" onPrimary={onPrimaryCta} onSecondary={onSecondaryCta} />
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Fullbleed hero (text overlaid on background, position-aware)
// ----------------------------------------------------------------

function FullbleedHero({ section, business, payload, heroImageUrl, onPrimaryCta, onSecondaryCta }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  const imageStyle = heroImageUrl ? 'photo' : section.imageStyle === 'none' ? 'gradient' : section.imageStyle;
  const position = section.headlinePosition ?? 'bottom-left';
  // When there's no real photo + the section is filled by a light-colored
  // placeholder, hardcoded white text is invisible. Use payload.textColor
  // (which the post-processor has already corrected for contrast). When a
  // real photo IS uploaded, keep white because the photo gives the dark
  // backdrop that the layout was designed around.
  const hasRealPhoto = imageStyle === 'photo' && !!heroImageUrl;
  const hasDarkBg = imageStyle === 'gradient' || imageStyle === 'pattern';
  const useWhiteText = hasRealPhoto || hasDarkBg;
  const textColor = useWhiteText ? '#ffffff' : payload.textColor;
  const mutedColor = useWhiteText ? '#ffffff' : payload.mutedTextColor;
  const positionClasses = (() => {
    switch (position) {
      case 'top':           return 'items-start justify-center text-center pt-20';
      case 'bottom-right':  return 'items-end justify-end text-right pb-20';
      case 'left':          return 'items-center justify-start text-left';
      case 'right':         return 'items-center justify-end text-right';
      case 'center':        return 'items-center justify-center text-center';
      case 'bottom-left':
      default:              return 'items-end justify-start text-left pb-20';
    }
  })();
  const scrim = (() => {
    // No scrim when the bg is the light placeholder — the dark gradient
    // would just make the placeholder dirty without a real photo to overlay.
    if (!useWhiteText) return 'transparent';
    if (position === 'top') {
      return 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)';
    }
    if (position === 'center') {
      return 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.25) 100%)';
    }
    return 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 45%, transparent 100%)';
  })();
  const ctaSection: AiHeroSection = section.ctaCount && section.ctaCount > 1
    ? { ...section, ctaCount: 1 }
    : section;

  return (
    <section
      className={`${SECTION_PADDING_X} min-h-[700px] relative overflow-hidden flex ${positionClasses}`}
      style={backgroundStyle(payload, imageStyle, heroImageUrl)}
    >
      {showPlaceholder && (
        <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
      )}
      <div className="absolute inset-0 pointer-events-none" style={{ background: scrim }} />
      <div className="relative max-w-3xl z-10">
        <div className="text-[10px] uppercase tracking-[0.4em] mb-6" style={{ color: textColor, opacity: 0.85 }}>
          {business.name}
        </div>
        <h1
          className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.0] mb-5"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-lg md:text-xl max-w-xl"
            style={{ color: mutedColor, opacity: 0.92 }}
          >
            {section.subheadline}
          </p>
        )}
        <HeroCtas
          section={ctaSection}
          payload={payload}
          align={position === 'bottom-right' || position === 'right' ? 'right' : position === 'top' || position === 'center' ? 'center' : 'left'}
          onPrimary={onPrimaryCta}
          onSecondary={onSecondaryCta}
        />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Editorial hero (magazine-style)
// ----------------------------------------------------------------

function EditorialHero({ section, business, payload, heroImageUrl, onPrimaryCta, onSecondaryCta }: LayoutProps) {
  const hasHeroPhoto = !!heroImageUrl;
  const textColor = hasHeroPhoto ? '#ffffff' : payload.textColor;
  const mutedColor = hasHeroPhoto ? '#ffffff' : payload.mutedTextColor;
  const borderColor = hasHeroPhoto ? 'rgba(255,255,255,0.28)' : payload.borderColor;
  return (
    <section
      className={`${SECTION_PADDING_X} relative flex flex-col min-h-[600px] py-10 md:py-16`}
      style={hasHeroPhoto ? backgroundStyle(payload, 'photo', heroImageUrl) : { background: payload.surfaceColor }}
    >
      {hasHeroPhoto && (
        <div className="absolute inset-0 pointer-events-none bg-black/60" />
      )}
      <div
        className="relative z-10 flex items-center justify-between text-[10px] uppercase tracking-[0.4em] pb-5 border-b"
        style={{ color: mutedColor, opacity: hasHeroPhoto ? 0.85 : 1, borderColor }}
      >
        <span>{section.metadataLeft || `Nº 01 — ${new Date().getFullYear()}`}</span>
        <span>{section.metadataRight || business.address || business.name}</span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center py-12 md:py-16">
        <div className="max-w-5xl">
          <h1
            className="text-5xl md:text-7xl lg:text-[7.5rem] font-bold leading-[0.98] mb-10"
            style={{
              fontFamily: headingFontFamily(payload.headingFont),
              color: textColor,
              maxWidth: '14ch',
            }}
          >
            {section.headline}
          </h1>
          {section.subheadline && (
            <p
              className="text-xl md:text-2xl leading-relaxed max-w-2xl italic"
              style={{
                fontFamily: headingFontFamily(payload.headingFont),
                color: mutedColor,
                opacity: hasHeroPhoto ? 0.88 : 1,
              }}
            >
              {section.subheadline}
            </p>
          )}
          <HeroCtas section={section} payload={payload} align="left" onPrimary={onPrimaryCta} onSecondary={onSecondaryCta} />
        </div>
      </div>

      <div
        className="relative z-10 h-px w-full mt-auto"
        style={{ background: borderColor }}
      />
    </section>
  );
}

// ----------------------------------------------------------------
// Asymmetric hero — deliberately off-grid
// ----------------------------------------------------------------

function AsymmetricHero({ section, business, payload, heroImageUrl, onPrimaryCta, onSecondaryCta }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  const imageStyle = heroImageUrl ? 'photo' : section.imageStyle === 'none' ? 'gradient' : section.imageStyle;
  return (
    <section
      className="relative overflow-hidden min-h-[600px] md:min-h-[640px]"
      style={{ background: payload.bgColor }}
    >
      <div
        className="absolute right-[-2%] top-[8%] w-[58%] h-[65%] hidden md:block rounded-bl-[40px] overflow-hidden"
        style={backgroundStyle(payload, imageStyle, heroImageUrl)}
      >
        {showPlaceholder && (
          <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
        )}
      </div>

      <div
        className="absolute right-6 md:right-12 top-4 md:top-8 leading-none pointer-events-none select-none font-bold"
        style={{
          color: payload.primaryColor,
          opacity: 0.08,
          fontFamily: headingFontFamily(payload.headingFont),
          fontSize: 'clamp(140px, 22vw, 320px)',
        }}
      >
        01
      </div>

      <div
        className="absolute left-[-80px] bottom-[-80px] w-72 h-72 rounded-full blur-3xl opacity-35 pointer-events-none"
        style={{ background: payload.accentColor }}
      />

      <div className={`relative ${SECTION_PADDING_X} flex flex-col h-full min-h-[600px] justify-end pb-16 md:pb-24 pt-28 md:pt-40 max-w-6xl`}>
        <div
          className="text-[10px] uppercase tracking-[0.4em] mb-6"
          style={{ color: payload.mutedTextColor }}
        >
          {business.name}
        </div>
        <h1
          className="text-5xl md:text-7xl lg:text-[6.5rem] font-bold leading-[0.95] mb-6 max-w-3xl"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-base md:text-lg max-w-md ml-0 md:ml-32 mt-6"
            style={{ color: payload.mutedTextColor }}
          >
            {section.subheadline}
          </p>
        )}
        <div className="ml-0 md:ml-32 mt-2">
          <HeroCtas section={section} payload={payload} align="left" onPrimary={onPrimaryCta} onSecondary={onSecondaryCta} />
        </div>
      </div>
    </section>
  );
}
