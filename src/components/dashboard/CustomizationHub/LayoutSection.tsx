'use client';

import { WebsiteCustomization } from '@/lib/types';

interface LayoutSectionProps {
  formData: Partial<WebsiteCustomization>;
  onChange: (field: keyof WebsiteCustomization, value: any) => void;
}

export default function LayoutSection({
  formData,
  onChange,
}: LayoutSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-[#e8e8f0] mb-3">
          Hero Section Height
        </label>
        <div className="flex gap-3">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => onChange('hero_height', size)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                formData.hero_height === size
                  ? 'bg-[#4f8ef7] text-white'
                  : 'bg-[#0a0a0f] border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] hover:border-[#4f8ef7]'
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#e8e8f0] mb-3">
          Card Style
        </label>
        <div className="flex gap-3">
          {(['minimal', 'rounded', 'bordered'] as const).map((style) => (
            <button
              key={style}
              onClick={() => onChange('card_style', style)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                formData.card_style === style
                  ? 'bg-[#4f8ef7] text-white'
                  : 'bg-[#0a0a0f] border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] hover:border-[#4f8ef7]'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-[rgba(120,120,255,0.12)]">
        <label className="block text-sm font-semibold text-[#e8e8f0] mb-4">
          Show / Hide Sections
        </label>

        <div className="space-y-3">
          {[
            { key: 'show_testimonials', label: 'Testimonials / Reviews' },
            { key: 'show_team', label: 'Team Members' },
            { key: 'show_contact', label: 'Contact Section' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData[key as keyof WebsiteCustomization] as boolean || false}
                onChange={(e) =>
                  onChange(key as keyof WebsiteCustomization, e.target.checked)
                }
                className="w-4 h-4 rounded accent-[#4f8ef7]"
              />
              <span className="text-sm text-[#e8e8f0]">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
