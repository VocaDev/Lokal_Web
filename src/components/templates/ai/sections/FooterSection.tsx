import type { Business, BusinessHours } from '@/lib/types';
import type { AiFooterSection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X } from './_shared';

interface Props {
  section: AiFooterSection;
  business: Business;
  hours: BusinessHours[];
  payload: AiSitePayload;
}

const DAY_LABELS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];

export function FooterSection({ section, business, hours, payload }: Props) {
  switch (section.layout) {
    case 'three-column':  return <ThreeColumn section={section} business={business} hours={hours} payload={payload} />;
    case 'editorial':     return <Editorial section={section} business={business} payload={payload} />;
    case 'minimal':       return <Minimal section={section} business={business} payload={payload} />;
    case 'centered':
    default:              return <Centered section={section} business={business} payload={payload} />;
  }
}

function PoweredBy({ payload }: { payload: AiSitePayload }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.25em] mt-4" style={{ color: payload.mutedTextColor }}>
      Powered by LokalWeb
    </div>
  );
}

// ----------------------------------------------------------------

function Centered({ section, business, payload }: Omit<Props, 'hours'>) {
  return (
    <footer
      className={`${SECTION_PADDING_X} py-14 text-center`}
      style={{ background: payload.surfaceColor, borderTop: `1px solid ${payload.borderColor}` }}
    >
      <div
        className="text-2xl md:text-3xl font-bold mb-3"
        style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
      >
        {business.name}
      </div>
      {section.tagline && (
        <p className="max-w-xl mx-auto text-base mb-5" style={{ color: payload.mutedTextColor }}>
          {section.tagline}
        </p>
      )}
      <div className="text-sm" style={{ color: payload.mutedTextColor }}>
        {[business.address, business.phone].filter(Boolean).join(' · ')}
      </div>
      <div className="text-sm mt-2" style={{ color: payload.mutedTextColor }}>
        © {new Date().getFullYear()} {business.name}
      </div>
      <PoweredBy payload={payload} />
    </footer>
  );
}

// ----------------------------------------------------------------

function ThreeColumn({ section, business, hours, payload }: Props) {
  const openHours = hours.filter(h => h.isOpen).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return (
    <footer
      className={`${SECTION_PADDING_X} py-16`}
      style={{ background: payload.surfaceColor, borderTop: `1px solid ${payload.borderColor}` }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div
            className="text-xl font-bold mb-3"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            {business.name}
          </div>
          {section.tagline && (
            <p className="text-sm" style={{ color: payload.mutedTextColor }}>{section.tagline}</p>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: payload.mutedTextColor }}>
            Kontakti
          </div>
          {business.phone && <div className="text-sm mb-1" style={{ color: payload.textColor }}>{business.phone}</div>}
          {business.address && <div className="text-sm" style={{ color: payload.textColor }}>{business.address}</div>}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: payload.mutedTextColor }}>
            Orari
          </div>
          {openHours.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {openHours.map(h => (
                <li key={h.id} className="flex justify-between gap-3" style={{ color: payload.textColor }}>
                  <span>{DAY_LABELS[h.dayOfWeek]}</span>
                  <span style={{ color: payload.mutedTextColor }}>
                    {h.openTime?.slice(0, 5)} – {h.closeTime?.slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm" style={{ color: payload.mutedTextColor }}>—</div>
          )}
        </div>
      </div>
      <div
        className="max-w-6xl mx-auto mt-10 pt-6 flex justify-between items-center text-xs flex-wrap gap-2"
        style={{ borderTop: `1px solid ${payload.borderColor}`, color: payload.mutedTextColor }}
      >
        <span>© {new Date().getFullYear()} {business.name}</span>
        <span className="uppercase tracking-[0.25em]">Powered by LokalWeb</span>
      </div>
    </footer>
  );
}

// ----------------------------------------------------------------

function Editorial({ section, business, payload }: Omit<Props, 'hours'>) {
  return (
    <footer
      className={`${SECTION_PADDING_X} pt-20 pb-10`}
      style={{ background: payload.bgColor, borderTop: `1px solid ${payload.borderColor}` }}
    >
      <div
        className="text-5xl md:text-7xl font-bold leading-none mb-6"
        style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
      >
        {business.name}
      </div>
      {section.tagline && (
        <p className="max-w-2xl text-lg mb-10" style={{ color: payload.mutedTextColor }}>
          {section.tagline}
        </p>
      )}
      <div
        className="flex flex-wrap items-baseline justify-between gap-4 pt-6"
        style={{ borderTop: `1px solid ${payload.borderColor}` }}
      >
        <div className="text-sm" style={{ color: payload.mutedTextColor }}>
          {[business.address, business.phone].filter(Boolean).join(' · ')}
        </div>
        <div className="text-xs uppercase tracking-[0.25em]" style={{ color: payload.mutedTextColor }}>
          © {new Date().getFullYear()} · Powered by LokalWeb
        </div>
      </div>
    </footer>
  );
}

// ----------------------------------------------------------------

function Minimal({ section, business, payload }: Omit<Props, 'hours'>) {
  return (
    <footer
      className={`${SECTION_PADDING_X} py-8 flex flex-wrap items-center justify-between gap-3 text-xs`}
      style={{ background: payload.bgColor, borderTop: `1px solid ${payload.borderColor}`, color: payload.mutedTextColor }}
    >
      <span style={{ color: payload.textColor }}>© {new Date().getFullYear()} {business.name}</span>
      {section.tagline && <span>{section.tagline}</span>}
      <span className="uppercase tracking-[0.25em]">Powered by LokalWeb</span>
    </footer>
  );
}
