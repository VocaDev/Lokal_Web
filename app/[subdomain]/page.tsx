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

  const [{ data: servicesData }, { data: hoursData }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", bizData.id).order("price", { ascending: true }),
    supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", bizData.id)
      .order("day_of_week", { ascending: true }),
  ]);

  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    subdomain: bizData.subdomain,
    industry: bizData.industry,
    template: bizData.template_id || "bold",
    templateId: bizData.template_id ?? undefined,
    phone: bizData.phone,
    address: bizData.address,
    description: bizData.description,
    logoUrl: bizData.logo_url,
    accentColor: bizData.accent_color,
    socialLinks: bizData.social_links ?? { instagram: "", facebook: "", whatsapp: "" },
    galleryImages: bizData.gallery_images ?? [],
    ownerId: bizData.owner_id,
    createdAt: bizData.created_at,
  };

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

  return <TemplateRouter business={business} services={services} hours={hours} />;
}