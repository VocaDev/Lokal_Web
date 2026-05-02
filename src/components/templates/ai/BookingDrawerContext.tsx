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
  // Owner-level opt-in (migration 019). When false, the drawer never mounts
  // regardless of bookingMethod — the owner has globally disabled bookings.
  // Defaults to true so legacy callers stay permissive.
  bookingEnabled?: boolean;
  children: ReactNode;
}

export function BookingDrawerProvider({
  business,
  services,
  hours,
  bookingMethod,
  bookingEnabled,
  children,
}: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ownerOptedIn = bookingEnabled !== false;
  const methodAllows = bookingMethod === 'appointments' || bookingMethod === 'both';
  const bookingActive = ownerOptedIn && methodAllows;

  // For walkin/none/owner-opted-out sites the drawer is not in the DOM at
  // all — open() is a no-op and the hero's contact-redirect handler takes
  // over (WhatsApp / tel). We still provide a context value so consumers
  // don't need to null-check.
  return (
    <Ctx.Provider
      value={{
        open: bookingActive ? () => setIsOpen(true) : () => {},
        close: () => setIsOpen(false),
        isOpen,
      }}
    >
      {children}
      {bookingActive && (
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
