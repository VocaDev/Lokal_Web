'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Instagram, Facebook } from 'lucide-react'

export default function RestaurantElegant({ business, services, hours }: {
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
    <div className="bg-background text-foreground min-h-screen font-serif">
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-primary/10">
        <span className="text-xl font-bold tracking-widest text-primary uppercase">{business.name}</span>
        <button onClick={() => openBooking()} className="bg-primary text-black px-6 py-2 text-xs font-bold tracking-widest uppercase hover:bg-primary/90 transition-colors">
          {(business.ctaPrimary || 'RESERVE A TABLE').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-screen flex items-center justify-center pt-20 overflow-hidden">
        <img 
          src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80"}
          alt={business.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative z-10 max-w-3xl text-center px-8">
          <div className="w-12 h-px bg-primary mx-auto mb-8" />
          <h1 className="text-5xl md:text-7xl font-bold italic mb-6">{business.heroHeadline || business.name}</h1>
          <p className="text-lg text-primary/80 tracking-widest uppercase mb-12">{business.heroSubheadline || 'Fine Dining • Excellence • Tradition'}</p>
          <div className="flex justify-center gap-6">
            <button onClick={() => document.getElementById('menu')?.scrollIntoView({behavior: 'smooth'})} className="border border-primary text-primary px-8 py-3 text-xs tracking-widest uppercase hover:bg-primary hover:text-black transition-all">
              {(business.ctaSecondary || 'THE MENU').toUpperCase()}
            </button>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="py-32 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-xs tracking-[0.6em] text-primary mb-4 uppercase">OUR MENU</h2>
          <div className="text-3xl italic">A Culniary Journey</div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-20 gap-y-16">
          {services.map((s) => (
            <div key={s.id} className="relative group cursor-pointer" onClick={() => openBooking(s)}>
              <div className="flex justify-between items-baseline mb-2 border-b border-primary/20 pb-2">
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors uppercase">{s.name}</h3>
                <span className="text-xl font-medium">€{s.price}</span>
              </div>
              <p className="text-primary/50 text-sm leading-relaxed italic">{s.description || "A signature creation prepared by our chef."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOURS & INFO */}
      <section className="bg-card py-32 px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="text-center md:text-left">
            <h4 className="text-primary text-xs tracking-widest uppercase mb-8">Location</h4>
            <p className="text-lg leading-relaxed">{business.address}</p>
            <div className="mt-8 flex gap-4 justify-center md:justify-start">
              <a href={`tel:${business.phone}`} className="p-3 border border-primary/20 rounded-full hover:bg-primary/10 transition-colors"><Phone size={16}/></a>
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-primary text-xs tracking-widest uppercase mb-8">Service Hours</h4>
            <div className="space-y-4">
              {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between text-sm italic">
                  <span className="text-primary/60 uppercase tracking-widest">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayOfWeek]}</span>
                  <span>{h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'Closed'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center md:text-right">
            <h4 className="text-primary text-xs tracking-widest uppercase mb-8">Contact</h4>
            <p className="text-2xl font-bold mb-4">{business.phone}</p>
            <p className="text-primary/60 text-sm italic">For private events and inquiries.</p>
          </div>
        </div>
      </section>

      <footer className="p-12 text-center border-t border-primary/10">
        <p className="text-[10px] tracking-[0.4em] text-primary/40 uppercase">© 2026 {business.name} — Designed by LokalWeb</p>
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
