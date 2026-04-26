import type { Business, Service } from '@/lib/types';
import type { AiServicesSection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';

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
  // Prefer the AI-generated items; fall back to the DB services if items is empty/missing.
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

function ListLayout({ items, section, payload }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-3xl">
        <SectionHeader section={section} payload={payload} />
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-6 py-5"
              style={section.divider !== 'none' ? { borderBottom: `1px solid ${payload.borderColor}` } : undefined}
            >
              <div className="flex items-baseline gap-4 min-w-0">
                {section.divider === 'number' && (
                  <span className="text-xs font-mono" style={{ color: payload.mutedTextColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-base md:text-lg font-semibold truncate" style={{ color: payload.textColor }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-sm mt-0.5" style={{ color: payload.mutedTextColor }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
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

function GridLayout({ items, cols, section, payload, images }: { items: Item[]; cols: 2 | 3; section: AiServicesSection; payload: AiSitePayload; images: string[] }) {
  const colsClass = cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div className={`grid grid-cols-1 ${colsClass} gap-5`}>
          {items.map((item, i) => {
            const img = images[i];
            return (
              <div
                key={i}
                className="rounded-lg flex flex-col overflow-hidden"
                style={{ background: payload.surfaceColor, border: `1px solid ${payload.borderColor}` }}
              >
                {img && (
                  <div className="aspect-[4/3] w-full overflow-hidden" style={{ background: payload.bgColor }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  {section.divider === 'number' && (
                    <div className="text-xs font-mono mb-3" style={{ color: payload.primaryColor }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  )}
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                  >
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm mb-4 flex-1" style={{ color: payload.mutedTextColor }}>
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
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

function EditorialRowsLayout({ items, section, payload }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-4xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-6 py-8"
              style={section.divider !== 'none' ? { borderTop: `1px solid ${payload.borderColor}` } : undefined}
            >
              <div className="col-span-12 md:col-span-2">
                {section.divider === 'number' ? (
                  <div className="text-3xl font-bold" style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.primaryColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                ) : (
                  <DurationTag item={item} section={section} payload={payload} />
                )}
              </div>
              <div className="col-span-12 md:col-span-7">
                <h3
                  className="text-2xl font-semibold mb-2"
                  style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                >
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-base" style={{ color: payload.mutedTextColor }}>
                    {item.description}
                  </p>
                )}
              </div>
              <div className="col-span-12 md:col-span-3 md:text-right flex md:flex-col gap-2 md:gap-1 items-baseline md:items-end">
                <PriceTag item={item} section={section} payload={payload} />
                {section.divider === 'number' && <DurationTag item={item} section={section} payload={payload} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------

function CardsLayout({ items, section, payload, images }: { items: Item[]; section: AiServicesSection; payload: AiSitePayload; images: string[] }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader section={section} payload={payload} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const img = images[i];
            return (
              <div
                key={i}
                className="rounded-xl flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: payload.surfaceColor,
                  border: `1px solid ${payload.borderColor}`,
                  boxShadow: `0 14px 40px -28px ${payload.primaryColor}`,
                }}
              >
                {img && (
                  <div className="aspect-[16/10] w-full overflow-hidden" style={{ background: payload.bgColor }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-7 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between">
                    <h3
                      className="text-xl font-semibold leading-tight"
                      style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
                    >
                      {item.name}
                    </h3>
                    <PriceTag item={item} section={section} payload={payload} />
                  </div>
                  {item.description && (
                    <p className="text-sm" style={{ color: payload.mutedTextColor }}>
                      {item.description}
                    </p>
                  )}
                  <div className="mt-auto">
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
