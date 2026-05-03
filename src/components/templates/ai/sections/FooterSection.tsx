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

// Normalize a user-typed URL: prefix with https:// if the user only typed
// a domain or @handle, since <a href="instagram.com/foo"> is treated as a
// relative path by the browser.
function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('@')) return `https://www.instagram.com/${trimmed.slice(1)}`;
  return `https://${trimmed}`;
}

function pickSocialLinks(business: Business): Array<{ label: string; href: string }> {
  const links: Array<{ label: string; href: string }> = [];
  const ig = normalizeUrl(business.socialLinks?.instagram);
  const tt = normalizeUrl(business.socialLinks?.tiktok);
  const fb = normalizeUrl(business.socialLinks?.facebook);
  const wa = normalizeUrl(business.socialLinks?.whatsapp);
  if (ig) links.push({ label: 'Instagram', href: ig });
  if (tt) links.push({ label: 'TikTok', href: tt });
  if (fb) links.push({ label: 'Facebook', href: fb });
  if (wa) links.push({ label: 'WhatsApp', href: wa });
  return links;
}

function SocialLinks({
  business, payload, align = 'center',
}: { business: Business; payload: AiSitePayload; align?: 'center' | 'start' }) {
  const links = pickSocialLinks(business);
  if (links.length === 0) return null;
  const justify = align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <div className={`flex flex-wrap gap-2 mt-4 ${justify}`}>
      {links.map(l => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
          style={{
            border: `1px solid ${payload.borderColor}`,
            color: payload.textColor,
          }}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

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
      <SocialLinks business={business} payload={payload} />
      <div className="text-sm mt-4" style={{ color: payload.mutedTextColor }}>
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
          <SocialLinks business={business} payload={payload} align="start" />
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
        <p className="max-w-2xl text-lg mb-6" style={{ color: payload.mutedTextColor }}>
          {section.tagline}
        </p>
      )}
      <div className="mb-6"><SocialLinks business={business} payload={payload} align="start" /></div>
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
  const hasSocials = pickSocialLinks(business).length > 0;
  return (
    <footer
      className={`${SECTION_PADDING_X} py-8`}
      style={{ background: payload.bgColor, borderTop: `1px solid ${payload.borderColor}`, color: payload.mutedTextColor }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span style={{ color: payload.textColor }}>© {new Date().getFullYear()} {business.name}</span>
        {section.tagline && <span>{section.tagline}</span>}
        <span className="uppercase tracking-[0.25em]">Powered by LokalWeb</span>
      </div>
      {hasSocials && (
        <div className="flex justify-center mt-3">
          <SocialLinks business={business} payload={payload} />
        </div>
      )}
    </footer>
  );
}
