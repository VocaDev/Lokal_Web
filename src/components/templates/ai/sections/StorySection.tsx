import type { Business } from '@/lib/types';
import type { AiStorySection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';
import { PhotoPlaceholder } from './PhotoPlaceholder';

interface Props {
  section: AiStorySection;
  payload: AiSitePayload;
  // business is optional so the wizard preview (which doesn't pass it) still
  // renders. Public-site renderer always passes it.
  business?: Business;
}

export function StorySection({ section, payload, business }: Props) {
  const storyImageUrl = business?.gallerySections?.story?.[0];

  switch (section.layout) {
    case 'two-column':      return <TwoColumn section={section} payload={payload} storyImageUrl={storyImageUrl} />;
    case 'long-form':       return <LongForm section={section} payload={payload} storyImageUrl={storyImageUrl} />;
    case 'pull-quote':      return <PullQuote section={section} payload={payload} />;
    case 'centered-quote':
    default:                return <CenteredQuote section={section} payload={payload} business={business} />;
  }
}

interface LayoutProps {
  section: AiStorySection;
  payload: AiSitePayload;
  storyImageUrl?: string;
}

// Centered-quote: NO photo. Single big italic centered quote.
function CenteredQuote({ section, payload, business }: { section: AiStorySection; payload: AiSitePayload; business?: Business }) {
  const attribution = section.attribution || business?.name;
  return (
    <section
      className={`${SECTION_PADDING_X} flex items-center justify-center min-h-[60vh] py-24 md:py-32 text-center`}
      style={{ background: payload.surfaceColor }}
    >
      <div className="max-w-[600px] mx-auto">
        <p
          className="text-3xl md:text-5xl leading-[1.2] italic"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          &ldquo;{section.body}&rdquo;
        </p>
        {attribution && (
          <div
            className="mt-10 text-[10px] uppercase tracking-[0.4em]"
            style={{ color: payload.mutedTextColor }}
          >
            — {attribution}
          </div>
        )}
      </div>
    </section>
  );
}

// Two-column: strict 50/50 grid. Square photo on the left, text on the right.
function TwoColumn({ section, payload, storyImageUrl }: LayoutProps) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div className="aspect-square w-full overflow-hidden rounded-md" style={{ background: payload.surfaceColor }}>
          {storyImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={storyImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PhotoPlaceholder payload={payload} shape="story" label="STORY PHOTO" fill />
          )}
        </div>
        <div>
          <h2
            className="text-3xl md:text-4xl font-bold leading-tight mb-5"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            Historia
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed whitespace-pre-line"
            style={{ color: payload.mutedTextColor }}
          >
            {section.body}
          </p>
          {section.attribution && (
            <div className="mt-6 text-[10px] uppercase tracking-[0.4em]" style={{ color: payload.mutedTextColor }}>
              — {section.attribution}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Long-form: single column, photo at top, drop cap on body when long.
function LongForm({ section, payload, storyImageUrl }: LayoutProps) {
  const useDropCap = section.body.length > 200;
  const firstChar = section.body.charAt(0);
  const restBody = section.body.slice(1);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-[700px] mx-auto">
        {storyImageUrl ? (
          <div
            className="rounded-md overflow-hidden mb-12 border"
            style={{ borderColor: payload.borderColor }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storyImageUrl} alt="" className="w-full h-auto block max-h-[460px] object-cover" />
          </div>
        ) : (
          <div className="mb-12">
            <PhotoPlaceholder payload={payload} shape="story" label="STORY PHOTO" />
          </div>
        )}
        <h2
          className="text-2xl md:text-3xl font-bold mb-7"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          Historia
        </h2>
        <p
          className="text-base md:text-lg leading-[1.85] whitespace-pre-line"
          style={{ color: payload.mutedTextColor }}
        >
          {useDropCap ? (
            <>
              <span
                style={{
                  float: 'left',
                  fontSize: '4.5rem',
                  fontWeight: 700,
                  lineHeight: '1',
                  marginRight: '0.5rem',
                  marginTop: '0.35rem',
                  color: payload.primaryColor,
                  fontFamily: headingFontFamily(payload.headingFont),
                }}
              >
                {firstChar}
              </span>
              {restBody}
            </>
          ) : (
            section.body
          )}
        </p>
        {section.attribution && (
          <div className="mt-8 text-[10px] uppercase tracking-[0.4em]" style={{ color: payload.mutedTextColor }}>
            — {section.attribution}
          </div>
        )}
      </div>
    </section>
  );
}

// Pull-quote: NO photo. Heading, giant pull-quote with thick bar, then prose.
function PullQuote({ section, payload }: { section: AiStorySection; payload: AiSitePayload }) {
  const sentences = section.body.split(/(?<=[.!?])\s+/);
  const callout = sentences[0] ?? section.body;
  const rest = sentences.slice(1).join(' ');
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-bold mb-10"
          style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
        >
          Historia
        </h2>
        <blockquote
          className="text-3xl md:text-5xl leading-[1.2] italic font-semibold pl-7 md:pl-10 my-10"
          style={{
            fontFamily: headingFontFamily(payload.headingFont),
            color: payload.textColor,
            borderLeft: `4px solid ${payload.primaryColor}`,
          }}
        >
          &ldquo;{callout}&rdquo;
        </blockquote>
        {rest && (
          <p
            className="text-base md:text-lg leading-relaxed mt-10 whitespace-pre-line"
            style={{ color: payload.mutedTextColor }}
          >
            {rest}
          </p>
        )}
        {section.attribution && (
          <div className="mt-8 text-[10px] uppercase tracking-[0.4em]" style={{ color: payload.mutedTextColor }}>
            — {section.attribution}
          </div>
        )}
      </div>
    </section>
  );
}
