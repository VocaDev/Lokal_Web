'use client';

import { WebsiteCustomization } from '@/lib/types';
import ColorPicker from './ColorPicker';

interface ColorSectionProps {
  formData: Partial<WebsiteCustomization>;
  onChange: (field: keyof WebsiteCustomization, value: any) => void;
}

export default function ColorSection({ formData, onChange }: ColorSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Primary Color
        </label>
        <ColorPicker
          color={formData.primary_color || '#4f8ef7'}
          onChange={(color) => onChange('primary_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Used for buttons, highlights, and main accents
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Accent Color
        </label>
        <ColorPicker
          color={formData.accent_color || '#8b5cf6'}
          onChange={(color) => onChange('accent_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Secondary accent for gradients and special elements
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Text Color
        </label>
        <ColorPicker
          color={formData.text_color || '#e8e8f0'}
          onChange={(color) => onChange('text_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Primary text and headings
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Muted Text Color
        </label>
        <ColorPicker
          color={formData.muted_text_color || '#8888aa'}
          onChange={(color) => onChange('muted_text_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Secondary text, descriptions, captions
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Background Color
        </label>
        <ColorPicker
          color={formData.bg_color || '#0a0a0f'}
          onChange={(color) => onChange('bg_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Page background
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Surface Color (Cards)
        </label>
        <ColorPicker
          color={formData.surface_color || '#151522'}
          onChange={(color) => onChange('surface_color', color)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Card and container backgrounds
        </p>
      </div>
    </div>
  );
}
