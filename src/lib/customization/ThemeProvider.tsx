'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { WebsiteCustomization, GalleryItem } from '@/lib/types';
import { hexToHsl, fontFamilyOf } from '@/lib/utils';

interface ThemeContextType {
  customization: WebsiteCustomization | null;
  galleryItems: GalleryItem[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  businessId,
}: {
  children: ReactNode;
  businessId: string;
}) {
  const [customization, setCustomization] = useState<WebsiteCustomization | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch customization
      const customRes = await fetch(`/api/customization/${businessId}`);
      if (!customRes.ok) throw new Error('Failed to fetch customization');
      const customData = await customRes.json();
      setCustomization(customData);

      // Fetch gallery items
      const galleryRes = await fetch(`/api/gallery/${businessId}`);
      if (!galleryRes.ok) throw new Error('Failed to fetch gallery');
      const galleryData = await galleryRes.json();
      setGalleryItems(galleryData);

      // Apply theme to document
      applyThemeToDocument(customData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  // Revalidate every 5 seconds (for live preview)
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [businessId]);

  return (
    <ThemeContext.Provider
      value={{
        customization,
        galleryItems,
        isLoading,
        error,
        refetch: fetchData,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * Apply theme CSS variables to <html>. Writes shadcn-named tokens so every
 * shadcn UI primitive picks up tenant customization for free. DB storage stays
 * hex; we convert to HSL components at this boundary (and again in the SSR
 * builder in app/[subdomain]/page.tsx). If a hex value can't be parsed we just
 * skip the property and let the static :root token win.
 */
export function applyThemeToDocument(customization: WebsiteCustomization) {
  const root = document.documentElement;

  const set = (name: string, hex: string | null | undefined) => {
    if (!hex) return;
    const hsl = hexToHsl(hex);
    if (hsl) root.style.setProperty(name, hsl);
  };

  // Brand
  set('--primary', customization.primary_color);
  set('--accent', customization.accent_color);

  // Surfaces — surface_color is the single tenant input; fan out to the three
  // shadcn surface tokens so cards/popovers/muted all stay coherent.
  set('--background', customization.bg_color);
  set('--card', customization.surface_color);
  set('--popover', customization.surface_color);
  set('--muted', customization.surface_color);

  // Text — text_color is the single tenant input; fan out to all *-foreground
  // tokens that pair with the surfaces above.
  set('--foreground', customization.text_color);
  set('--card-foreground', customization.text_color);
  set('--popover-foreground', customization.text_color);
  set('--secondary-foreground', customization.text_color);
  set('--muted-foreground', customization.muted_text_color);

  // Lines
  set('--border', customization.border_color);
  set('--input', customization.border_color);

  // Focus ring follows primary
  set('--ring', customization.primary_color);

  // Typography — translate enum to a CSS font-family string
  const headingFamily = fontFamilyOf(customization.heading_font);
  if (headingFamily) root.style.setProperty('--font-heading', headingFamily);
  const bodyFamily = fontFamilyOf(customization.body_font);
  if (bodyFamily) root.style.setProperty('--font-sans', bodyFamily);

  // Layout knobs are kept under their existing names; only colors+fonts moved
  // to the shadcn namespace because only those have shadcn equivalents.
  root.style.setProperty('--hero-height', customization.hero_height);
  root.style.setProperty('--card-style', customization.card_style);

  // Font-family attributes (consumers may key off them via [data-*])
  root.setAttribute('data-heading-font', customization.heading_font);
  root.setAttribute('data-body-font', customization.body_font);
}
