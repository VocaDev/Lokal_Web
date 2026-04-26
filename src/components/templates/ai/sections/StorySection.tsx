import type { AiStorySection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';

interface Props {
  section: AiStorySection;
  payload: AiSitePayload;
}

export function StorySection({ section, payload }: Props) {
  switch (section.layout) {
    case 'two-column':      return <TwoColumn section={section} payload={payload} />;
    case 'long-form':       return <LongForm section={section} payload={payload} />;
    case 'pull-quote':      return <PullQuote section={section} payload={payload} />;
    case 'centered-quote':
    default:                return <CenteredQuote section={section} payload={payload} />;
  }
}

function CenteredQuote({ section, payload }: Props) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y} text-center`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-3xl mx-auto">
        <p
          className="text-2xl md:text-4xl leading-snug font-medium"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          &ldquo;{section.body}&rdquo;
        </p>
        {section.attribution && (
          <div
            className="mt-8 text-xs uppercase tracking-[0.3em]"
            style={{ color: payload.mutedTextColor }}
          >
            {section.attribution}
          </div>
        )}
      </div>
    </section>
  );
}

function TwoColumn({ section, payload }: Props) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <h2
            className="text-3xl md:text-4xl font-bold leading-tight"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            Historia
          </h2>
          {section.attribution && (
            <div className="mt-3 text-xs uppercase tracking-[0.3em]" style={{ color: payload.mutedTextColor }}>
              {section.attribution}
            </div>
          )}
        </div>
        <div className="md:col-span-7">
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-line" style={{ color: payload.mutedTextColor }}>
            {section.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function LongForm({ section, payload }: Props) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-bold mb-6"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          Historia
        </h2>
        <p className="text-base md:text-lg leading-relaxed whitespace-pre-line" style={{ color: payload.mutedTextColor }}>
          {section.body}
        </p>
        {section.attribution && (
          <div className="mt-6 text-xs uppercase tracking-[0.3em]" style={{ color: payload.mutedTextColor }}>
            — {section.attribution}
          </div>
        )}
      </div>
    </section>
  );
}

function PullQuote({ section, payload }: Props) {
  // First sentence becomes the pull-quote callout, the rest becomes supporting paragraph.
  const sentences = section.body.split(/(?<=[.!?])\s+/);
  const callout = sentences[0] ?? section.body;
  const rest = sentences.slice(1).join(' ');
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5">
          <p
            className="text-2xl md:text-3xl leading-snug font-semibold relative pl-6"
            style={{
              fontFamily: headingFontFamily(payload.headingFont),
              color: payload.textColor,
              borderLeft: `3px solid ${payload.primaryColor}`,
            }}
          >
            {callout}
          </p>
        </div>
        <div className="md:col-span-7">
          {rest && (
            <p className="text-base leading-relaxed" style={{ color: payload.mutedTextColor }}>
              {rest}
            </p>
          )}
          {section.attribution && (
            <div className="mt-5 text-xs uppercase tracking-[0.3em]" style={{ color: payload.mutedTextColor }}>
              — {section.attribution}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
