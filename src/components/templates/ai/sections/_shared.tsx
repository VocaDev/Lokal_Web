import type { AiSitePayload } from '@/lib/types/customization';

export function headingFontFamily(font: string | undefined): string {
  switch (font) {
    case 'dm-sans': return '"DM Sans", sans-serif';
    case 'playfair': return '"Playfair Display", Georgia, serif';
    case 'inter': return 'Inter, sans-serif';
    case 'poppins': return 'Poppins, sans-serif';
    case 'space-grotesk': return '"Space Grotesk", sans-serif';
    default: return 'Inter, sans-serif';
  }
}

export function headingStyle(payload: AiSitePayload): React.CSSProperties {
  return {
    fontFamily: headingFontFamily(payload.headingFont),
    color: payload.textColor,
  };
}

export function ctaButtonStyle(payload: AiSitePayload, variant: 'primary' | 'secondary' = 'primary'): React.CSSProperties {
  if (variant === 'primary') {
    return {
      background: payload.primaryColor,
      color: payload.bgColor,
      border: `1px solid ${payload.primaryColor}`,
    };
  }
  return {
    background: 'transparent',
    color: payload.textColor,
    border: `1px solid ${payload.borderColor}`,
  };
}

export const SECTION_PADDING_X = 'px-6 md:px-12';
export const SECTION_PADDING_Y = 'py-16 md:py-24';
