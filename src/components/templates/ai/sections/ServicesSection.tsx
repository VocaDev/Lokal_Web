import type { Business, Service } from '@/lib/types';
import type { AiServicesSection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';
import { PhotoPlaceholder } from './PhotoPlaceholder';

interface Props {
  section: AiServicesSection;
  business: Business;
  services: Service[];
  payload: AiSitePayload;
}

type Item = {
  name: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
};

function resolveItems(section: AiServicesSection, dbServices: Service[]): Item[] {
  const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
  if (items.length > 0) return items;
  return dbServices.map(s => ({
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.durationMinutes,
  }));
}

export function ServicesSection({ section, business, services, payload }: Props) {
  const items = resolveItems(section, services);
  if (items.length === 0) return null;

  // Service photos are cycled in array order across rendered cards. Layouts
  // that don't take images by design (list, editorial-rows) ignore this.
  const serviceImages = business.gallerySections?.services ?? [];

  switch (section.layout) {
    case 'grid-2':          return <GridLayout items={items} cols={2} section={section} payload={payload} images={serviceImages} />;
    case 'grid-3':          return <GridLayout items={items} cols={3} section={section} payload={payload} images={serviceImages} />;
    case 'editorial-rows':  return <EditorialRowsLayout items={items} section={section} payload={payload} />;
    case 'cards':           return <CardsLayout items={items} section={section} payload={payload} images={serviceImages} />;
    case 'list':
    default:                return <ListLayout items={items} section={section} payload={payload} />;
  }
}

// ----------------------------------------------------------------

function SectionHeader({ section, payload }: { section: AiServicesSection; payload: AiSitePayload }) {
  return (
    <div className="mb-10 md:mb-14">
      <h2
        className="text-3xl md:text-4xl font-bold mb-3"
        style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
      >
        Shërbimet
      </h2>
      {section.intro && (
        <p className="text-base max-w-2xl" style={{ color: payload.mutedTextColor }}>
          {section.intro}
        </p>
      )}
    </div>
  );
}

function PriceTag({ item, section, payload }: { item: Item; section: AiServicesSection; payload: AiSitePayload }) {
  if (!section.showPrices || typeof item.price !== 'number') return null;
  return (
    <span className="font-semibold whitespace-nowrap" style={{ color: payload.primaryColor }}>
      €{item.price}
    </span>
  );
}

function DurationTag({ item, section, payload }: { item: Item; section: AiServicesSection; payload: AiSitePayload }) {
  if (!section.showDuration || typeof item.durationMinutes !== 'number') return null;
  return (
    <span className="text-xs uppercase tracking-wider" style={{ color: payload.mutedTextColor }}>
      {item.durationMinutes} min
    </span>
  );
}

// ----------------------------------------------------------------
// List — single column, names left, price/duration right. NO descriptions.
// ----------------------------------------------------------------

function ListLayout({ items, section, payload }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-3xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-6 py-6"
              style={section.divider === 'line' || section.divider === 'number' ? { borderBottom: `1px solid ${payload.borderColor}` } : undefined}
            >
              <div className="flex items-baseline gap-4 min-w-0">
                {section.divider === 'number' && (
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: payload.mutedTextColor }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <div
                  className="text-lg md:text-2xl font-semibold truncate"
                  style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                >
                  {item.name}
                </div>
              </div>
              <div className="flex items-baseline gap-4 shrink-0">
                <PriceTag item={item} section={section} payload={payload} />
                <DurationTag item={item} section={section} payload={payload} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Grid — grid-2 (photos optional, lighter cards) and grid-3 (photos required, heavier cards)
// ----------------------------------------------------------------

function GridLayout({ items, cols, section, payload, images }: { items: Item[]; cols: 2 | 3; section: AiServicesSection; payload: AiSitePayload; images: string[] }) {
  const colsClass = cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  const gapClass = cols === 3 ? 'gap-6' : 'gap-5';
  const padClass = cols === 3 ? 'p-7' : 'p-6';
  const radiusClass = cols === 3 ? 'rounded-2xl' : 'rounded-lg';
  const showPhoto = (img: string | undefined) => cols === 3 || Boolean(img);

  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div className={`grid grid-cols-1 ${colsClass} ${gapClass}`}>
          {items.map((item, i) => {
            const img = images[i];
            const description = cols === 2 && item.description && item.description.length > 100
              ? item.description.slice(0, 100).trimEnd() + '…'
              : item.description;
            return (
              <div
                key={i}
                className={`${radiusClass} flex flex-col overflow-hidden`}
                style={{ background: payload.surfaceColor, border: `1px solid ${payload.borderColor}` }}
              >
                {showPhoto(img) && (
                  img ? (
                    <div className="aspect-[4/3] w-full max-h-[360px] overflow-hidden" style={{ background: payload.bgColor }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <PhotoPlaceholder payload={payload} shape="service" />
                  )
                )}
                <div className={`${padClass} flex flex-col flex-1`}>
                  {section.divider === 'number' && (
                    <div
                      className="inline-block self-start text-[10px] font-mono uppercase tracking-[0.3em] px-2 py-1 mb-3 rounded"
                      style={{ color: payload.primaryColor, background: payload.bgColor, border: `1px solid ${payload.borderColor}` }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  )}
                  <h3
                    className={cols === 3 ? 'text-xl font-semibold mb-3' : 'text-lg font-semibold mb-2'}
                    style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                  >
                    {item.name}
                  </h3>
                  {description && (
                    <p className={`${cols === 3 ? 'text-base' : 'text-sm'} mb-4 flex-1`} style={{ color: payload.mutedTextColor }}>
                      {description}
                    </p>
                  )}
                  <div
                    className={`flex items-center justify-between mt-auto ${section.divider === 'line' ? 'pt-3' : ''}`}
                    style={section.divider === 'line' ? { borderTop: `1px solid ${payload.borderColor}` } : undefined}
                  >
                    <PriceTag item={item} section={section} payload={payload} />
                    <DurationTag item={item} section={section} payload={payload} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Editorial rows — full-width rows, ghost numerals, NO images.
// ----------------------------------------------------------------

function EditorialRowsLayout({ items, section, payload }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload }) {
  const showRule = section.divider !== 'none';
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-6 py-10 md:py-12 items-baseline"
              style={showRule ? { borderTop: `1px solid ${payload.borderColor}` } : undefined}
            >
              <div className="col-span-12 md:col-span-2">
                <div
                  className="font-bold leading-none"
                  style={{
                    fontFamily: headingFontFamily(payload.headingFont),
                    color: payload.primaryColor,
                    opacity: section.divider === 'number' ? 0.85 : 0.25,
                    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <div className="col-span-12 md:col-span-7">
                <h3
                  className="text-2xl md:text-3xl font-semibold mb-3"
                  style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                >
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-base md:text-lg leading-relaxed" style={{ color: payload.mutedTextColor }}>
                    {item.description}
                  </p>
                )}
              </div>
              <div className="col-span-12 md:col-span-3 md:text-right flex md:flex-col gap-3 md:gap-2 items-baseline md:items-end">
                <PriceTag item={item} section={section} payload={payload} />
                <DurationTag item={item} section={section} payload={payload} />
              </div>
            </div>
          ))}
          {showRule && (
            <div className="h-px w-full" style={{ background: payload.borderColor }} />
          )}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Cards — heavy 2-col cards, 5:4 photos, price as a chip.
// ----------------------------------------------------------------

function CardsLayout({ items, section, payload, images }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload; images: string[] }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {items.map((item, i) => {
            const img = images[i];
            const showPriceChip = section.showPrices && typeof item.price === 'number';
            return (
              <div
                key={i}
                className="rounded-2xl flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: payload.surfaceColor,
                  border: `1.5px solid ${payload.borderColor}`,
                  boxShadow: `0 24px 60px -32px ${payload.primaryColor}`,
                }}
              >
                <div className="relative aspect-[5/4] w-full max-h-[420px] overflow-hidden" style={{ background: payload.bgColor }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <PhotoPlaceholder payload={payload} shape="service" fill />
                  )}
                  {showPriceChip && (
                    <div
                      className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-bold"
                      style={{
                        background: payload.primaryColor,
                        color: payload.surfaceColor,
                        boxShadow: `0 8px 20px -8px ${payload.primaryColor}`,
                      }}
                    >
                      €{item.price}
                    </div>
                  )}
                  {section.divider === 'number' && (
                    <div
                      className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-[0.3em] px-2.5 py-1 rounded"
                      style={{
                        background: payload.surfaceColor,
                        color: payload.primaryColor,
                        border: `1px solid ${payload.borderColor}`,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  )}
                </div>
                <div className="p-8 flex flex-col gap-4 flex-1">
                  <h3
                    className="text-2xl font-semibold leading-tight"
                    style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                  >
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-base leading-relaxed" style={{ color: payload.mutedTextColor }}>
                      {item.description}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <DurationTag item={item} section={section} payload={payload} />
                    {!showPriceChip && (
                      <PriceTag item={item} section={section} payload={payload} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
