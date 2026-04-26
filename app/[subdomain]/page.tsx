import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Business, BusinessHours, Service } from "@/lib/types";
import type { AiSection, AiSitePayload } from "@/lib/types/customization";
import { normalizeIndustry } from "@/lib/industries";
import { hexToHsl, fontFamilyOf } from "@/lib/utils";
import TemplateRouter from "@/components/templates";
import { DynamicSiteRenderer } from "@/components/templates/ai/DynamicSiteRenderer";

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("name, description")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (!data) return { title: "Business Not Found" };
  return {
    title: `${data.name} — Book Online`,
    description: data.description ?? "",
  };
}

export default async function PublicBusinessPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // Explicit column allowlist — never `select('*')` on a publicly-readable
  // table. Anything we don't render to a public visitor stays out of the
  // payload (e.g. internal flags, AI setup data, owner_id), so future column
  // additions don't accidentally leak. RLS hardening follows in migration
  // 011; this is the application-layer half of decision (5) in demo-status.
  const { data: bizData } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      subdomain,
      industry,
      template_id,
      phone,
      address,
      description,
      logo_url,
      accent_color,
      social_links,
      gallery_images,
      tagline,
      founded_year,
      timezone,
      website_creation_method,
      created_at
    `)
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (!bizData) notFound();

  const [{ data: servicesData }, { data: hoursData }, { data: customData }, { data: galleryData }] =
    await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('business_id', bizData.id)
        .order('price', { ascending: true }),
      supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', bizData.id)
        .order('day_of_week', { ascending: true }),
      supabase.from('website_customization').select('*').eq('business_id', bizData.id).maybeSingle(),
      supabase.from('gallery_items').select('*').eq('business_id', bizData.id).order('display_order', { ascending: true }),
    ]);

  const galleryBySection: Record<string, string[]> = {};
  (galleryData || []).forEach((item) => {
    if (!item.image_url) return;
    const key = item.section_key || 'gallery';
    if (!galleryBySection[key]) galleryBySection[key] = [];
    galleryBySection[key].push(item.image_url as string);
  });

  const allGalleryImages = [
    ...(bizData.gallery_images || []),
    ...Object.values(galleryBySection).flat(),
  ];

  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    subdomain: bizData.subdomain,
    industry: normalizeIndustry(bizData.industry),
    template: bizData.template_id || 'bold',
    templateId: bizData.template_id ?? undefined,
    phone: bizData.phone,
    address: bizData.address,
    description: bizData.description,
    logoUrl: bizData.logo_url,
    accentColor: customData?.primary_color || bizData.accent_color,
    socialLinks: bizData.social_links ?? { instagram: '', facebook: '', whatsapp: '' },
    galleryImages: allGalleryImages,
    gallerySections: galleryBySection,
    // ownerId omitted — public visitors don't need to know who owns the business.
    createdAt: bizData.created_at,
    websiteCreationMethod: bizData.website_creation_method,
    tagline: bizData.tagline ?? undefined,
    foundedYear: bizData.founded_year ?? undefined,
    timezone: bizData.timezone ?? 'Europe/Belgrade',
    showTestimonials: customData?.show_testimonials ?? true,
    showTeam: customData?.show_team ?? true,
    showContact: customData?.show_contact ?? true,
    heroHeight: customData?.hero_height || 'medium',
    cardStyle: customData?.card_style || 'minimal',
    heroHeadline: customData?.hero_headline || undefined,
    heroSubheadline: customData?.hero_subheadline || undefined,
    aboutCopy: customData?.about_copy || undefined,
    ctaPrimary: customData?.cta_primary || undefined,
    ctaSecondary: customData?.cta_secondary || undefined,
  };

  // Build inline theme overrides as shadcn-named CSS vars in HSL component
  // format. Mirrors src/lib/customization/ThemeProvider.tsx.applyThemeToDocument.
  // DB stores hex; we convert at this boundary so shadcn primitives + every
  // template (which use bg-background, text-foreground, etc.) pick up tenant
  // theming on first paint, no client-side hydration required.
  const themeStyles: React.CSSProperties = {};
  if (customData) {
    const setVar = (name: string, hex: string | null | undefined) => {
      if (!hex) return;
      const hsl = hexToHsl(hex);
      if (hsl) (themeStyles as Record<string, string>)[name] = hsl;
    };
    setVar('--primary', customData.primary_color);
    setVar('--accent', customData.accent_color);
    setVar('--background', customData.bg_color);
    setVar('--card', customData.surface_color);
    setVar('--popover', customData.surface_color);
    setVar('--muted', customData.surface_color);
    setVar('--foreground', customData.text_color);
    setVar('--card-foreground', customData.text_color);
    setVar('--popover-foreground', customData.text_color);
    setVar('--secondary-foreground', customData.text_color);
    setVar('--muted-foreground', customData.muted_text_color);
    setVar('--border', customData.border_color);
    setVar('--input', customData.border_color);
    setVar('--ring', customData.primary_color);

    const headingFamily = fontFamilyOf(customData.heading_font);
    if (headingFamily) (themeStyles as Record<string, string>)['--font-heading'] = headingFamily;
    const bodyFamily = fontFamilyOf(customData.body_font);
    if (bodyFamily) (themeStyles as Record<string, string>)['--font-sans'] = bodyFamily;

    if (customData.hero_height) (themeStyles as Record<string, string>)['--hero-height'] = customData.hero_height;
    if (customData.card_style) (themeStyles as Record<string, string>)['--card-style'] = customData.card_style;
  }

  const services: Service[] = (servicesData ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: row.price,
    durationMinutes: row.duration_minutes,
  }));

  const hours: BusinessHours[] = (hoursData ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    isOpen: row.is_open,
    openTime: row.open_time,
    closeTime: row.close_time,
  }));

  // AI path — businesses created via the wizard store a parametric sections[]
  // payload in customization.ai_sections. Render via DynamicSiteRenderer; the
  // existing TemplateRouter is bypassed entirely. Templates path is unchanged.
  const aiSections = customData?.ai_sections as AiSection[] | null | undefined;
  if (
    bizData.website_creation_method === 'ai_generated' &&
    Array.isArray(aiSections) &&
    aiSections.length > 0
  ) {
    const payload: AiSitePayload = {
      sections: aiSections,
      primaryColor: customData!.primary_color,
      accentColor: customData!.accent_color,
      bgColor: customData!.bg_color,
      surfaceColor: customData!.surface_color,
      textColor: customData!.text_color,
      mutedTextColor: customData!.muted_text_color,
      borderColor: customData!.border_color,
      headingFont: customData!.heading_font,
      bodyFont: customData!.body_font,
      metaDescription: customData!.meta_description ?? '',
    };
    return (
      <div style={themeStyles} className="theme-customized min-h-screen">
        <DynamicSiteRenderer
          business={JSON.parse(JSON.stringify(business))}
          services={JSON.parse(JSON.stringify(services))}
          hours={JSON.parse(JSON.stringify(hours))}
          payload={JSON.parse(JSON.stringify(payload))}
        />
      </div>
    );
  }

  return (
    <div style={themeStyles} className="theme-customized min-h-screen">
      <TemplateRouter
        business={JSON.parse(JSON.stringify(business))}
        services={JSON.parse(JSON.stringify(services))}
        hours={JSON.parse(JSON.stringify(hours))}
      />
    </div>
  );
}