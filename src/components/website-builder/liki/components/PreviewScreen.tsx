'use client';

/**
 * Preview after generation — same shape as the legacy wizard's PreviewScreen
 * (Wizard.tsx:1476). DynamicSiteRenderer is what production sites use, so
 * what the owner sees here is what gets published. Apply persists the theme
 * and redirects to /dashboard; Regenerate re-runs generate-variants with
 * the existing brief (skips brand-brief).
 */

import type { AiSitePayload } from '@/lib/types/customization';
import type { Business, Service } from '@/lib/types';
import { DynamicSiteRenderer } from '@/components/templates/ai/DynamicSiteRenderer';
import { publicSiteLabel } from '@/lib/utils';

type Props = {
  theme: AiSitePayload;
  subdomain: string;
  businessName: string;
  city: string;
  applying: boolean;
  applyError: string | null;
  onRegenerate: () => void;
  onApply: () => void;
};

export function PreviewScreen({
  theme,
  subdomain,
  businessName,
  city,
  applying,
  applyError,
  onRegenerate,
  onApply,
}: Props) {
  return (
    <div className="li-preview-host">
      <div className="li-preview-header">
        <h1 className="li-preview-title">
          Faqja jote është <em>gati</em>
        </h1>
        <div className="li-preview-actions">
          <button
            type="button"
            className="li-btn-ghost"
            style={{ marginLeft: 0 }}
            onClick={onRegenerate}
            disabled={applying}
          >
            ↻ Rigjenero
          </button>
          <button
            type="button"
            className="li-btn-primary"
            onClick={onApply}
            disabled={applying}
          >
            {applying && <span className="li-applying-spinner" aria-hidden />}
            <span>Përdor këtë →</span>
          </button>
        </div>
      </div>

      {applyError && <div className="li-preview-error">{applyError}</div>}

      <div className="li-preview-frame">
        <div className="li-preview-urlbar">
          <span className="li-preview-dot" />
          <span className="li-preview-dot" />
          <span className="li-preview-dot" />
          <div className="li-preview-url">{publicSiteLabel(subdomain)}</div>
        </div>
        <div className="li-preview-viewport">
          <DynamicSiteRenderer
            business={previewBusiness(businessName, city)}
            services={previewServicesFromTheme(theme)}
            hours={[]}
            payload={theme}
            previewMode
          />
        </div>
      </div>
    </div>
  );
}

function previewBusiness(businessName: string, city: string): Business {
  return {
    id: 'preview',
    name: businessName || 'Faqja jote',
    subdomain: 'preview',
    industry: 'other',
    template: '__ai__',
    templateId: '__ai__',
    phone: '',
    address: city,
    description: '',
    logoUrl: '',
    accentColor: '',
    socialLinks: { instagram: '', facebook: '', whatsapp: '' },
    gallerySections: {},
    createdAt: new Date().toISOString(),
  };
}

function previewServicesFromTheme(theme: AiSitePayload): Service[] {
  const servicesSection = theme.sections.find((s) => s.kind === 'services');
  if (!servicesSection || servicesSection.kind !== 'services') return [];
  const items = Array.isArray(servicesSection.items) ? servicesSection.items : [];
  return items
    .filter((it) => typeof it?.name === 'string' && it.name.trim().length > 0)
    .map((it, idx) => ({
      id: `preview-${idx}`,
      businessId: 'preview',
      name: String(it.name).trim(),
      description: typeof it.description === 'string' ? it.description : '',
      price: typeof it.price === 'number' ? it.price : 0,
      durationMinutes: typeof it.durationMinutes === 'number' ? it.durationMinutes : 30,
    }));
}
