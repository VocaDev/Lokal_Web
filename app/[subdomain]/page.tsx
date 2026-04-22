import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Business, BusinessHours, Service } from "@/lib/types";
import TemplateRouter from "@/components/templates";

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

  const { data: bizData } = await supabase
    .from("businesses")
    .select("*")
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

  const customGallery = (galleryData || [])
    .filter((v) => v.image_url)
    .map((v) => v.image_url as string);
  const allGalleryImages = [...(bizData.gallery_images || []), ...customGallery];

  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    subdomain: bizData.subdomain,
    industry: bizData.industry,
    template: bizData.template_id || 'bold',
    templateId: bizData.template_id ?? undefined,
    phone: bizData.phone,
    address: bizData.address,
    description: bizData.description,
    logoUrl: bizData.logo_url,
    accentColor: customData?.primary_color || bizData.accent_color,
    socialLinks: bizData.social_links ?? { instagram: '', facebook: '', whatsapp: '' },
    galleryImages: allGalleryImages,
    ownerId: bizData.owner_id,
    createdAt: bizData.created_at,
    websiteCreationMethod: bizData.website_creation_method,
    customWebsiteHtml: bizData.custom_website_html,
    showTestimonials: customData?.show_testimonials ?? true,
    showTeam: customData?.show_team ?? true,
    showContact: customData?.show_contact ?? true,
    heroHeight: customData?.hero_height || 'medium',
    cardStyle: customData?.card_style || 'minimal',
  };

  const themeStyles = customData
    ? {
        '--primary-color': customData.primary_color,
        '--accent-color': customData.accent_color,
        '--text-color': customData.text_color,
        '--muted-text-color': customData.muted_text_color,
        '--bg-color': customData.bg_color,
        '--surface-color': customData.surface_color,
        '--border-color': customData.border_color,
        '--heading-font': customData.heading_font === 'dm-sans' ? 'DM Sans' :
                         customData.heading_font === 'playfair' ? 'Playfair Display' :
                         customData.heading_font.charAt(0).toUpperCase() + customData.heading_font.slice(1),
        '--body-font': customData.body_font === 'dm-sans' ? 'DM Sans' :
                       customData.body_font === 'playfair' ? 'Playfair Display' :
                       customData.body_font.charAt(0).toUpperCase() + customData.body_font.slice(1),
      } as React.CSSProperties
    : {};

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