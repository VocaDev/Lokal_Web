import { ImageIcon } from 'lucide-react';
import type { AiSitePayload } from '@/lib/types/customization';

interface Props {
  payload: AiSitePayload;
  shape?: 'hero' | 'story' | 'service' | 'gallery';
  label?: string;
  className?: string;
  /**
   * When true, the placeholder fills its parent (absolute inset-0). Used for
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

// Upper bound on placeholder height per shape, so wide containers
// (single-column mobile breakpoints, narrow viewports, etc.) can't
// blow the placeholder up to fill the screen.
const MAX_HEIGHT: Record<string, string> = {
  hero: 'max-h-[520px]',
  story: 'max-h-[460px]',
  service: 'max-h-[360px]',
  gallery: 'max-h-[400px]',
};

export function PhotoPlaceholder({
  payload,
  shape = 'hero',
  label,
  className,
  fill,
}: Props) {
  const aspect = fill ? '' : ASPECT[shape];
  const maxHeight = fill ? '' : MAX_HEIGHT[shape];
  const positioning = fill ? 'absolute inset-0' : 'w-full';

  return (
    <div
      className={[positioning, aspect, maxHeight, 'rounded-lg flex items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: payload.surfaceColor,
        border: `2px dashed ${payload.borderColor}`,
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
