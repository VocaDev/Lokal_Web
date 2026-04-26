"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { publicSiteHref, publicSiteLabel } from '@/lib/utils';

export type Variant = {
  variantName: string;
  directionRationale: string;
  templateId: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  mutedTextColor: string;
  headingFont: string;
  bodyFont: string;
  heroHeadline: string;
  heroSubheadline: string;
  ctaPrimary: string;
  [key: string]: any;
};

const FONT_MAP: Record<string, string> = {
  'dm-sans': "'DM Sans', sans-serif",
  'playfair': "'Playfair Display', serif",
  'inter': "'Inter', sans-serif",
  'poppins': "'Poppins', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
};

type Props = {
  variants: Variant[];
  businessId: string;
  onRegenerate: () => void;
};

export default function VariantPicker({ variants, businessId, onRegenerate }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [publishedSubdomain, setPublishedSubdomain] = useState<string | null>(null);

  const apply = async (variant: Variant, idx: number) => {
    setSelectedIdx(idx);
    setApplyingIdx(idx);
    try {
      const res = await fetch('/api/apply-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, theme: variant }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to publish');
      }
      setPublishedSubdomain(body.subdomain ?? null);
      setPublished(true);
      // No auto-redirect — user dismisses via the modal buttons.
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
      setApplyingIdx(null);
      setSelectedIdx(null);
    }
  };

  if (published) {
    const siteUrl = publishedSubdomain ? publicSiteHref(publishedSubdomain) : null;
    const siteLabel = publishedSubdomain ? publicSiteLabel(publishedSubdomain) : 'Your website is live';
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-4xl animate-in zoom-in duration-500">
              ✓
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 opacity-40 blur-2xl animate-pulse" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-br from-blue-400 to-violet-500 bg-clip-text text-transparent">
            Your website is live
          </h2>
          <p className="text-[#8888aa] break-all">{siteLabel}</p>
          <div className="flex gap-3 justify-center pt-4 flex-wrap">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold rounded-lg px-6 py-3 hover:opacity-90 transition"
              >
                Open my website →
              </a>
            )}
            <button
              onClick={() => router.push('/dashboard/customization')}
              className="border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] font-medium rounded-lg px-6 py-3 hover:bg-[rgba(255,255,255,0.04)] transition"
            >
              Customize more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4 md:px-6 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-3 animate-in fade-in slide-in-from-top-2 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-br from-blue-400 to-violet-500 bg-clip-text text-transparent">
              Meet your website
            </span>
          </h1>
          <p className="text-[#8888aa] text-lg">Two directions from the same strategy. Pick the one that fits.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {variants.map((v, idx) => (
            <div
              key={idx}
              className={`
                bg-[#151522] rounded-2xl overflow-hidden transition-all duration-500
                animate-in fade-in slide-in-from-bottom-4
                ${selectedIdx !== null && selectedIdx !== idx ? 'opacity-30 scale-95' : ''}
                ${selectedIdx === idx ? 'ring-2 ring-blue-400 scale-[1.02]' : 'border border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.3)] hover:-translate-y-1'}
              `}
              style={{ animationDelay: `${idx * 200}ms` }}
            >
              <div
                className="h-72 md:h-80 p-8 flex flex-col justify-center items-start relative overflow-hidden"
                style={{ backgroundColor: v.bgColor }}
              >
                <div
                  className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-40 blur-3xl -translate-y-1/2 translate-x-1/4"
                  style={{ background: `linear-gradient(135deg, ${v.primaryColor}, ${v.accentColor})` }}
                />
                <div className="relative z-10 space-y-4 max-w-md">
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${v.primaryColor}25`,
                      color: v.primaryColor,
                      fontFamily: FONT_MAP[v.bodyFont],
                    }}
                  >
                    {v.variantName}
                  </div>
                  <h2
                    className="text-2xl md:text-3xl font-bold leading-tight"
                    style={{ color: v.textColor, fontFamily: FONT_MAP[v.headingFont] }}
                  >
                    {v.heroHeadline}
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: v.mutedTextColor, fontFamily: FONT_MAP[v.bodyFont] }}
                  >
                    {v.heroSubheadline}
                  </p>
                  <button
                    className="text-sm font-semibold px-5 py-2.5 rounded-lg"
                    style={{
                      backgroundColor: v.primaryColor,
                      color: v.bgColor,
                      fontFamily: FONT_MAP[v.bodyFont],
                    }}
                  >
                    {v.ctaPrimary}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Why this direction</div>
                  <p className="text-[#8888aa] text-sm italic">&ldquo;{v.directionRationale}&rdquo;</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: v.primaryColor }} />
                    <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: v.accentColor }} />
                    <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: v.bgColor }} />
                  </div>
                  <div className="text-[#5a5a7a] text-xs">{v.headingFont} · {v.templateId}</div>
                </div>

                <button
                  disabled={applyingIdx !== null}
                  onClick={() => apply(v, idx)}
                  className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold rounded-lg px-5 py-3 hover:opacity-90 transition disabled:opacity-50"
                >
                  {applyingIdx === idx ? 'Publishing...' : 'Choose this design'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={onRegenerate}
            disabled={applyingIdx !== null}
            className="text-[#8888aa] text-sm hover:text-blue-400 transition disabled:opacity-50"
          >
            Neither fits? Generate two more →
          </button>
        </div>
      </div>
    </div>
  );
}
