import type { Business } from '@/lib/types';
import type { AiHeroSection, AiSitePayload } from '@/lib/types/customization';
import { ctaButtonStyle, headingFontFamily, SECTION_PADDING_X } from './_shared';
import { PhotoPlaceholder } from './PhotoPlaceholder';

interface Props {
  section: AiHeroSection;
  business: Business;
  payload: AiSitePayload;
}

interface LayoutProps extends Props {
  heroImageUrl?: string;
}

export function HeroSection({ section, business, payload }: Props) {
  // gallery_items.section_key='hero' → first uploaded photo, if any.
  const heroImageUrl = business.gallerySections?.hero?.[0];

  const layoutProps: LayoutProps = { section, business, payload, heroImageUrl };

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

function HeroCtas({ section, payload, align }: { section: AiHeroSection; payload: AiSitePayload; align?: 'left' | 'center' | 'right' }) {
  if (!section.ctaCount) return null;
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <div className={`flex flex-wrap gap-3 mt-6 ${justify}`}>
      {section.ctaPrimary && (
        <button
          className="px-6 py-3 rounded-md text-sm font-semibold tracking-wide transition-opacity hover:opacity-90"
          style={ctaButtonStyle(payload, 'primary')}
        >
          {section.ctaPrimary}
        </button>
      )}
      {section.ctaCount === 2 && section.ctaSecondary && (
        <button
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
// Centered hero
// ----------------------------------------------------------------

function CenteredHero({ section, business, payload, heroImageUrl }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  return (
    <section
      className={`${SECTION_PADDING_X} py-24 md:py-36 text-center relative overflow-hidden`}
      style={backgroundStyle(payload, section.imageStyle, heroImageUrl)}
    >
      <Decoration kind={section.decorativeElement} payload={payload} />
      <div className="max-w-3xl mx-auto relative">
        {showPlaceholder && (
          <div className="max-w-md mx-auto mb-8">
            <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" />
          </div>
        )}
        {section.decorativeElement === 'rule' && (
          <div className="flex justify-center"><div className="h-px w-16 mb-6" style={{ background: payload.primaryColor }} /></div>
        )}
        <div className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: payload.mutedTextColor }}>
          {business.name}
        </div>
        <h1
          className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-5"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: payload.mutedTextColor }}>
            {section.subheadline}
          </p>
        )}
        <HeroCtas section={section} payload={payload} align="center" />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Split hero
// ----------------------------------------------------------------

function SplitHero({ section, business, payload, heroImageUrl }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  return (
    <section className="grid md:grid-cols-2 min-h-[420px] md:min-h-[560px] relative overflow-hidden">
      <div
        className="min-h-[220px] md:min-h-[560px] relative"
        style={backgroundStyle(payload, section.imageStyle, heroImageUrl)}
      >
        {showPlaceholder && (
          <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
        )}
        <Decoration kind={section.decorativeElement} payload={payload} />
      </div>
      <div
        className={`${SECTION_PADDING_X} py-16 md:py-24 flex flex-col justify-center`}
        style={{ background: payload.surfaceColor }}
      >
        <div className="max-w-md">
          <div className="text-xs uppercase tracking-[0.25em] mb-5" style={{ color: payload.mutedTextColor }}>
            {business.name}
          </div>
          <h1
            className="text-3xl md:text-5xl font-bold leading-[1.1] mb-4"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            {section.headline}
          </h1>
          {section.subheadline && (
            <p className="text-base md:text-lg" style={{ color: payload.mutedTextColor }}>
              {section.subheadline}
            </p>
          )}
          <HeroCtas section={section} payload={payload} align="left" />
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Fullbleed hero (text overlaid on background, position-aware)
// ----------------------------------------------------------------

function FullbleedHero({ section, business, payload, heroImageUrl }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  const positionClasses = (() => {
    switch (section.headlinePosition) {
      case 'top':           return 'items-start justify-center text-center pt-20';
      case 'bottom-left':   return 'items-end justify-start text-left pb-20';
      case 'bottom-right':  return 'items-end justify-end text-right pb-20';
      case 'left':          return 'items-center justify-start text-left';
      case 'right':         return 'items-center justify-end text-right';
      case 'center':
      default:              return 'items-center justify-center text-center';
    }
  })();

  return (
    <section
      className={`${SECTION_PADDING_X} min-h-[520px] md:min-h-[680px] relative overflow-hidden flex ${positionClasses}`}
      style={backgroundStyle(payload, section.imageStyle, heroImageUrl)}
    >
      {showPlaceholder && (
        <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
      )}
      {/* Subtle overlay for text legibility — only when there's a real photo or gradient */}
      {((section.imageStyle === 'photo' && heroImageUrl) || section.imageStyle === 'gradient') && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(180deg, transparent 0%, ${payload.bgColor}66 100%)` }}
        />
      )}
      <Decoration kind={section.decorativeElement} payload={payload} />
      <div className="relative max-w-2xl">
        <div className="text-xs uppercase tracking-[0.3em] mb-5 opacity-80" style={{ color: payload.textColor }}>
          {business.name}
        </div>
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p className="text-base md:text-xl opacity-90" style={{ color: payload.textColor }}>
            {section.subheadline}
          </p>
        )}
        <HeroCtas
          section={section}
          payload={payload}
          align={section.headlinePosition === 'bottom-right' || section.headlinePosition === 'right' ? 'right' : section.headlinePosition === 'top' || section.headlinePosition === 'center' ? 'center' : 'left'}
        />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Editorial hero (magazine-style)
// ----------------------------------------------------------------

function EditorialHero({ section, business, payload, heroImageUrl }: LayoutProps) {
  return (
    <section
      className={`${SECTION_PADDING_X} py-12 md:py-20 relative`}
      style={{ background: payload.surfaceColor }}
    >
      {section.metadataBar && (
        <div
          className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] pb-4 mb-12 border-b"
          style={{ color: payload.mutedTextColor, borderColor: payload.borderColor }}
        >
          <span>{section.metadataLeft || `№ 01 · ${business.name}`}</span>
          <span>{section.metadataRight || business.address || 'Kosovo'}</span>
        </div>
      )}
      <div className="max-w-5xl">
        {section.decorativeElement === 'rule' && (
          <div className="h-px w-24 mb-8" style={{ background: payload.primaryColor }} />
        )}
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.02] mb-8 max-w-4xl"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl"
            style={{ color: payload.mutedTextColor }}
          >
            {section.subheadline}
          </p>
        )}
        <HeroCtas section={section} payload={payload} align="left" />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Asymmetric hero — deliberately off-grid
// ----------------------------------------------------------------

function AsymmetricHero({ section, business, payload, heroImageUrl }: LayoutProps) {
  const showPlaceholder = shouldShowHeroPlaceholder(section, heroImageUrl);
  return (
    <section
      className="relative min-h-[560px] md:min-h-[720px] overflow-hidden"
      style={{ background: payload.bgColor }}
    >
      {/* Off-grid background block */}
      <div
        className="absolute right-0 top-0 w-[55%] h-[70%] hidden md:block"
        style={backgroundStyle(payload, section.imageStyle === 'none' ? 'gradient' : section.imageStyle, heroImageUrl)}
      >
        {showPlaceholder && (
          <PhotoPlaceholder payload={payload} shape="hero" label="HERO PHOTO" fill />
        )}
      </div>
      {/* Bottom-left decorative blob */}
      <div
        className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: payload.accentColor }}
      />
      <Decoration kind={section.decorativeElement} payload={payload} />

      <div className={`relative ${SECTION_PADDING_X} pt-24 md:pt-40 pb-16 md:pb-24 max-w-6xl`}>
        <div className="text-xs uppercase tracking-[0.3em] mb-8" style={{ color: payload.mutedTextColor }}>
          {business.name}
        </div>
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6 max-w-3xl"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-base md:text-lg max-w-md ml-0 md:ml-24 mt-8"
            style={{ color: payload.mutedTextColor }}
          >
            {section.subheadline}
          </p>
        )}
        <div className="ml-0 md:ml-24">
          <HeroCtas section={section} payload={payload} align="left" />
        </div>
      </div>
    </section>
  );
}
