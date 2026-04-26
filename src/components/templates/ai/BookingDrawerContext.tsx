'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Business, Service, BusinessHours } from '@/lib/types';
import BookingDrawer from '@/components/templates/shared/BookingDrawer';

interface DrawerCtx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<DrawerCtx | null>(null);

export function useBookingDrawer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBookingDrawer must be used inside BookingDrawerProvider');
  return ctx;
}

interface ProviderProps {
  business: Business;
  services: Service[];
  hours: BusinessHours[];
  bookingMethod?: string;
  children: ReactNode;
}

export function BookingDrawerProvider({
  business,
  services,
  hours,
  bookingMethod,
  children,
}: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bookingEnabled = bookingMethod === 'appointments' || bookingMethod === 'both';

  // For walkin/none sites the drawer is not in the DOM at all — open() is a
  // no-op and the hero's contact-redirect handler takes over (WhatsApp / tel).
  // We still provide a context value so consumers don't need to null-check.
  return (
    <Ctx.Provider
      value={{
        open: bookingEnabled ? () => setIsOpen(true) : () => {},
        close: () => setIsOpen(false),
        isOpen,
      }}
    >
      {children}
      {bookingEnabled && (
        <BookingDrawer
          business={business}
          services={services}
          hours={hours}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </Ctx.Provider>
  );
}
