'use client';

import { useState } from 'react';
import { WebsiteCustomization } from '@/lib/types';
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

  // Apply colors to preview
  const previewStyle = {
    '--primary-color': customization.primary_color || '#4f8ef7',
    '--accent-color': customization.accent_color || '#8b5cf6',
    '--text-color': customization.text_color || '#e8e8f0',
    '--muted-text-color': customization.muted_text_color || '#8888aa',
    '--bg-color': customization.bg_color || '#0a0a0f',
    '--surface-color': customization.surface_color || '#151522',
  } as React.CSSProperties;

  return (
    <div className="space-y-6 flex flex-col items-center">
      {/* Device Switcher */}
      <div className="flex gap-2 p-1 bg-[#151522] rounded-lg border border-[rgba(120,120,255,0.12)]">
        <Button
          onClick={() => setDevice('desktop')}
          variant="ghost"
          size="sm"
          className={`px-4 rounded-md transition-all ${
            device === 'desktop'
              ? 'bg-[#4f8ef7] text-white'
              : 'text-[#8888aa] hover:text-[#e8e8f0]'
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
              ? 'bg-[#4f8ef7] text-white'
              : 'text-[#8888aa] hover:text-[#e8e8f0]'
          }`}
        >
          <Phone className="w-4 h-4 mr-2" />
          Mobile
        </Button>
      </div>

      {/* Preview Container Wrapper */}
      <div className="w-full flex justify-center bg-[#05050a] p-4 lg:p-8 rounded-2xl border border-[rgba(120,120,255,0.06)] overflow-auto max-h-[800px]">
        <div
          className={`mx-auto ${containerWidth} transition-all duration-300 bg-[var(--bg-color)] rounded-xl border border-[rgba(120,120,255,0.22)] overflow-hidden shadow-2xl origin-top`}
          style={previewStyle}
        >
          {/* Mock Website Content */}
          <div className="min-h-screen flex flex-col font-sans">
            {/* Navbar */}
            <header className="bg-[var(--surface-color)] border-b border-[rgba(120,120,255,0.12)] px-6 py-4 flex justify-between items-center z-10 sticky top-0">
              <div className="text-lg font-bold text-[var(--text-color)]">
                Your Business
              </div>
              <div className="space-x-6 hidden md:flex">
                <a className="text-sm font-medium text-[var(--muted-text-color)] hover:text-[var(--text-color)] transition-colors">
                  Services
                </a>
                <a className="text-sm font-medium text-[var(--muted-text-color)] hover:text-[var(--text-color)] transition-colors">
                  About
                </a>
                <a className="text-sm font-medium text-[var(--muted-text-color)] hover:text-[var(--text-color)] transition-colors">
                  Contact
                </a>
              </div>
              <button 
                className="md:hidden text-[var(--text-color)]"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </header>

            <main>
              {/* Hero Section */}
              <PreviewHero customization={customization} />

              {/* Services Section */}
              <PreviewServices customization={customization} />
              
              {/* Section Visibility Previews */}
              {customization.show_testimonials && (
                <section className="px-6 py-16 bg-[var(--surface-color)]/50 text-center">
                  <h2 className="text-2xl font-bold text-[var(--text-color)] mb-4">Reviews</h2>
                  <p className="text-[var(--muted-text-color)] italic max-w-lg mx-auto">
                    "Amazing service, highly recommend to everyone in the area!"
                  </p>
                </section>
              )}
            </main>

            {/* Footer */}
            <footer className="bg-[var(--surface-color)] border-t border-[rgba(120,120,255,0.12)] px-6 py-12 mt-auto text-center">
              <p className="text-sm font-medium text-[var(--text-color)]">Your Business</p>
              <div className="mt-4 flex justify-center space-x-4">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/20" />
                <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/20" />
                <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/20" />
              </div>
              <p className="mt-8 text-xs text-[var(--muted-text-color)]">
                © {new Date().getFullYear()} Your Business. All rights reserved.
              </p>
            </footer>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#151522] border border-[rgba(120,120,255,0.12)] px-4 py-2 rounded-full shadow-lg">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <p className="text-xs text-[#8888aa]">
          Live Preview: Changes appear instantly
        </p>
      </div>
    </div>
  );
}
