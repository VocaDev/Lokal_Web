import type { Business } from '@/lib/types';
import type { AiGallerySection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';
import { PhotoPlaceholder } from './PhotoPlaceholder';

interface Props {
  section: AiGallerySection;
  business: Business;
  payload: AiSitePayload;
}

export function GallerySection({ section, business, payload }: Props) {
  const images = (business.gallerySections?.gallery ?? []).filter(Boolean);

  // No uploaded photos → don't render the section at all. The previous
  // empty state rendered 5-6 dashed-border "GALLERY PHOTO" placeholder boxes
  // that didn't blend with most sites. Generation post-processor also strips
  // empty gallery sections; this guard handles already-persisted themes.
  if (images.length === 0) return null;

  switch (section.layout) {
    case 'grid-uniform':  return <GridUniform images={images} section={section} payload={payload} />;
    case 'showcase':      return <Showcase images={images} section={section} payload={payload} />;
    case 'strip':         return <Strip images={images} section={section} payload={payload} />;
    case 'masonry':
    default:              return <Masonry images={images} section={section} payload={payload} />;
  }
}

function GalleryHeader({ section, payload }: { section: AiGallerySection; payload: AiSitePayload }) {
  return (
    <div className="mb-8">
      <h2
        className="text-3xl md:text-4xl font-bold"
        style={{ fontFamily: headingFontFamily(payload.headingFont), color: payload.textColor }}
      >
        Galeria
      </h2>
      {section.caption && (
        <p className="mt-2 text-base" style={{ color: payload.mutedTextColor }}>
          {section.caption}
        </p>
      )}
    </div>
  );
}

// Render each grid slot as a real <img> when an image is uploaded, otherwise
// a dashed PhotoPlaceholder so the user sees exactly where photos go.
//
// Each layout decides how many slots to fill in the empty case.

function Masonry({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  const slots = images.length > 0 ? images.slice(0, 9) : new Array(6).fill(null);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="columns-1 sm:columns-2 md:columns-3 gap-3 [column-fill:_balance]">
          {slots.map((src, i) => (
            <div key={i} className="mb-3 break-inside-avoid rounded-lg overflow-hidden">
              {src ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={src} alt="" className="w-full h-auto max-h-[560px] object-cover block" loading="lazy" />
              ) : (
                <PhotoPlaceholder payload={payload} shape="gallery" label="GALLERY PHOTO" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GridUniform({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  const slots = images.length > 0 ? images.slice(0, 12) : new Array(6).fill(null);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slots.map((src, i) =>
            src ? (
              <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: payload.surfaceColor }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : (
              <PhotoPlaceholder key={i} payload={payload} shape="gallery" label="GALLERY PHOTO" />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function Showcase({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  const empty = images.length === 0;
  const [hero, ...rest] = empty ? [null, null, null, null, null] : images;
  const thumbs = (rest as Array<string | null>).slice(0, 4);
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 rounded-xl overflow-hidden" style={{ background: payload.surfaceColor }}>
            {hero ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hero} alt="" className="w-full h-72 md:h-[480px] object-cover" />
            ) : (
              <div className="relative w-full h-72 md:h-[480px]">
                <PhotoPlaceholder payload={payload} shape="gallery" label="HERO PHOTO" fill />
              </div>
            )}
          </div>
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3">
            {thumbs.map((src, i) =>
              src ? (
                <div key={i} className="aspect-square md:aspect-[4/3] rounded-lg overflow-hidden" style={{ background: payload.surfaceColor }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <PhotoPlaceholder key={i} payload={payload} shape="gallery" />
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Strip({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  const slots = images.length > 0 ? images : new Array(5).fill(null);
  return (
    <section className={`${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className={`${SECTION_PADDING_X} max-w-6xl mx-auto`}>
        <GalleryHeader section={section} payload={payload} />
      </div>
      <div className="overflow-x-auto pb-4">
        <div className={`${SECTION_PADDING_X} flex gap-3 min-w-max`}>
          {slots.map((src, i) => (
            <div key={i} className="relative w-72 h-48 md:w-96 md:h-64 rounded-lg overflow-hidden shrink-0" style={{ background: payload.surfaceColor }}>
              {src ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <PhotoPlaceholder payload={payload} shape="gallery" label="GALLERY PHOTO" fill />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
