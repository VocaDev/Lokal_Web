'use client';

import { useState } from 'react';
import type { AiFaqSection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';

interface Props {
  section: AiFaqSection;
  payload: AiSitePayload;
}

export function FaqSection({ section, payload }: Props) {
  const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
  if (items.length === 0) return null;

  switch (section.layout) {
    case 'two-column':  return <TwoColumn items={items} payload={payload} />;
    case 'inline':      return <Inline items={items} payload={payload} />;
    case 'accordion':
    default:            return <Accordion items={items} payload={payload} />;
  }
}

function Header({ payload }: { payload: AiSitePayload }) {
  return (
    <h2
      className="text-3xl md:text-4xl font-bold mb-10"
      style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
    >
      Pyetjet e shpeshta
    </h2>
  );
}

function Accordion({ items, payload }: { items: AiFaqSection['items']; payload: AiSitePayload }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-3xl mx-auto">
        <Header payload={payload} />
        <div>
          {items.map((q, i) => {
            const open = openIdx === i;
            return (
              <div
                key={i}
                style={{ borderTop: `1px solid ${payload.borderColor}`, ...(i === items.length - 1 ? { borderBottom: `1px solid ${payload.borderColor}` } : {}) }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-base md:text-lg font-medium" style={{ color: payload.textColor }}>
                    {q.question}
                  </span>
                  <span
                    className="text-2xl shrink-0 transition-transform"
                    style={{
                      color: payload.primaryColor,
                      transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    +
                  </span>
                </button>
                {open && (
                  <div className="pb-5 text-base leading-relaxed" style={{ color: payload.mutedTextColor }}>
                    {q.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TwoColumn({ items, payload }: { items: AiFaqSection['items']; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-5xl mx-auto">
        <Header payload={payload} />
        <div className="space-y-8">
          {items.map((q, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8" style={{ borderTop: `1px solid ${payload.borderColor}`, paddingTop: 24 }}>
              <div className="md:col-span-5">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: payload.textColor }}>
                  {q.question}
                </h3>
              </div>
              <div className="md:col-span-7">
                <p className="text-base leading-relaxed" style={{ color: payload.mutedTextColor }}>
                  {q.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inline({ items, payload }: { items: AiFaqSection['items']; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-2xl mx-auto">
        <Header payload={payload} />
        <div className="space-y-7">
          {items.map((q, i) => (
            <div key={i}>
              <p className="text-base font-semibold mb-1" style={{ color: payload.textColor }}>
                {q.question}
              </p>
              <p className="text-base leading-relaxed" style={{ color: payload.mutedTextColor }}>
                {q.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
