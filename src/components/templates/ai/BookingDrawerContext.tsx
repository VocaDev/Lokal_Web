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
  children: ReactNode;
}

export function BookingDrawerProvider({
  business,
  services,
  hours,
  children,
}: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        isOpen,
      }}
    >
      {children}
      <BookingDrawer
        business={business}
        services={services}
        hours={hours}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </Ctx.Provider>
  );
}
