export type IndustryType = 'barbershop' | 'restaurant' | 'clinic' | 'beauty-salon';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Business {
  id: string;
  name: string;
  subdomain: string;
  industry: IndustryType;
  phone: string;
  description: string;
  services: Service[];
  bookings: Booking[];
}
