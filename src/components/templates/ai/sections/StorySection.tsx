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
    case 'pull-quote':      return <PullQuote section={section} payload={payload} storyImageUrl={storyImageUrl} />;
    case 'centered-quote':
    default:                return <CenteredQuote section={section} payload={payload} storyImageUrl={storyImageUrl} />;
  }
}

interface LayoutProps {
  section: AiStorySection;
  payload: AiSitePayload;
  storyImageUrl?: string;
}

function CenteredQuote({ section, payload, storyImageUrl }: LayoutProps) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y} text-center`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-3xl mx-auto">
        {storyImageUrl && (
          <div
            className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-8 border"
            style={{ borderColor: payload.borderColor }}
          >
            <img src={storyImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
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

function TwoColumn({ section, payload, storyImageUrl }: LayoutProps) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-5">
          {storyImageUrl ? (
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: payload.borderColor }}
            >
              <img src={storyImageUrl} alt="" className="w-full h-auto block" />
            </div>
          ) : (
            <PhotoPlaceholder payload={payload} shape="story" label="STORY PHOTO" />
          )}
          {section.attribution && (
            <div className="mt-3 text-xs uppercase tracking-[0.3em]" style={{ color: payload.mutedTextColor }}>
              {section.attribution}
            </div>
          )}
        </div>
        <div className="md:col-span-7">
          <h2
            className="text-3xl md:text-4xl font-bold leading-tight mb-4"
            style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
          >
            Historia
          </h2>
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-line" style={{ color: payload.mutedTextColor }}>
            {section.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function LongForm({ section, payload, storyImageUrl }: LayoutProps) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-2xl mx-auto">
        {storyImageUrl ? (
          <div
            className="rounded-xl overflow-hidden mb-10 border"
            style={{ borderColor: payload.borderColor }}
          >
            <img src={storyImageUrl} alt="" className="w-full h-auto block max-h-[420px] object-cover" />
          </div>
        ) : (
          <div className="mb-10">
            <PhotoPlaceholder payload={payload} shape="story" label="STORY PHOTO" />
          </div>
        )}
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

function PullQuote({ section, payload, storyImageUrl }: LayoutProps) {
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
          {storyImageUrl ? (
            <div
              className="rounded-xl overflow-hidden mb-5 border"
              style={{ borderColor: payload.borderColor }}
            >
              <img src={storyImageUrl} alt="" className="w-full h-auto block max-h-[300px] object-cover" />
            </div>
          ) : (
            <div className="mb-5 max-w-sm">
              <PhotoPlaceholder payload={payload} shape="story" label="STORY PHOTO" />
            </div>
          )}
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
