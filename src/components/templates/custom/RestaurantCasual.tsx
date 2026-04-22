'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Instagram, Facebook, Utensils } from 'lucide-react'

export default function RestaurantCasual({ business, services, hours }: {
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
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-4 inset-x-4 z-50 p-4 flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-red-500" />
          <span className="font-black tracking-tight text-lg italic uppercase">{business.name}</span>
        </div>
        <button onClick={() => openBooking()} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
          {(business.ctaPrimary || 'BOOK A TABLE').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center pt-24 px-8 text-center bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-3xl">
          <span className="text-red-500 font-bold tracking-[0.2em] uppercase text-sm mb-6 block">EAT • DRINK • ENJOY</span>
          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-8 uppercase leading-[0.9]">
            {business.heroHeadline || business.name}
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed mb-12 max-w-xl mx-auto">
            {business.heroSubheadline || business.description || "The best food in the neighborhood. Fresh ingredients, bold flavors, great company."}
          </p>
          <button onClick={() => document.getElementById('menu')?.scrollIntoView({behavior: 'smooth'})} className="bg-zinc-100 text-zinc-950 px-10 py-4 rounded-xl text-sm font-black tracking-widest uppercase hover:scale-105 transition-all shadow-xl shadow-white/5">
            {(business.ctaSecondary || 'CHECK THE MENU').toUpperCase()}
          </button>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="py-32 px-8 max-w-6xl mx-auto">
        <div className="mb-20">
          <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2">WHAT WE SERVE</h2>
          <div className="w-20 h-2 bg-red-600" />
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {services.map((s) => (
            <div key={s.id} className="group cursor-pointer bg-zinc-900 p-8 rounded-2xl border-l-4 border-red-600 hover:bg-zinc-800 transition-colors" onClick={() => openBooking(s)}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black italic uppercase group-hover:text-red-500 transition-colors tracking-tight">{s.name}</h3>
                <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-lg font-bold">€{s.price}</span>
              </div>
              <p className="text-zinc-500 leading-relaxed text-sm mb-4">{s.description || "Fresh and flavorful, made to order."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="bg-zinc-900 py-32 px-8 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl font-black italic uppercase mb-12">FIND US</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="text-red-500 h-6 w-6 shrink-0" />
                <p className="text-xl text-zinc-300 font-medium">{business.address}</p>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="text-red-500 h-6 w-6 shrink-0" />
                <p className="text-xl text-zinc-300 font-medium">{business.phone}</p>
              </div>
            </div>
            
            <div className="mt-12 flex gap-4">
               {business.socialLinks?.instagram && <a href={business.socialLinks.instagram} className="p-4 bg-zinc-950 rounded-2xl text-zinc-400 hover:text-red-500 transition-all border border-zinc-800"><Instagram/></a>}
               {business.socialLinks?.facebook && <a href={business.socialLinks.facebook} className="p-4 bg-zinc-950 rounded-2xl text-zinc-400 hover:text-red-500 transition-all border border-zinc-800"><Facebook/></a>}
            </div>
          </div>

          <div>
             <h2 className="text-4xl font-black italic uppercase mb-12">HOURS</h2>
             <div className="space-y-4">
                {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                  <div key={h.dayOfWeek} className="flex justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400 uppercase tracking-widest text-xs font-bold">
                    <span>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayOfWeek]}</span>
                    <span className={h.isOpen ? 'text-zinc-100' : 'text-red-500/50'}>
                      {h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'Closed'}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      <footer className="p-12 text-center text-zinc-600 font-bold uppercase tracking-[0.2em] text-[10px]">
        © 2026 {business.name} — POWERED BY LOKALWEB
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
