'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { WebsiteCustomization, GalleryItem } from '@/lib/types';

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

// Helper: Apply theme CSS variables to document
export function applyThemeToDocument(customization: WebsiteCustomization) {
  const root = document.documentElement;
  
  root.style.setProperty('--primary-color', customization.primary_color);
  root.style.setProperty('--accent-color', customization.accent_color);
  root.style.setProperty('--text-color', customization.text_color);
  root.style.setProperty('--muted-text-color', customization.muted_text_color);
  root.style.setProperty('--bg-color', customization.bg_color);
  root.style.setProperty('--surface-color', customization.surface_color);
  root.style.setProperty('--border-color', customization.border_color);
  
  root.style.setProperty('--heading-font', customization.heading_font);
  root.style.setProperty('--body-font', customization.body_font);
  
  root.style.setProperty('--hero-height', customization.hero_height);
  root.style.setProperty('--card-style', customization.card_style);

  // Also set CSS classes for responsive font loading
  document.documentElement.setAttribute('data-heading-font', customization.heading_font);
  document.documentElement.setAttribute('data-body-font', customization.body_font);
}
