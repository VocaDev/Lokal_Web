'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Sparkles, Instagram, Facebook } from 'lucide-react'

export default function BeautyLuxury({ business, services, hours }: {
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
    <div className="bg-background text-foreground min-h-screen font-serif antialiased">
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 p-8 flex justify-between items-center bg-background/60 backdrop-blur-xl border-b border-primary/5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-black tracking-[0.3em] text-sm text-white uppercase">{business.name}</span>
        </div>
        <button onClick={() => openBooking()} className="bg-white text-foreground px-8 py-3 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/10">
          {(business.ctaPrimary || 'BOOK EXPERIENCE').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-screen flex items-center justify-center pt-24 overflow-hidden">
        <img 
          src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80"}
          alt={business.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="relative z-10 max-w-4xl text-center px-8">
          <span className="text-primary font-black tracking-[0.6em] uppercase text-[10px] mb-8 block">THE PINNACLE OF BEAUTY</span>
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] mb-12 tracking-tighter uppercase italic">
            {business.heroHeadline ? business.heroHeadline : <>REFINED.<br />ELEGANCE.</>}
          </h1>
          <div className="w-20 h-px bg-primary/30 mx-auto mb-12" />
          <p className="text-white/60 text-lg leading-relaxed mb-12 max-w-xl mx-auto font-sans italic">
             {business.heroSubheadline || business.description || "Indulge in an atmosphere of pure luxury where expert hands transform your beauty and well-being."}
          </p>
          <button onClick={() => document.getElementById('treatments')?.scrollIntoView({behavior: 'smooth'})} className="border border-primary text-primary px-12 py-4 rounded-full text-[10px] font-black tracking-[0.4em] uppercase hover:bg-primary hover:text-white transition-all shadow-2xl shadow-primary/5">
            {(business.ctaSecondary || 'THE TREATMENTS').toUpperCase()}
          </button>
        </div>
      </section>

      {/* TREATMENTS */}
      <section id="treatments" className="py-32 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-28">
           <h2 className="text-xs tracking-[0.8em] text-primary mb-6 uppercase italic font-bold">OUR TREATMENTS</h2>
           <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Curated For You</div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {services.map((s) => (
            <div key={s.id} className="group relative cursor-pointer bg-white/[0.02] p-12 overflow-hidden rounded-[3rem] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all shadow-2xl" onClick={() => openBooking(s)}>
              <div className="absolute top-0 right-0 p-8">
                 <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">{s.durationMinutes} MIN</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-6 group-hover:text-primary transition-all uppercase tracking-tight italic pt-4">{s.name}</h3>
              <p className="text-white/40 leading-relaxed text-sm mb-10 max-w-[200px] font-sans">{s.description || "A transformative treatment designed for exquisite results."}</p>
              <div className="text-3xl font-black text-primary">€{s.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOURS & INFO */}
      <section className="bg-card py-40 px-8 border-y border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-24 items-center">
          <div className="space-y-12">
             <div className="text-center md:text-left">
                <h2 className="text-primary text-[10px] tracking-[0.5em] uppercase italic font-black mb-8 underline underline-offset-8">THE SALON</h2>
                <p className="text-2xl font-bold leading-relaxed pr-8">{business.address}</p>
                <div className="mt-8 flex gap-4 justify-center md:justify-start">
                   {business.socialLinks?.instagram && <a href={business.socialLinks.instagram} className="p-4 bg-white/5 rounded-full hover:bg-primary hover:text-white transition-all"><Instagram size={18}/></a>}
                   {business.socialLinks?.facebook && <a href={business.socialLinks.facebook} className="p-4 bg-white/5 rounded-full hover:bg-primary hover:text-white transition-all"><Facebook size={18}/></a>}
                </div>
             </div>
          </div>

          <div className="text-center relative">
             <div className="absolute -inset-10 bg-primary/5 blur-3xl rounded-full" />
             <h2 className="text-white text-5xl font-black italic tracking-tighter uppercase mb-6">{business.name}</h2>
             <p className="text-primary text-[10px] tracking-[0.5em] font-black uppercase">RESERVE: {business.phone}</p>
          </div>

          <div className="space-y-6">
             {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between items-center py-4 border-b border-white/5 group">
                  <span className="text-primary uppercase tracking-widest text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayOfWeek]}</span>
                  <span className={`text-[10px] tracking-widest font-black uppercase ${h.isOpen ? 'text-white' : 'text-slate-600'}`}>
                     {h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'Closed'}
                  </span>
                </div>
             ))}
          </div>
        </div>
      </section>

      <footer className="p-16 text-center italic text-white/10 font-bold uppercase tracking-[1em] text-[8px] bg-background">
        © 2026 {business.name} — THE LOKALWEB COLLECTION
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
