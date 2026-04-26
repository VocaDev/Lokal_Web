'use client';

import { useState } from 'react';
import { WebsiteCustomization } from '@/lib/types';
import { hexToHsl, fontFamilyOf } from '@/lib/utils';
import PreviewHero from './PreviewHero';
import PreviewServices from './PreviewServices';
import { Button } from '@/components/ui/button';
import { Monitor, Phone } from 'lucide-react';

interface PreviewPaneProps {
  customization: Partial<WebsiteCustomization>;
  businessId: string;
}

type DeviceType = 'desktop' | 'mobile';

export default function PreviewPane({
  customization,
  businessId,
}: PreviewPaneProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');

  const containerWidth =
    device === 'desktop' ? 'w-full max-w-5xl' : 'w-[375px]';

  /*
   * Scoped theme overrides — same shadcn names + HSL component format as
   * ThemeProvider.applyThemeToDocument() and the SSR themeStyles builder. Set
   * on a div so descendants resolve `hsl(var(--primary))` etc. against the
   * tenant's hex inputs (converted at runtime). The Hub UI itself sits OUTSIDE
   * this div and continues to use the chrome's own tokens.
   */
  const previewStyle: React.CSSProperties = {};
  const setVar = (name: string, hex: string | null | undefined) => {
    if (!hex) return;
    const hsl = hexToHsl(hex);
    if (hsl) (previewStyle as Record<string, string>)[name] = hsl;
  };
  setVar('--primary', customization.primary_color || '#1d4ed8');
  setVar('--accent', customization.accent_color || '#8b5cf6');
  setVar('--background', customization.bg_color || '#0a0a0f');
  setVar('--card', customization.surface_color || '#151522');
  setVar('--popover', customization.surface_color || '#151522');
  setVar('--muted', customization.surface_color || '#151522');
  setVar('--foreground', customization.text_color || '#e8e8f0');
  setVar('--card-foreground', customization.text_color || '#e8e8f0');
  setVar('--popover-foreground', customization.text_color || '#e8e8f0');
  setVar('--muted-foreground', customization.muted_text_color || '#8888aa');
  setVar('--border', customization.border_color || '#1c1c2c');
  const bodyFont = fontFamilyOf(customization.body_font);
  if (bodyFont) (previewStyle as Record<string, string>)['--font-sans'] = bodyFont;
  const headingFont = fontFamilyOf(customization.heading_font);
  if (headingFont) (previewStyle as Record<string, string>)['--font-heading'] = headingFont;

  return (
    <div className="space-y-6 flex flex-col items-center">
      {/* Device Switcher — chrome UI, uses chrome tokens */}
      <div className="flex gap-2 p-1 bg-card rounded-lg border border-border">
        <Button
          onClick={() => setDevice('desktop')}
          variant="ghost"
          size="sm"
          className={`px-4 rounded-md transition-all ${
            device === 'desktop'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Monitor className="w-4 h-4 mr-2" />
          Desktop
        </Button>
        <Button
          onClick={() => setDevice('mobile')}
          variant="ghost"
          size="sm"
          className={`px-4 rounded-md transition-all ${
            device === 'mobile'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-4 h-4 mr-2" />
          Mobile
        </Button>
      </div>

      {/* Preview Container — scope overrides to children */}
      <div className="w-full flex justify-center bg-background/60 p-4 lg:p-8 rounded-2xl border border-border overflow-auto max-h-[800px]">
        <div
          className={`mx-auto ${containerWidth} transition-all duration-300 bg-background rounded-xl border border-border overflow-hidden shadow-2xl origin-top`}
          style={previewStyle}
        >
          {/* Mock Website Content — uses scoped tokens */}
          <div className="min-h-screen flex flex-col font-sans">
            <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center z-10 sticky top-0">
              <div className="text-lg font-bold text-foreground">
                Your Business
              </div>
              <div className="space-x-6 hidden md:flex">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Services
                </a>
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  About
                </a>
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </div>
              <button
                className="md:hidden text-foreground"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </header>

            <main>
              <PreviewHero customization={customization} />
              <PreviewServices customization={customization} />
            </main>

            <footer className="bg-card border-t border-border px-6 py-12 mt-auto text-center">
              <p className="text-sm font-medium text-foreground">Your Business</p>
              <div className="mt-4 flex justify-center space-x-4">
                <div className="w-8 h-8 rounded-full bg-primary/20" />
                <div className="w-8 h-8 rounded-full bg-primary/20" />
                <div className="w-8 h-8 rounded-full bg-primary/20" />
              </div>
              <p className="mt-8 text-xs text-muted-foreground">
                © {new Date().getFullYear()} Your Business. All rights reserved.
              </p>
            </footer>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-full shadow-lg">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <p className="text-xs text-muted-foreground">
          Live Preview: Changes appear instantly
        </p>
      </div>
    </div>
  );
}
