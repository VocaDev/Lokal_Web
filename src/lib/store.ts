import { Business, Booking, Service, BusinessHours } from './types';

const BIZ_KEY = 'lokalweb_businesses';
const SVC_KEY = 'lokalweb_services';
const HOURS_KEY = 'lokalweb_hours';
const BOOKINGS_KEY = 'lokalweb_bookings';

// ── Helpers ──

function getItems<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
function setItems<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

// ── Businesses ──

export function getBusinesses(): Business[] { return getItems<Business>(BIZ_KEY); }

export function saveBusiness(business: Business): void {
  const list = getBusinesses();
  const idx = list.findIndex(b => b.id === business.id);
  if (idx >= 0) list[idx] = business; else list.push(business);
  setItems(BIZ_KEY, list);
}

export function getBusinessBySubdomain(subdomain: string): Business | undefined {
  return getBusinesses().find(b => b.subdomain === subdomain);
}

export function getCurrentBusiness(): Business | undefined {
  const id = localStorage.getItem('lokalweb_current');
  return getBusinesses().find(b => b.id === id);
}

export function setCurrentBusiness(id: string): void {
  localStorage.setItem('lokalweb_current', id);
}

// ── Services ──

export function getServices(businessId: string): Service[] {
  return getItems<Service>(SVC_KEY).filter(s => s.businessId === businessId);
}

export function updateService(businessId: string, service: Service): void {
  const all = getItems<Service>(SVC_KEY);
  const svc = { ...service, businessId };
  const idx = all.findIndex(s => s.id === svc.id);
  if (idx >= 0) all[idx] = svc; else all.push(svc);
  setItems(SVC_KEY, all);
}

export function deleteService(businessId: string, serviceId: string): void {
  setItems(SVC_KEY, getItems<Service>(SVC_KEY).filter(s => !(s.id === serviceId && s.businessId === businessId)));
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

export function getBusinessHours(businessId: string): BusinessHours[] {
  const all = getItems<BusinessHours>(HOURS_KEY).filter(h => h.businessId === businessId);
  if (all.length === 0) {
    // seed defaults
    const hours = defaultHours.map(h => ({ ...h, id: crypto.randomUUID(), businessId }));
    const existing = getItems<BusinessHours>(HOURS_KEY);
    setItems(HOURS_KEY, [...existing, ...hours]);
    return hours;
  }
  return all.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function saveBusinessHours(hours: BusinessHours[]): void {
  const all = getItems<BusinessHours>(HOURS_KEY);
  hours.forEach(h => {
    const idx = all.findIndex(x => x.id === h.id);
    if (idx >= 0) all[idx] = h; else all.push(h);
  });
  setItems(HOURS_KEY, all);
}

// ── Bookings ──

export function getBookings(businessId: string): Booking[] {
  return getItems<Booking>(BOOKINGS_KEY).filter(b => b.businessId === businessId);
}

export function addBooking(businessId: string, booking: Omit<Booking, 'id' | 'status' | 'createdAt'>): void {
  const all = getItems<Booking>(BOOKINGS_KEY);
  all.push({ ...booking, businessId, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString() });
  setItems(BOOKINGS_KEY, all);
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

export function registerBusiness(data: Omit<Business, 'id' | 'createdAt' | 'galleryImages'> & { galleryImages?: string[] }): Business {
  const business: Business = {
    ...data,
    id: crypto.randomUUID(),
    galleryImages: data.galleryImages || [],
    createdAt: new Date().toISOString(),
  };
  saveBusiness(business);
  setCurrentBusiness(business.id);

  // Seed services
  const services = defaultServiceTemplates.map(s => ({ ...s, id: crypto.randomUUID(), businessId: business.id }));
  const existingSvc = getItems<Service>(SVC_KEY);
  setItems(SVC_KEY, [...existingSvc, ...services]);

  // Seed bookings
  const bookings = mockBookingTemplates.map(b => ({
    ...b,
    id: crypto.randomUUID(),
    businessId: business.id,
    serviceId: services[0]?.id || '',
    createdAt: new Date().toISOString(),
  }));
  const existingBookings = getItems<Booking>(BOOKINGS_KEY);
  setItems(BOOKINGS_KEY, [...existingBookings, ...bookings]);

  // Seed hours
  getBusinessHours(business.id);

  return business;
}

// ── Gallery ──

export function addGalleryImage(businessId: string, imageUrl: string): void {
  const biz = getBusinesses().find(b => b.id === businessId);
  if (!biz) return;
  biz.galleryImages = [...(biz.galleryImages || []), imageUrl];
  saveBusiness(biz);
}

export function removeGalleryImage(businessId: string, imageUrl: string): void {
  const biz = getBusinesses().find(b => b.id === businessId);
  if (!biz) return;
  biz.galleryImages = (biz.galleryImages || []).filter(u => u !== imageUrl);
  saveBusiness(biz);
}
