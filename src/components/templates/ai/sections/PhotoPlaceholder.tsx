import { ImageIcon } from 'lucide-react';
import type { AiSitePayload } from '@/lib/types/customization';

interface Props {
  payload: AiSitePayload;
  shape?: 'hero' | 'story' | 'service' | 'gallery';
  label?: string;
  className?: string;
  /**
   * When true, the placeholder fills its parent image area. Used for
   * fullbleed/asymmetric heroes where the placeholder sits behind text.
   */
  fill?: boolean;
}

const ASPECT: Record<string, string> = {
  hero: 'aspect-[16/9]',
  story: 'aspect-[4/3]',
  service: 'aspect-[4/3]',
  gallery: 'aspect-square',
};

// Upper bound on placeholder height per shape — applied in BOTH modes.
// In aspect-mode (fill=false) it caps the height when a wide container
// would otherwise multiply the aspect ratio into something huge.
// In fill-mode it caps the height when a tall parent
// (e.g. a min-h-[700px] hero section) would otherwise stretch the
// placeholder to the full viewport. This is the systemic guard — every
// section that uses PhotoPlaceholder inherits the cap automatically, so
// adding a new section never re-introduces "the dashed box ate my page."
//
// Values are calibrated to match the largest INTENTIONAL parent height
// for each shape, so layouts with already-bounded parents (CardsLayout
// max-h-[420px], Showcase h-[480px], etc.) are not visually shrunk.
const MAX_HEIGHT_PX: Record<string, number> = {
  hero: 520,    // caps Fullbleed/Split runaway from 700/640 → 520
  story: 460,   // = StorySection LongForm img cap
  service: 420, // = ServicesSection CardsLayout container cap
  gallery: 480, // = GallerySection Showcase main slot height
};

export function PhotoPlaceholder({
  payload,
  shape = 'hero',
  label,
  className,
  fill,
}: Props) {
  const aspect = fill ? '' : ASPECT[shape];
  const positioning = fill ? 'absolute inset-x-0 top-0 h-full pointer-events-none' : 'w-full';

  return (
    <div
      className={[positioning, aspect, 'rounded-lg flex items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: payload.surfaceColor,
        border: `2px dashed ${payload.borderColor}`,
        // max-height alone — when parent is shorter than the cap, the
        // parent sizing wins and the placeholder stays small.
        // When parent is taller (e.g. 700px hero), the cap clamps to a
        // reasonable size and the section bg shows below.
        maxHeight: `${MAX_HEIGHT_PX[shape]}px`,
      }}
    >
      <div className="flex flex-col items-center gap-2" style={{ color: payload.mutedTextColor }}>
        <ImageIcon size={shape === 'hero' ? 32 : 20} strokeWidth={1.5} />
        {label && (
          <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
        )}
      </div>
    </div>
  );
}
