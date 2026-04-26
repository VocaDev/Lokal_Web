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

export function PhotoPlaceholder({
  payload,
  shape = 'hero',
  label,
  className,
  fill,
}: Props) {
  const aspect = fill ? '' : ASPECT[shape];
  const positioning = fill ? 'absolute inset-0' : 'w-full';

  return (
    <div
      className={[positioning, aspect, 'rounded-lg flex items-center justify-center', className]
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
