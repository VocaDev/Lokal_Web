'use client'

import { useState } from 'react'
import { Phone, MessageCircle, ChevronDown } from 'lucide-react'
import { Business, Service, BusinessHours } from '@/lib/types'
import RestaurantBookingDrawer from '@/components/templates/shared/RestaurantBookingDrawer'

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const RestaurantBistro = ({ business, services, hours }: {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const openReservation = () => setDrawerOpen(true)

  return (
    <div className="bg-[#0d0d0d] text-white min-h-screen">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-white/[0.08] h-16 flex items-center justify-between px-8 md:px-12">
        <span className="font-black text-sm tracking-[0.25em] uppercase">{business.name.toUpperCase()}</span>
        <div className="hidden md:flex gap-10">
          {['Menu', 'Story', 'Hours'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
        <button
          onClick={openReservation}
          className="bg-[#d97706] text-black font-bold text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-[#b45309] transition-colors"
        >
          {business.ctaPrimary || 'Reserve a Table'}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-screen relative flex flex-col items-center justify-center">
        <img
          src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=80"}
          alt="Restaurant interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <span className="inline-block mb-8 bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] text-xs tracking-[0.4em] uppercase px-4 py-2">
            Est. 2018 · Prishtina
          </span>
          <h1>
            {business.heroHeadline ? (
              <span className="block font-black leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', letterSpacing: '-0.02em' }}>
                {business.heroHeadline}
              </span>
            ) : (
              <>
                <span className="block font-black leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', letterSpacing: '-0.02em' }}>
                  WHERE EVERY
                </span>
                <span className="block text-[#d97706] font-black leading-none -mt-2" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', letterSpacing: '-0.02em' }}>
                  PLATE TELLS A STORY
                </span>
              </>
            )}
          </h1>
          <p className="mt-8 text-white/50 text-base font-light tracking-wide">
            {business.heroSubheadline || business.description || 'New York soul. Kosovo heart. Open daily.'}
          </p>
          <div className="mt-12 flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => scrollTo('menu')}
              className="border-2 border-white text-white font-bold text-xs tracking-widest uppercase px-8 py-4 hover:bg-white hover:text-black transition-colors"
            >
              {(business.ctaSecondary || 'VIEW MENU').toUpperCase()}
            </button>
            <button
              onClick={openReservation}
              className="bg-[#d97706] text-black font-bold text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#b45309] transition-colors"
            >
              {(business.ctaPrimary || 'RESERVE A TABLE').toUpperCase()}
            </button>
          </div>
        </div>
        <div className="absolute bottom-10 flex flex-col items-center">
          <span className="text-white/20 text-[9px] tracking-[0.4em] uppercase">SCROLL</span>
          <div className="w-px h-8 bg-white/20 mt-2 animate-pulse" />
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="bg-[#0d0d0d] py-28 px-8 md:px-12">
        <div className="max-w-4xl mx-auto mb-16 flex justify-between items-end">
          <div>
            <p className="text-[#d97706] text-xs tracking-[0.4em] uppercase mb-3">— The Menu</p>
            <h2 className="font-black" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.02em' }}>
              WHAT WE SERVE
            </h2>
          </div>
          <p className="hidden md:block text-white/25 text-xs tracking-widest uppercase text-right max-w-40">
            Seasonal ingredients. Daily specials.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          {services.length === 0 ? (
            <div className="py-20 text-center text-white/25 text-sm tracking-widest uppercase">
              Menu coming soon
            </div>
          ) : (
            services.map((item) => (
              <div key={item.id} className="py-7 border-b border-white/[0.07] group">
                <div className="flex justify-between items-baseline gap-4">
                  <span className="text-white font-bold text-lg md:text-xl tracking-wide group-hover:text-[#d97706] transition-colors">
                    {item.name}
                  </span>
                  <span className="flex-1 border-b border-dotted border-white/15 self-end mb-1 hidden md:block" />
                  <span className="text-[#d97706] font-black text-xl md:text-2xl shrink-0">
                    €{item.price}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-2 text-white/40 text-sm font-light leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ABOUT */}
      <section id="story" className="bg-[#111111] py-28 px-8 md:px-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.2fr] gap-16 items-center">
          <div>
            <p className="text-[#d97706] text-xs tracking-[0.4em] uppercase mb-6">— Our Story</p>
            <h2 className="font-black text-3xl md:text-4xl leading-tight mb-8" style={{ letterSpacing: '-0.02em' }}>
              FOOD IS OUR LANGUAGE
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-10 font-light">
              {business.aboutCopy ?? business.description ?? "Born from a love of bold flavors and honest cooking, we bring the energy of a great neighborhood restaurant to your city. Every dish is made from scratch, every day."}
            </p>
            <div className="flex gap-10 pt-10 border-t border-white/[0.07]">
              {[
                { num: '6', label: 'YEARS OPEN' },
                { num: '100%', label: 'SCRATCH KITCHEN' },
                { num: 'Daily', label: 'FRESH SPECIALS' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[#d97706] font-black text-3xl">{s.num}</div>
                  <div className="text-white/30 text-[10px] tracking-widest uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-96 md:h-[500px] overflow-hidden">
            <img
              src={business.galleryImages?.[1] ?? "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"}
              alt="Plated dish"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* HOURS & CONTACT */}
      <section id="hours" className="bg-[#0d0d0d] py-28 px-8 md:px-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <p className="text-[#d97706] text-xs tracking-[0.4em] uppercase mb-6">— Kitchen Hours</p>
            <h2 className="font-black text-2xl mb-10">WHEN WE'RE OPEN</h2>
            {(() => {
              const dayNames = [
                'Sunday','Monday','Tuesday','Wednesday',
                'Thursday','Friday','Saturday'
              ]
              const todayIdx = new Date().getDay()
              return hours
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((h) => {
                  const isToday = h.dayOfWeek === todayIdx
                  const isClosed = !h.isOpen
                  return (
                    <div key={h.dayOfWeek}
                         className="flex justify-between py-4 border-b border-white/[0.06]">
                      <span className={`text-xs tracking-widest uppercase ${isToday ? 'text-white font-medium' : 'text-white/50'}`}>
                        {dayNames[h.dayOfWeek]}
                        {isToday && ' ·'}
                      </span>
                      <span className={`text-xs font-mono tracking-wider ${isClosed ? 'text-white/30' : 'text-white/60'}`}>
                        {h.isOpen
                          ? `${h.openTime.slice(0,5)} – ${h.closeTime.slice(0,5)}`
                          : 'CLOSED'}
                      </span>
                    </div>
                  )
                })
            })()}
          </div>
          <div id="contact">
            <p className="text-[#d97706] text-xs tracking-[0.4em] uppercase mb-6">— Reservations</p>
            <h2 className="font-black text-2xl mb-10">FIND US</h2>
            <p className="text-white/50 text-sm font-light leading-loose mb-6">{business.address}</p>
            <p className="text-white font-bold text-lg mb-10">{business.phone}</p>
            <a
              href={`tel:${business.phone}`}
              className="bg-[#d97706] text-black font-bold text-xs tracking-widest uppercase w-full py-5 flex items-center justify-center gap-3 hover:bg-[#b45309] transition-colors"
            >
              <Phone size={16} />
              CALL TO RESERVE
            </a>
            <a
              href={`https://wa.me/${(
                business.socialLinks?.whatsapp ??
                business.phone ?? ''
              ).replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white/60 font-light text-xs tracking-widest uppercase w-full py-4 mt-3 flex items-center justify-center gap-3 hover:border-white/40 hover:text-white transition-colors"
            >
              <MessageCircle size={16} />
              WHATSAPP
            </a>
          </div>
        </div>
      </section>

      <RestaurantBookingDrawer
        business={business}
        hours={hours}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] py-10 px-8 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-black text-sm tracking-[0.2em]">{business.name.toUpperCase()}</span>
          <span className="text-white/20 text-[10px] tracking-widest uppercase">© {new Date().getFullYear()} All rights reserved</span>
          <span className="text-white/15 text-[10px] tracking-widest uppercase">Powered by LokalWeb</span>
        </div>
      </footer>
    </div>
  );
};

export default RestaurantBistro;
