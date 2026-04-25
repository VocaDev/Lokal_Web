'use client';

import { WebsiteCustomization } from '@/lib/types';

interface TypographySectionProps {
  formData: Partial<WebsiteCustomization>;
  onChange: (field: keyof WebsiteCustomization, value: any) => void;
}

const fontOptions = [
  { value: 'dm-sans', label: 'DM Sans (Default)' },
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'playfair', label: 'Playfair Display' },
];

export default function TypographySection({
  formData,
  onChange,
}: TypographySectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Heading Font
        </label>
        <select
          value={formData.heading_font || 'dm-sans'}
          onChange={(e) => onChange('heading_font', e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-2">
          Used for all headings and titles
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Body Font
        </label>
        <select
          value={formData.body_font || 'dm-sans'}
          onChange={(e) => onChange('body_font', e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-2">
          Used for body text, descriptions, and paragraphs
        </p>
      </div>

      {/* Font Preview */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Font Preview:</p>
        <div className="space-y-2">
          <p
            className="text-xl font-bold"
            style={{ fontFamily: `${formData.heading_font || 'dm-sans'}, sans-serif` }}
          >
            This is a Heading
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: `${formData.body_font || 'dm-sans'}, sans-serif` }}
          >
            This is body text. It looks like this with your selected fonts.
          </p>
        </div>
      </div>
    </div>
  );
}
