import type { Business } from '@/lib/types';
import type { AiGallerySection, AiSitePayload } from '@/lib/types/customization';
import { headingFontFamily, SECTION_PADDING_X, SECTION_PADDING_Y } from './_shared';

interface Props {
  section: AiGallerySection;
  business: Business;
  payload: AiSitePayload;
}

export function GallerySection({ section, business, payload }: Props) {
  const images = (business.galleryImages || []).filter(Boolean);

  if (images.length === 0) {
    return <EmptyGallery section={section} payload={payload} />;
  }

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

function EmptyGallery({ section, payload }: { section: AiGallerySection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.surfaceColor }}>
      <div className="max-w-4xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div
          className="rounded-2xl h-64 md:h-80 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${payload.primaryColor}25, ${payload.accentColor}20)`,
            border: `1px dashed ${payload.borderColor}`,
          }}
        >
          <div className="text-center">
            <div className="text-base font-medium mb-1" style={{ color: payload.textColor }}>
              Photos coming soon
            </div>
            <div className="text-sm" style={{ color: payload.mutedTextColor }}>
              Shtoji nga paneli i kontrollit
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Masonry({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="columns-1 sm:columns-2 md:columns-3 gap-3 [column-fill:_balance]">
          {images.slice(0, 9).map((src, i) => (
            <div key={i} className="mb-3 break-inside-avoid rounded-lg overflow-hidden" style={{ background: payload.surfaceColor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-auto block" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GridUniform({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.slice(0, 12).map((src, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: payload.surfaceColor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  const [hero, ...rest] = images;
  return (
    <section className={`${SECTION_PADDING_X} ${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <GalleryHeader section={section} payload={payload} />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 rounded-xl overflow-hidden" style={{ background: payload.surfaceColor }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="w-full h-72 md:h-[480px] object-cover" />
          </div>
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3">
            {rest.slice(0, 4).map((src, i) => (
              <div key={i} className="aspect-square md:aspect-[4/3] rounded-lg overflow-hidden" style={{ background: payload.surfaceColor }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Strip({ images, section, payload }: { images: string[]; section: AiGallerySection; payload: AiSitePayload }) {
  return (
    <section className={`${SECTION_PADDING_Y}`} style={{ background: payload.bgColor }}>
      <div className={`${SECTION_PADDING_X} max-w-6xl mx-auto`}>
        <GalleryHeader section={section} payload={payload} />
      </div>
      <div className="overflow-x-auto pb-4">
        <div className={`${SECTION_PADDING_X} flex gap-3 min-w-max`}>
          {images.map((src, i) => (
            <div key={i} className="w-72 h-48 md:w-96 md:h-64 rounded-lg overflow-hidden shrink-0" style={{ background: payload.surfaceColor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
