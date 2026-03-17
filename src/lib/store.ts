import { Business, Booking, Service, BusinessHours } from './types';
import { createClient } from './supabase/client';

const supabase = createClient();

const BIZ_KEY = 'lokalweb_businesses';
const SVC_KEY = 'lokalweb_services';
const HOURS_KEY = 'lokalweb_hours';
const BOOKINGS_KEY = 'lokalweb_bookings';

// ── Helpers ──

// NOTE: Legacy localStorage helpers kept for rollback.
// function getItems<T>(key: string): T[] {
//   const data = localStorage.getItem(key);
//   return data ? JSON.parse(data) : [];
// }
// function setItems<T>(key: string, items: T[]) {
//   localStorage.setItem(key, JSON.stringify(items));
// }

// ── Businesses ──

function toSnakeBusiness(b: Business) {
  return {
    id: b.id,
    name: b.name,
    subdomain: b.subdomain,
    industry: b.industry,
    phone: b.phone,
    address: b.address,
    description: b.description,
    logo_url: b.logoUrl,
    accent_color: b.accentColor,
    social_links: b.socialLinks ?? { instagram: "", facebook: "", whatsapp: "" },
    gallery_images: b.galleryImages ?? [],
    created_at: b.createdAt,
  };
}

function fromSnakeBusiness(row: any): Business {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    industry: row.industry,
    phone: row.phone,
    address: row.address,
    description: row.description,
    logoUrl: row.logo_url,
    accentColor: row.accent_color,
    socialLinks: row.social_links ?? { instagram: "", facebook: "", whatsapp: "" },
    galleryImages: row.gallery_images ?? [],
    createdAt: row.created_at,
  };
}

// Legacy localStorage implementations kept for rollback:
// export function getBusinesses(): Business[] { return getItems<Business>(BIZ_KEY); }
// export function saveBusiness(business: Business): void {
//   const list = getBusinesses();
//   const idx = list.findIndex(b => b.id === business.id);
//   if (idx >= 0) list[idx] = business; else list.push(business);
//   setItems(BIZ_KEY, list);
// }
// export function getBusinessBySubdomain(subdomain: string): Business | undefined {
//   return getBusinesses().find(b => b.subdomain === subdomain);
// }

export async function getBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase.from('businesses').select('*');
  if (error) {
    console.error('[Supabase] Error fetching businesses', error.message, error.details, error.hint);
    throw error;
  }
  return (data ?? []).map(fromSnakeBusiness);
}

export async function saveBusiness(business: Business): Promise<void> {
  const { error } = await supabase.from('businesses').upsert(toSnakeBusiness(business));
  if (error) {
    console.error('[Supabase] Error saving business', error.message, error.details, error.hint);
    throw error;
  }
}

export async function getBusinessBySubdomain(subdomain: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error fetching business by subdomain', error.message, error.details, error.hint);
    throw error;
  }

  return data ? fromSnakeBusiness(data) : null;
}

export async function getCurrentBusiness(): Promise<Business | null> {
  const id = localStorage.getItem('lokalweb_current');
  if (!id) return null;
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[Supabase] Error fetching current business', error.message, error.details, error.hint);
    return null;
  }
  return data ? fromSnakeBusiness(data) : null;
}

export function setCurrentBusiness(id: string): void {
  localStorage.setItem('lokalweb_current', id);
}

// ── Services ──

// Legacy localStorage implementations kept for rollback:
// export function getServices(businessId: string): Service[] {
//   return getItems<Service>(SVC_KEY).filter(s => s.businessId === businessId);
// }
// export function updateService(businessId: string, service: Service): void {
//   const all = getItems<Service>(SVC_KEY);
//   const svc = { ...service, businessId };
//   const idx = all.findIndex(s => s.id === svc.id);
//   if (idx >= 0) all[idx] = svc; else all.push(svc);
//   setItems(SVC_KEY, all);
// }
// export function deleteService(businessId: string, serviceId: string): void {
//   setItems(SVC_KEY, getItems<Service>(SVC_KEY).filter(s => !(s.id === serviceId && s.businessId === businessId)));
// }

export async function getServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId);

  if (error) {
    console.error('[Supabase] Error fetching services', error.message, error.details, error.hint);
    throw error;
  }

  return (data as any[] | null ?? []).map(row => ({
    id: row.id as string,
    businessId: row.business_id as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as number,
    durationMinutes: row.duration_minutes as number,
  }));
}

export async function updateService(businessId: string, service: Service): Promise<void> {
  const payload = {
    id: service.id,
    business_id: businessId,
    name: service.name,
    description: service.description ?? '',
    price: service.price,
    duration_minutes: service.durationMinutes,
  };

  const { error } = await supabase.from('services').upsert(payload);
  if (error) {
    console.error('[Supabase] Error updating service', error.message, error.details, error.hint);
    throw error;
  }
}

export async function deleteService(_businessId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) {
    console.error('[Supabase] Error deleting service', error.message, error.details, error.hint);
    throw error;
  }
}

// ── Business Hours ──

const defaultHours: Omit<BusinessHours, 'id' | 'businessId'>[] = [
  { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 6, isOpen: false, openTime: '09:00', closeTime: '17:00' },
];

// Legacy localStorage implementations kept for rollback:
// export function getBusinessHours(businessId: string): BusinessHours[] {
//   const all = getItems<BusinessHours>(HOURS_KEY).filter(h => h.businessId === businessId);
//   if (all.length === 0) {
//     // seed defaults
//     const hours = defaultHours.map(h => ({ ...h, id: crypto.randomUUID(), businessId }));
//     const existing = getItems<BusinessHours>(HOURS_KEY);
//     setItems(HOURS_KEY, [...existing, ...hours]);
//     return hours;
//   }
//   return all.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
// }
// export function saveBusinessHours(hours: BusinessHours[]): void {
//   const all = getItems<BusinessHours>(HOURS_KEY);
//   hours.forEach(h => {
//     const idx = all.findIndex(x => x.id === h.id);
//     if (idx >= 0) all[idx] = h; else all.push(h);
//   });
//   setItems(HOURS_KEY, all);
// }

export async function getBusinessHours(businessId: string): Promise<BusinessHours[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week');

  if (error) {
    console.error('[Supabase] Error fetching business hours', error.message, error.details, error.hint);
    throw error;
  }

  if (data && data.length > 0) {
    return (data as any[]).map(row => ({
      id: row.id as string,
      businessId: row.business_id as string,
      dayOfWeek: row.day_of_week as number,
      isOpen: row.is_open as boolean,
      openTime: row.open_time as string,
      closeTime: row.close_time as string,
    }));
  }

  // Seed defaults if no hours exist yet
  const hoursToInsert = defaultHours.map(h => ({
    id: crypto.randomUUID(),
    business_id: businessId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.openTime,
    close_time: h.closeTime,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('business_hours')
    .insert(hoursToInsert)
    .select('*')
    .order('day_of_week');

  if (insertError) {
    console.error('[Supabase] Error seeding business hours', insertError.message, insertError.details, insertError.hint);
    throw insertError;
  }

  return (inserted as any[] | null ?? []).map(row => ({
    id: row.id as string,
    businessId: row.business_id as string,
    dayOfWeek: row.day_of_week as number,
    isOpen: row.is_open as boolean,
    openTime: row.open_time as string,
    closeTime: row.close_time as string,
  }));
}

export async function saveBusinessHours(hours: BusinessHours[]): Promise<void> {
  const payload = hours.map(h => ({
    id: h.id,
    business_id: h.businessId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.openTime,
    close_time: h.closeTime,
  }));

  const { error } = await supabase.from('business_hours').upsert(payload);
  if (error) {
    console.error('[Supabase] Error saving business hours', error.message, error.details, error.hint);
    throw error;
  }
}

// ── Bookings ──

// Legacy localStorage implementations kept for rollback:
// export function getBookings(businessId: string): Booking[] {
//   return getItems<Booking>(BOOKINGS_KEY).filter(b => b.businessId === businessId);
// }
// export function addBooking(businessId: string, booking: Omit<Booking, 'id' | 'status' | 'createdAt'>): void {
//   const all = getItems<Booking>(BOOKINGS_KEY);
//   all.push({ ...booking, businessId, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString() });
//   setItems(BOOKINGS_KEY, all);
// }

export async function getBookings(businessId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', businessId);

  if (error) {
    console.error('[Supabase] Error fetching bookings', error.message, error.details, error.hint);
    throw error;
  }

  return (data as any[] | null ?? []).map(row => ({
    id: row.id as string,
    businessId: row.business_id as string,
    serviceId: row.service_id as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    appointmentAt: row.appointment_at as string,
    status: row.status as Booking['status'],
    createdAt: row.created_at as string,
  }));
}

export async function addBooking(
  businessId: string,
  booking: Omit<Booking, 'id' | 'status' | 'createdAt'>
): Promise<void> {
  const payload = {
    id: crypto.randomUUID(),
    business_id: businessId,
    service_id: booking.serviceId,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    appointment_at: booking.appointmentAt,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('bookings').insert(payload);
  if (error) {
    console.error('[Supabase] Error adding booking', error.message, error.details, error.hint);
    throw error;
  }
}

// ── Registration ──

const defaultServiceTemplates: Omit<Service, 'id' | 'businessId'>[] = [
  { name: 'Haircut', description: 'Standard haircut', price: 5, durationMinutes: 30 },
  { name: 'Beard Trim', description: 'Beard trimming', price: 3, durationMinutes: 15 },
  { name: 'Full Package', description: 'Haircut + beard', price: 8, durationMinutes: 45 },
];

const mockBookingTemplates = [
  { customerName: 'Arben Krasniqi', customerPhone: '+383 44 123 456', appointmentAt: '2026-03-13T09:00:00', status: 'confirmed' as const },
  { customerName: 'Fjolla Berisha', customerPhone: '+383 44 234 567', appointmentAt: '2026-03-13T10:00:00', status: 'pending' as const },
  { customerName: 'Driton Hoxha', customerPhone: '+383 44 345 678', appointmentAt: '2026-03-13T11:00:00', status: 'cancelled' as const },
  { customerName: 'Rina Gashi', customerPhone: '+383 44 456 789', appointmentAt: '2026-03-14T09:00:00', status: 'pending' as const },
  { customerName: 'Besart Morina', customerPhone: '+383 44 567 890', appointmentAt: '2026-03-14T14:00:00', status: 'confirmed' as const },
];

// Legacy localStorage implementation kept for rollback:
// export function registerBusiness(data: Omit<Business, 'id' | 'createdAt' | 'galleryImages'> & { galleryImages?: string[] }): Business {
//   const business: Business = {
//     ...data,
//     id: crypto.randomUUID(),
//     galleryImages: data.galleryImages || [],
//     createdAt: new Date().toISOString(),
//   };
//   saveBusiness(business);
//   setCurrentBusiness(business.id);
//
//   // Seed services
//   const services = defaultServiceTemplates.map(s => ({ ...s, id: crypto.randomUUID(), businessId: business.id }));
//   const existingSvc = getItems<Service>(SVC_KEY);
//   setItems(SVC_KEY, [...existingSvc, ...services]);
//
//   // Seed bookings
//   const bookings = mockBookingTemplates.map(b => ({
//     ...b,
//     id: crypto.randomUUID(),
//     businessId: business.id,
//     serviceId: services[0]?.id || '',
//     createdAt: new Date().toISOString(),
//   }));
//   const existingBookings = getItems<Booking>(BOOKINGS_KEY);
//   setItems(BOOKINGS_KEY, [...existingBookings, ...bookings]);
//
//   // Seed hours
//   getBusinessHours(business.id);
//
//   return business;
// }

export async function registerBusiness(
  data: Omit<Business, 'id' | 'createdAt' | 'galleryImages'> & { galleryImages?: string[] }
): Promise<Business> {
  const business: Business = {
    ...data,
    id: crypto.randomUUID(),
    galleryImages: data.galleryImages || [],
    createdAt: new Date().toISOString(),
  };

  // 1) Insert business
  const { error: bizError } = await supabase.from('businesses').insert(toSnakeBusiness(business));
  if (bizError) {
    console.error('[Supabase] Error registering business', bizError.message, bizError.details, bizError.hint);
    throw bizError;
  }

  // 2) Insert default services
  const services = defaultServiceTemplates.map(s => ({
    ...s,
    id: crypto.randomUUID(),
    businessId: business.id,
  }));
  const servicePayload = services.map(s => ({
    id: s.id,
    business_id: business.id,
    name: s.name,
    description: s.description,
    price: s.price,
    duration_minutes: s.durationMinutes,
  }));
  const { error: svcError } = await supabase.from('services').insert(servicePayload);
  if (svcError) {
    console.error('[Supabase] Error seeding services', svcError.message, svcError.details, svcError.hint);
    throw svcError;
  }

  // 3) Insert mock bookings
  const bookingsPayload = mockBookingTemplates.map(b => ({
    id: crypto.randomUUID(),
    business_id: business.id,
    service_id: services[0]?.id || '',
    customer_name: b.customerName,
    customer_phone: b.customerPhone,
    appointment_at: b.appointmentAt,
    status: b.status,
    created_at: new Date().toISOString(),
  }));
  const { error: bookingsError } = await supabase.from('bookings').insert(bookingsPayload);
  if (bookingsError) {
    console.error('[Supabase] Error seeding bookings', bookingsError.message, bookingsError.details, bookingsError.hint);
    throw bookingsError;
  }

  // 4) Insert default 7 hours rows
  const hoursPayload = defaultHours.map(h => ({
    id: crypto.randomUUID(),
    business_id: business.id,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.openTime,
    close_time: h.closeTime,
  }));
  const { error: hoursError } = await supabase.from('business_hours').insert(hoursPayload);
  if (hoursError) {
    console.error('[Supabase] Error seeding business hours', hoursError.message, hoursError.details, hoursError.hint);
    throw hoursError;
  }

  // 5) Save current business ID in localStorage
  setCurrentBusiness(business.id);

  return business;
}

// ── Gallery ──

// Legacy localStorage implementations kept for rollback:
// export function addGalleryImage(businessId: string, imageUrl: string): void {
//   const biz = getBusinesses().find(b => b.id === businessId);
//   if (!biz) return;
//   biz.galleryImages = [...(biz.galleryImages || []), imageUrl];
//   saveBusiness(biz);
// }
// export function removeGalleryImage(businessId: string, imageUrl: string): void {
//   const biz = getBusinesses().find(b => b.id === businessId);
//   if (!biz) return;
//   biz.galleryImages = (biz.galleryImages || []).filter(u => u !== imageUrl);
//   saveBusiness(biz);
// }

export async function addGalleryImage(businessId: string, imageUrl: string): Promise<void> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error fetching business for gallery add', error.message, error.details, error.hint);
    throw error;
  }

  if (!data) return;

  const biz = fromSnakeBusiness(data);
  const nextImages = [...(biz.galleryImages ?? []), imageUrl];

  const { error: upsertError } = await supabase
    .from('businesses')
    .upsert({
      ...toSnakeBusiness(biz),
      gallery_images: nextImages,
    });

  if (upsertError) {
    console.error('[Supabase] Error updating gallery images', upsertError.message, upsertError.details, upsertError.hint);
    throw upsertError;
  }
}

export async function removeGalleryImage(businessId: string, imageUrl: string): Promise<void> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error fetching business for gallery remove', error.message, error.details, error.hint);
    throw error;
  }

  if (!data) return;

  const biz = fromSnakeBusiness(data);
  const nextImages = (biz.galleryImages ?? []).filter(u => u !== imageUrl);

  const { error: upsertError } = await supabase
    .from('businesses')
    .upsert({
      ...toSnakeBusiness(biz),
      gallery_images: nextImages,
    });

  if (upsertError) {
    console.error('[Supabase] Error updating gallery images', upsertError.message, upsertError.details, upsertError.hint);
    throw upsertError;
  }
}
