'use client'
import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'
import { Phone, MapPin, Calendar, Heart, ShieldCheck } from 'lucide-react'

export default function ClinicClean({ business, services, hours }: {
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
    <div className="bg-white text-slate-900 min-h-screen font-sans antialiased">
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/10">
             <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-xl text-slate-800 uppercase">{business.name}</span>
        </div>
        <button onClick={() => openBooking()} className="bg-blue-600 text-white px-8 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
          {(business.ctaPrimary || 'BOOK APPOINTMENT').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-[80vh] flex flex-col md:flex-row items-stretch pt-24">
        <div className="flex-1 flex flex-col justify-center px-12 md:px-24 py-20 bg-slate-50">
          <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-8 self-start">PROFESSIONAL CARE</span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.95] uppercase">
            {business.heroHeadline ? business.heroHeadline : <>Your Health Is<br />Our Priority.</>}
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
             {business.heroSubheadline || business.description || "We provide top-tier medical services with a focus on precision and personalized care. Your wellness begins with us."}
          </p>
          <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
             <ShieldCheck className="h-5 w-5 text-blue-500" />
             <span>ISO CERTIFIED CLINIC • EXPERT TEAM</span>
          </div>
        </div>
        <div className="flex-1 bg-blue-600 relative overflow-hidden hidden md:block">
           <img 
              src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1600&q=80"}
              alt="Medical facility" 
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="p-12 border-4 border-white/20 rounded-full animate-pulse"><Calendar className="h-20 w-20 text-white/40" /></div>
            </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-32 px-8 max-w-6xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-xs tracking-[0.6em] text-blue-600 mb-4 uppercase font-bold">OUR SERVICES</h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s) => (
            <div key={s.id} className="group cursor-pointer bg-white p-10 rounded-2xl border border-slate-100 border-l-4 border-l-blue-600 hover:shadow-2xl hover:shadow-blue-600/5 transition-all" onClick={() => openBooking(s)}>
              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{s.name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">{s.description || "Expert medical consultation and diagnostic care."}</p>
              <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">Consultation: {s.durationMinutes} min</span>
                <span className="text-2xl font-black text-slate-900">€{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="bg-slate-900 py-32 px-8 text-white rounded-t-[4rem]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-20">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold uppercase tracking-tight">Visit Us</h2>
            <div className="flex gap-4">
              <MapPin className="text-blue-500 shrink-0" />
              <p className="text-slate-400 leading-relaxed font-medium">{business.address}</p>
            </div>
            <div className="flex gap-4 pt-4">
               <div className="bg-blue-600/10 p-3 rounded-full text-blue-500 items-center justify-center flex"><Phone size={18}/></div>
               <div>
                  <div className="text-xs font-bold text-slate-500 tracking-widest">CALL NOW</div>
                  <div className="text-lg font-bold">{business.phone}</div>
               </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-12 text-center md:text-left">Working Hours</h2>
            <div className="grid sm:grid-cols-2 gap-4">
               {hours.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                 <div key={h.dayOfWeek} className="flex justify-between p-6 bg-slate-800/50 rounded-2xl border border-white/5 transition-colors hover:bg-slate-800">
                   <span className="text-slate-400 uppercase tracking-widest text-xs font-bold">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayOfWeek]}</span>
                   <span className={h.isOpen ? 'text-white' : 'text-blue-500/50 font-bold'}>
                     {h.isOpen ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}` : 'CLOSED'}
                   </span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="p-12 text-center border-t border-slate-100">
        <p className="text-[10px] tracking-[0.4em] text-slate-400 uppercase">© 2026 {business.name} — POWERED BY LOKALWEB</p>
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
