'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Instagram, Facebook, Sparkles } from 'lucide-react'

export default function BeautyMinimal({ business, services, hours }: {
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
    <div className="bg-background text-primary/80 min-h-screen font-light antialiased">
      {/* NAVBAR */}
      <nav className="p-10 flex justify-between items-center border-b border-white/5">
        <span className="tracking-[0.5em] font-black text-xs text-white uppercase">{business.name}</span>
        <button onClick={() => openBooking()} className="text-[10px] tracking-[0.3em] font-black border border-primary/20 px-8 py-3 rounded-full hover:bg-primary hover:text-white hover:border-transparent transition-all uppercase">
          {(business.ctaPrimary || 'RESERVE').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="py-40 px-8 max-w-4xl mx-auto text-center relative">
        <div className="w-20 h-px bg-primary/20 mx-auto mb-10" />
        <h1 className="text-4xl md:text-6xl font-black tracking-[0.2em] text-white italic uppercase mb-10">
          {business.heroHeadline ? business.heroHeadline : <>Soft.<br />Luminous.<br />Lokal.</>}
        </h1>
        <div className="w-20 h-px bg-primary/20 mx-auto mb-16" />
        <p className="text-primary/40 max-w-md mx-auto leading-relaxed text-sm tracking-wide lowercase">
          {business.heroSubheadline || business.description || "A space of tranquility and light, specializing in minimal beauty treatments that let your natural glow shine through."}
        </p>
      </section>

      {/* TREATMENTS */}
      <section id="treatments" className="py-32 px-8 max-w-5xl mx-auto">
        <h2 className="text-[10px] tracking-[0.8em] text-primary/30 mb-20 uppercase font-black text-center">TREATMENTS</h2>
        
        <div className="border-t border-white/5">
          {services.map((s) => (
            <div key={s.id} className="flex justify-between items-center py-10 border-b border-white/5 group cursor-pointer hover:bg-white/[0.01] px-4 transition-all" onClick={() => openBooking(s)}>
              <div className="space-y-2">
                <h3 className="text-xl text-white tracking-widest font-black uppercase group-hover:text-primary transition-colors">{s.name}</h3>
                <div className="flex gap-4 items-center">
                   <div className="w-8 h-px bg-primary/20" />
                   <span className="text-[10px] tracking-widest uppercase text-primary/40">{s.durationMinutes} MIN</span>
                </div>
              </div>
              <div className="text-2xl font-black text-white italic">€{s.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="py-40 px-8 max-w-5xl mx-auto grid md:grid-cols-2 gap-32 border-t border-white/5">
        <div>
           <div className="flex items-center gap-4 mb-20">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-primary/20 text-primary"><Sparkles size={18}/></div>
              <h2 className="text-lg font-black text-white tracking-[0.3em] uppercase underline underline-offset-[12px] decoration-primary/20">VISIT</h2>
           </div>
           <p className="text-2xl text-white font-black italic tracking-tighter mb-8 max-w-xs">{business.address}</p>
           <p className="text-xl font-bold mb-12">{business.phone}</p>
           <div className="flex gap-6">
              {business.socialLinks?.instagram && <a href={business.socialLinks.instagram} className="text-primary/40 hover:text-primary transition-colors"><Instagram size={20}/></a>}
              {business.socialLinks?.facebook && <a href={business.socialLinks.facebook} className="text-primary/40 hover:text-primary transition-colors"><Facebook size={20}/></a>}
           </div>
        </div>

        <div>
           <h2 className="text-[10px] tracking-[0.5em] text-primary/30 mb-16 uppercase font-black">OPENING HOURS</h2>
           <div className="space-y-6">
              {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between items-baseline group">
                  <span className="text-[10px] tracking-[0.3em] text-primary/20 uppercase font-black group-hover:text-primary/40 transition-colors">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.dayOfWeek]}</span>
                  <span className={`text-xs font-black uppercase tracking-widest ${h.isOpen ? 'text-white' : 'text-zinc-800 italic'}`}>
                     {h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'Closed'}
                  </span>
                </div>
              ))}
           </div>
        </div>
      </section>

      <footer className="p-20 text-center border-t border-white/5 bg-card">
        <p className="text-[8px] tracking-[1em] text-white/10 uppercase font-black">© 2026 {business.name} — POWERED BY LOKALWEB</p>
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
