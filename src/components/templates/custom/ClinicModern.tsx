'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Activity, ShieldCheck, Instagram } from 'lucide-react'

export default function ClinicModern({ business, services, hours }: {
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
    <div className="bg-[#020617] text-slate-200 min-h-screen font-sans antialiased">
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-[#0d9488] p-2 rounded-2xl rotate-3 shadow-lg shadow-[#0d9488]/20">
             <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="font-black tracking-tight text-xl text-white uppercase">{business.name}</span>
        </div>
        <button onClick={() => openBooking()} className="bg-[#0d9488] text-white px-8 py-3 rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#0f766e] transition-all shadow-xl shadow-[#0d9488]/10">
          {(business.ctaPrimary || 'RESERVE CONSULTATION').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-24 px-8 md:px-24">
        <img 
          src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1600&q=80"}
          alt="Clinic"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/90 to-transparent" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="text-[#0d9488] font-black tracking-[0.3em] uppercase text-xs mb-6 block">NEXT-GEN MEDICAL CENTER</span>
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.85] mb-8 uppercase italic tracking-tighter">
            {business.heroHeadline ? business.heroHeadline : <>ADVANCED<br />HEALTHCARE.</>}
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
            {business.heroSubheadline || business.description || "State-of-the-art medical facility combining technology with compassion for your total wellness."}
          </p>
          <div className="flex flex-wrap gap-4">
             <button onClick={() => document.getElementById('treatments')?.scrollIntoView({behavior: 'smooth'})} className="bg-white text-[#020617] px-10 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-slate-200 transition-all">
               {(business.ctaSecondary || 'VIEW TREATMENTS').toUpperCase()}
             </button>
          </div>
        </div>
      </section>

      {/* TREATMENTS */}
      <section id="treatments" className="py-32 px-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-20 gap-8">
           <div>
              <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">TREATMENTS</h2>
              <div className="w-12 h-2 bg-[#0d9488] mt-4" />
           </div>
           <p className="max-w-xs text-slate-500 text-sm font-medium">All our procedures are performed by certified specialists using the latest medical standards.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {services.map((s) => (
            <div key={s.id} className="group relative cursor-pointer bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 hover:bg-[#0d9488]/10 hover:border-[#0d9488]/20 transition-all" onClick={() => openBooking(s)}>
              <span className="absolute top-8 right-8 bg-[#0d9488] text-white px-4 py-2 rounded-2xl font-black text-xl shadow-lg shadow-[#0d9488]/30 group-hover:scale-110 transition-transform">
                €{s.price}
              </span>
              <h3 className="text-2xl font-black text-white mb-4 pr-16 group-hover:text-[#0d9488] transition-colors uppercase tracking-tight italic">{s.name}</h3>
              <p className="text-slate-500 leading-relaxed text-sm mb-6 max-w-xs">{s.description || "Comprehensive treatment tailored to your health profile."}</p>
              <div className="text-[10px] font-black text-[#0d9488] tracking-widest uppercase py-2 border-t border-white/5 inline-block">
                DURATION: {s.durationMinutes} MIN
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER-INFO */}
      <section className="bg-slate-950 py-32 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-12">CONNECT</h2>
            <div className="space-y-8">
               <div className="flex items-center gap-6 group">
                  <div className="bg-[#0d9488]/10 p-5 rounded-3xl text-[#0d9488] group-hover:bg-[#0d9488] group-hover:text-white transition-all"><MapPin /></div>
                  <span className="text-xl font-bold">{business.address}</span>
               </div>
               <div className="flex items-center gap-6 group">
                  <div className="bg-[#0d9488]/10 p-5 rounded-3xl text-[#0d9488] group-hover:bg-[#0d9488] group-hover:text-white transition-all"><Phone /></div>
                  <span className="text-xl font-bold">{business.phone}</span>
               </div>
            </div>
          </div>

          <div>
             <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-12">WORKING HOURS</h2>
             <div className="grid grid-cols-2 gap-4">
                {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                  <div key={h.dayOfWeek} className="p-6 bg-[#020617] rounded-3xl border border-white/5">
                    <span className="text-[#0d9488] uppercase tracking-widest text-[10px] font-black block mb-2">{['SUN','MON','TUE','WED','THU','FRI','SAT'][h.dayOfWeek]}</span>
                    <span className={`text-sm font-bold ${h.isOpen ? 'text-white' : 'text-slate-600'}`}>
                       {h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'CLOSED'}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      <footer className="p-12 text-center text-slate-800 font-black uppercase tracking-[0.5em] text-[8px] bg-slate-950">
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
