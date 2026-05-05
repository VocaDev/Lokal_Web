'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Clock } from 'lucide-react'

export default function BarbershopMinimal({ business, services, hours }: {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}) {
  const heroImg = business.gallerySections?.hero?.[0]
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerService, setDrawerService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null)
    setDrawerOpen(true)
  }

  return (
    <div className="bg-background text-foreground min-h-screen font-light">
      <nav className="px-4 py-5 md:p-8 flex justify-between items-center border-b border-white/5 gap-3">
        <span className="tracking-[0.3em] font-bold text-sm uppercase truncate min-w-0">{business.name}</span>
        <button onClick={() => openBooking()} className="shrink-0 inline-flex items-center min-h-[44px] text-xs tracking-widest border border-white/20 px-5 py-3 hover:bg-white hover:text-black transition-colors">
          {(business.ctaPrimary || 'BOOK NOW').toUpperCase()}
        </button>
      </nav>

      <section className="relative overflow-hidden py-20 md:py-32 px-4 md:px-8 max-w-4xl mx-auto text-center">
        {heroImg && (
          <>
            <img src={heroImg} alt={business.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </>
        )}
        <h1 className="relative z-10 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase">
          {business.heroHeadline || business.name}
        </h1>
        <p className="relative z-10 text-white/40 max-w-lg mx-auto leading-relaxed">
          {business.heroSubheadline || business.description || "Minimalist grooming for the modern individual."}
        </p>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto border-t border-white/5">
        <h2 className="text-xs tracking-[0.5em] text-white/30 mb-12 md:mb-16 uppercase">SERVICES</h2>
        <div className="space-y-10 md:space-y-12">
          {services.map((s, i) => (
            <div key={s.id} className="flex justify-between items-start gap-4 sm:gap-8 group cursor-pointer min-h-[44px]" onClick={() => openBooking(s)}>
              <div className="flex gap-3 sm:gap-8 min-w-0">
                <span className="text-white/10 text-xl font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg uppercase tracking-wider mb-2 group-hover:translate-x-2 transition-transform">{s.name}</h3>
                  <p className="text-sm text-white/30">{s.description}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg sm:text-xl mb-1">€{s.price}</div>
                <div className="text-[10px] tracking-widest text-white/20 uppercase">{s.durationMinutes} MIN</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto border-t border-white/5 grid md:grid-cols-2 gap-12 md:gap-20">
        <div>
          <h2 className="text-xs tracking-[0.5em] text-white/30 mb-12 uppercase">OPENING HOURS</h2>
          <div className="space-y-4">
            {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
              <div key={h.dayOfWeek} className="flex justify-between text-sm">
                <span className="text-white/40 uppercase tracking-widest">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.dayOfWeek]}</span>
                <span>{h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'CLOSED'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs tracking-[0.5em] text-white/30 mb-12 uppercase">LOCATION</h2>
          <p className="text-lg mb-8">{business.address}</p>
          <div className="space-y-2 text-sm text-white/40">
            <p className="flex items-center gap-2"><Phone size={14}/> {business.phone}</p>
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 md:p-12 text-center border-t border-white/5">
        <p className="text-[10px] tracking-[0.4em] text-white/20 uppercase">© 2026 {business.name} — POWERED BY LOKALWEB</p>
      </footer>

      <BookingDrawer
        business={business}
        services={services}
        hours={hours}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialService={drawerService}
      />
    </div>
  )
}
