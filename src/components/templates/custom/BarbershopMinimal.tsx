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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerService, setDrawerService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null)
    setDrawerOpen(true)
  }

  return (
    <div className="bg-[#0a0a0f] text-[#e8e8f0] min-h-screen font-light">
      <nav className="p-8 flex justify-between items-center border-b border-white/5">
        <span className="tracking-[0.3em] font-bold text-sm uppercase">{business.name}</span>
        <button onClick={() => openBooking()} className="text-xs tracking-widest border border-white/20 px-6 py-2 hover:bg-white hover:text-black transition-colors">
          {(business.ctaPrimary || 'BOOK NOW').toUpperCase()}
        </button>
      </nav>

      <section className="py-32 px-8 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase">
          {business.heroHeadline || business.name}
        </h1>
        <p className="text-white/40 max-w-lg mx-auto leading-relaxed">
          {business.heroSubheadline || business.description || "Minimalist grooming for the modern individual."}
        </p>
      </section>

      <section className="py-24 px-8 max-w-4xl mx-auto border-t border-white/5">
        <h2 className="text-xs tracking-[0.5em] text-white/30 mb-16 uppercase">SERVICES</h2>
        <div className="space-y-12">
          {services.map((s, i) => (
            <div key={s.id} className="flex justify-between items-start group cursor-pointer" onClick={() => openBooking(s)}>
              <div className="flex gap-8">
                <span className="text-white/10 text-xl font-mono">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-lg uppercase tracking-wider mb-2 group-hover:translate-x-2 transition-transform">{s.name}</h3>
                  <p className="text-sm text-white/30">{s.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl mb-1">€{s.price}</div>
                <div className="text-[10px] tracking-widest text-white/20 uppercase">{s.durationMinutes} MIN</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-8 max-w-4xl mx-auto border-t border-white/5 grid md:grid-cols-2 gap-20">
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

      <footer className="p-12 text-center border-t border-white/5">
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
