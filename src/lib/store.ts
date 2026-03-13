import { Business, Booking, Service } from './types';

const STORAGE_KEY = 'lokalweb_businesses';

const mockBookings: Booking[] = [
  { id: '1', customerName: 'Arben Krasniqi', customerPhone: '+383 44 123 456', serviceName: 'Haircut', date: '2026-03-13', time: '09:00', status: 'confirmed' },
  { id: '2', customerName: 'Fjolla Berisha', customerPhone: '+383 44 234 567', serviceName: 'Beard Trim', date: '2026-03-13', time: '10:00', status: 'pending' },
  { id: '3', customerName: 'Driton Hoxha', customerPhone: '+383 44 345 678', serviceName: 'Full Package', date: '2026-03-13', time: '11:00', status: 'cancelled' },
  { id: '4', customerName: 'Rina Gashi', customerPhone: '+383 44 456 789', serviceName: 'Haircut', date: '2026-03-14', time: '09:00', status: 'pending' },
  { id: '5', customerName: 'Besart Morina', customerPhone: '+383 44 567 890', serviceName: 'Beard Trim', date: '2026-03-14', time: '14:00', status: 'confirmed' },
];

const defaultServices: Service[] = [
  { id: '1', name: 'Haircut', price: 5, duration: 30 },
  { id: '2', name: 'Beard Trim', price: 3, duration: 15 },
  { id: '3', name: 'Full Package', price: 8, duration: 45 },
];

export function getBusinesses(): Business[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveBusiness(business: Business): void {
  const businesses = getBusinesses();
  const idx = businesses.findIndex(b => b.id === business.id);
  if (idx >= 0) businesses[idx] = business;
  else businesses.push(business);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businesses));
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

export function registerBusiness(data: Omit<Business, 'id' | 'services' | 'bookings'>): Business {
  const business: Business = {
    ...data,
    id: crypto.randomUUID(),
    services: defaultServices,
    bookings: mockBookings,
  };
  saveBusiness(business);
  setCurrentBusiness(business.id);
  return business;
}

export function addBooking(businessId: string, booking: Omit<Booking, 'id' | 'status'>): void {
  const businesses = getBusinesses();
  const biz = businesses.find(b => b.id === businessId);
  if (!biz) return;
  biz.bookings.push({ ...booking, id: crypto.randomUUID(), status: 'pending' });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businesses));
}

export function updateService(businessId: string, service: Service): void {
  const businesses = getBusinesses();
  const biz = businesses.find(b => b.id === businessId);
  if (!biz) return;
  const idx = biz.services.findIndex(s => s.id === service.id);
  if (idx >= 0) biz.services[idx] = service;
  else biz.services.push(service);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businesses));
}

export function deleteService(businessId: string, serviceId: string): void {
  const businesses = getBusinesses();
  const biz = businesses.find(b => b.id === businessId);
  if (!biz) return;
  biz.services = biz.services.filter(s => s.id !== serviceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businesses));
}
