import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a hex color (`#rrggbb`, `#rgb`, or rgba(...)) to shadcn-style HSL
 * components — e.g. `220 91% 58%`. Returns null if the input can't be parsed,
 * so callers can fall back to a token default.
 *
 * Used at two boundaries: ThemeProvider.applyThemeToDocument() (browser) and
 * the SSR themeStyles builder in app/[subdomain]/page.tsx. DB storage stays
 * hex; conversion is runtime only.
 */
export function hexToHsl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  let r: number, g: number, b: number;

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return null;
    }
  } else if (trimmed.startsWith("rgb")) {
    const m = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;
    r = parseInt(m[1], 10);
    g = parseInt(m[2], 10);
    b = parseInt(m[3], 10);
  } else {
    return null;
  }

  if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Whether the request host is the main app domain (vs. a tenant subdomain).
 * Used by middleware.ts and app/layout.tsx — keep them in sync via this helper.
 */
export function isMainDomain(host: string): boolean {
  if (!host) return true;
  return (
    host === "lokal-web-one.vercel.app" ||
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("192.168.")
  );
}

/**
 * Map a customization heading_font / body_font enum value to a CSS font-family
 * string suitable for assigning to --font-heading / --font-sans.
 */
const FONT_FAMILY_MAP: Record<string, string> = {
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  geist: "'Geist', system-ui, sans-serif",
};

export function fontFamilyOf(key: string | undefined | null): string | null {
  if (!key) return null;
  return FONT_FAMILY_MAP[key] ?? null;
}
