'use client';

import { useEffect, useState } from 'react';
import type { AiTestimonialsSection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';

interface Props {
  section: AiTestimonialsSection;
  payload: AiSitePayload;
}

type Quote = AiTestimonialsSection['items'][number];

export function TestimonialsSection({ section, payload }: Props) {
  const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
  if (items.length === 0) return null;

  switch (section.layout) {
    case 'single-quote':  return <SingleQuote items={items} payload={payload} />;
    case 'rotating':      return <Rotating items={items} payload={payload} />;
    case 'wall':          return <Wall items={items} payload={payload} />;
    case 'cards':
    default:              return <Cards items={items} payload={payload} />;
  }
}

function Header({ payload }: { payload: AiSitePayload }) {
  return (
    <h2
      className="text-3xl md:text-4xl font-bold mb-10 text-center"
      style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
    >
      Çfarë thonë klientët
    </h2>
  );
}

function QuoteCard({ q, payload }: { q: Quote; payload: AiSitePayload }) {
  return (
    <div
      className="p-6 rounded-xl flex flex-col gap-4 h-full"
      style={{ background: payload.surfaceColor, border: `1px solid ${payload.borderColor}` }}
    >
      <p className="text-base leading-relaxed" style={{ color: payload.textColor }}>
        &ldquo;{q.quote}&rdquo;
      </p>
      <div className="mt-auto">
        <div className="text-sm font-semibold" style={{ color: payload.textColor }}>{q.name}</div>
        <div className="text-xs uppercase tracking-wider mt-0.5" style={{ color: payload.mutedTextColor }}>
          {q.role}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------

function Cards({ items, payload }: { items: Quote[]; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <Header payload={payload} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.slice(0, 3).map((q, i) => <QuoteCard key={i} q={q} payload={payload} />)}
        </div>
      </div>
    </section>
  );
}

function SingleQuote({ items, payload }: { items: Quote[]; payload: AiSitePayload }) {
  const q = items[0];
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-6xl leading-none mb-6" style={{ color: payload.primaryColor, fontFamily: headingFontFamily(payload.headingFont) }}>“</div>
        <p
          className="text-xl md:text-3xl leading-snug font-medium mb-6"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          {q.quote}
        </p>
        <div className="text-sm font-semibold" style={{ color: payload.textColor }}>{q.name}</div>
        <div className="text-xs uppercase tracking-[0.25em] mt-1" style={{ color: payload.mutedTextColor }}>
          {q.role}
        </div>
      </div>
    </section>
  );
}

function Rotating({ items, payload }: { items: Quote[]; payload: AiSitePayload }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  const q = items[idx];

  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-3xl mx-auto text-center">
        <Header payload={payload} />
        <div className="min-h-[180px]">
          <p
            key={idx}
            className="text-lg md:text-2xl leading-snug font-medium mb-6 transition-opacity duration-500"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            &ldquo;{q.quote}&rdquo;
          </p>
          <div className="text-sm font-semibold" style={{ color: payload.textColor }}>{q.name}</div>
          <div className="text-xs uppercase tracking-[0.25em] mt-1" style={{ color: payload.mutedTextColor }}>
            {q.role}
          </div>
        </div>
        <div className="flex justify-center gap-1.5 mt-8">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Show testimonial ${i + 1}`}
              className="w-2 h-2 rounded-full transition-opacity"
              style={{
                background: payload.primaryColor,
                opacity: i === idx ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Wall({ items, payload }: { items: Quote[]; payload: AiSitePayload }) {
  // Show up to 6 in a masonry-ish layout — falls back to whatever's provided.
  const display = items.slice(0, 6);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <Header payload={payload} />
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {display.map((q, i) => (
            <div key={i} className="mb-4 break-inside-avoid">
              <QuoteCard q={q} payload={payload} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
