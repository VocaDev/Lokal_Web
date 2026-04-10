import { createClient } from "@/lib/supabase/client";
import { Business, Service, Booking, BusinessHours } from "@/lib/types";

// 🔄 helper (nëse e ke tashmë, përdore tënden)
function fromSnakeBusiness(data: any): Business {
  return {
    id: data.id ?? "",
    name: data.name ?? "",
    subdomain: data.subdomain ?? "",
    industry: (data.industry as any) || "barbershop", // Ensure valid IndustryType
    template: data.template || "classic",
    phone: data.phone ?? "",
    address: data.address ?? "",
    description: data.description ?? "",
    logoUrl: data.logo_url ?? "",
    accentColor: data.accent_color ?? "#000000",
    socialLinks: data.social_links || { instagram: "", facebook: "", whatsapp: "" },
    galleryImages: data.gallery_images || [],
    ownerId: data.owner_id,
    createdAt: data.created_at ?? new Date().toISOString(),
    websiteCreationMethod: data.website_creation_method,
    customWebsiteHtml: data.custom_website_html,
    aiSetupData: data.ai_setup_data,
    websiteBuilderCompleted: data.website_builder_completed ?? false,
  };
}

// ✅ GET CURRENT BUSINESS (FIXED)
export async function getCurrentBusiness(): Promise<Business | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 🔥 1. kontrollo localStorage (business i zgjedhur)
  if (typeof window !== "undefined") {
    const storedId = localStorage.getItem("lokalweb_current");

    if (storedId) {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", storedId)
        .eq("owner_id", user.id) // 🔥 VERIFY OWNERSHIP
        .maybeSingle();

      if (data) return fromSnakeBusiness(data);
    }
  }

  // 🔥 2. merr të gjitha bizneset e user-it
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[Supabase] getCurrentBusiness error:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.log("[LokalWeb] No businesses found for user:", user.email);
    return null;
  }

  console.log(`[LokalWeb] Found ${data.length} businesses for ${user.email}. Choosing latest:`, data[0].name);

  // 🔥 3. fallback → përdor të parin dhe ruaje
  const business = data[0];

  if (typeof window !== "undefined") {
    localStorage.setItem("lokalweb_current", business.id);
  }

  return fromSnakeBusiness(business);
}

// ✅ SET CURRENT BUSINESS (manual switch)
export function setCurrentBusiness(businessId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("lokalweb_current", businessId);
  }
}

// ✅ CLEAR (logout / reset)
export function clearCurrentBusiness() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("lokalweb_current");
  }
}

// ✅ Subdomain Availability
export async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();
  return !data;
}

// ✅ Register Business
export async function registerBusiness(form: any): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      name: form.name,
      subdomain: form.subdomain,
      industry: form.industry,
      template: form.template || "classic",
      phone: form.phone,
      address: form.address,
      owner_id: form.ownerId,
      accent_color: form.accentColor,
      social_links: form.socialLinks,
    })
    .select()
    .single();

  if (error) throw error;

  // Set as current immediately if in browser
  if (typeof window !== "undefined") {
    localStorage.setItem("lokalweb_current", data.id);
  }

  // Initialize business hours
  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const hours = days.map(day => ({
    business_id: data.id,
    day_of_week: day,
    is_open: day !== 0,
    open_time: "09:00",
    close_time: "18:00"
  }));
  const { error: hoursError } = await supabase.from("business_hours").insert(hours);
  if (hoursError) throw hoursError;

  return data.id;
}

// ✅ Get Bookings
export async function getBookings(businessId: string): Promise<Booking[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", businessId)
    .order("appointment_at", { ascending: false });
  
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    businessId: d.business_id,
    serviceId: d.service_id,
    customerName: d.customer_name,
    customerPhone: d.customer_phone,
    appointmentAt: d.appointment_at,
    status: d.status,
    createdAt: d.created_at
  }));
}

// ✅ Add Booking
export async function addBooking(businessId: string, booking: Omit<Booking, "id" | "status" | "createdAt">): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      service_id: booking.serviceId,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      appointment_at: booking.appointmentAt,
      status: "pending"
    });
  
  if (error) throw error;
}

// ✅ Get Services
export async function getServices(businessId: string): Promise<Service[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId);
  
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    businessId: d.business_id,
    name: d.name,
    description: d.description,
    price: d.price,
    durationMinutes: d.duration_minutes
  }));
}

// ✅ Update/Upsert Service
export async function updateService(businessId: string, service: Service): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("services")
    .upsert({
      id: service.id || undefined,
      business_id: businessId,
      name: service.name,
      description: service.description,
      price: service.price,
      duration_minutes: service.durationMinutes
    });
  if (error) throw error;
}

// ✅ Delete Service
export async function deleteService(businessId: string, serviceId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("business_id", businessId);
  if (error) throw error;
}

// ✅ Get Business Hours
export async function getBusinessHours(businessId: string): Promise<BusinessHours[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .order("day_of_week", { ascending: true });
  
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    businessId: d.business_id,
    dayOfWeek: d.day_of_week,
    isOpen: d.is_open,
    openTime: d.open_time,
    closeTime: d.close_time
  }));
}

// ✅ Save Business Hours
export async function saveBusinessHours(hours: BusinessHours[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("business_hours")
    .upsert(hours.map(h => ({
      id: h.id,
      business_id: h.businessId,
      day_of_week: h.dayOfWeek,
      is_open: h.isOpen,
      open_time: h.openTime,
      close_time: h.closeTime
    })));
  if (error) throw error;
}

// ✅ Save Business Profile
export async function saveBusiness(business: Business): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: business.name,
      phone: business.phone,
      address: business.address,
      description: business.description,
      social_links: business.socialLinks,
      logo_url: business.logoUrl,
      accent_color: business.accentColor,
      template: business.template,
    })
    .eq("id", business.id);
  if (error) throw error;
}

// ✅ Add Gallery Image
export async function addGalleryImage(businessId: string, url: string): Promise<void> {
  const supabase = createClient();
  const { data, error: fetchError } = await supabase
    .from("businesses")
    .select("gallery_images")
    .eq("id", businessId)
    .maybeSingle();
  
  if (fetchError) throw fetchError;
  const currentImages = data?.gallery_images || [];
  const { error } = await supabase
    .from("businesses")
    .update({
      gallery_images: [...currentImages, url]
    })
    .eq("id", businessId);
  if (error) throw error;
}

// ✅ Remove Gallery Image
export async function removeGalleryImage(businessId: string, url: string): Promise<void> {
  const supabase = createClient();
  const { data, error: fetchError } = await supabase
    .from("businesses")
    .select("gallery_images")
    .eq("id", businessId)
    .maybeSingle();
  
  if (fetchError) throw fetchError;
  if (!data) return;
  const { error } = await supabase
    .from("businesses")
    .update({
      gallery_images: (data.gallery_images || []).filter((u: string) => u !== url)
    })
    .eq("id", businessId);
  if (error) throw error;
}

// ✅ Update Booking Status
export async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
}

// ✅ OPTIONAL: merr krejt bizneset e user-it
export async function getUserBusinesses(): Promise<Business[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[Supabase] getUserBusinesses error:", error.message);
    return [];
  }

  return (data || []).map(fromSnakeBusiness);
}