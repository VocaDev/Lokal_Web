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
 * Display label for a tenant site, shown in UI labels.
 * Always returns the production-aspirational form: "subdomain.lokalweb.com".
 * For DEMO/staging on vercel.app, the displayed text and the actual link
 * target are intentionally different.
 */
export function publicSiteLabel(subdomain: string): string {
  return `${subdomain}.lokalweb.com`;
}

/**
 * Functional href for a tenant site. Always path-based on the current origin
 * so it works on *.vercel.app (no wildcard subdomains) AND on a future
 * custom domain (where middleware rewrites paths anyway).
 */
export function publicSiteHref(subdomain: string): string {
  return `/${subdomain}`;
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

// ----------------------------------------------------------------
// Color contrast (WCAG)
//
// Sonnet occasionally generates a textColor whose luminance is too close to
// bgColor — cream-on-cream is the canonical disaster. The post-processor in
// app/api/generate-variants/route.ts uses these helpers to detect that case
// and force-correct the textColor before the theme is returned to the client.
// ----------------------------------------------------------------

function parseHex6(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Relative luminance of a hex color, per WCAG 2.x. Returns 0..1.
 * Returns 0 for unparseable input — caller treats it as worst-case dark.
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex6(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => v / 255) as [number, number, number];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio between two hex colors. Returns 1..21.
 * 4.5 is the AA threshold for normal-sized body text.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * If textColor and bgColor have insufficient contrast (< 4.5), return a
 * corrected near-black or near-white textColor based on bg luminance.
 * Otherwise return the original textColor unchanged.
 */
export function ensureReadableTextColor(textColor: string, bgColor: string): string {
  if (contrastRatio(textColor, bgColor) >= 4.5) return textColor;
  return relativeLuminance(bgColor) > 0.5 ? '#0a0a0a' : '#fafafa';
}
