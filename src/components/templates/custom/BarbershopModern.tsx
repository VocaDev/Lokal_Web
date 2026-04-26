'use client'

import { useState, useEffect } from 'react'
import { Phone, MessageCircle } from 'lucide-react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const BarbershopModern = ({ business, services, hours }: {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}) => {
  const heroImg = business.gallerySections?.hero?.[0];
  const storyImg = business.gallerySections?.story?.[0];
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerService, setDrawerService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null)
    setDrawerOpen(true)
  }

  const currentYear = new Date().getFullYear();
  const yearsActive = business.foundedYear ? currentYear - business.foundedYear : null;

  return (
    <div className="bg-background min-h-screen text-white font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-background border-b border-white/[0.06] h-14 flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-white/40" />
          <span className="text-white text-xs tracking-[0.2em] uppercase font-light">{business.name}</span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          {['Services', 'Story', 'Hours'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors font-light"
            >
              {item}
            </button>
          ))}
        </div>
        <button
          onClick={() => openBooking()}
          className="text-white text-xs tracking-[0.3em] uppercase font-light underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
        >
          {business.ctaPrimary || 'Book'}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-screen grid grid-cols-1 md:grid-cols-[1fr_1.4fr]">
        <div className="bg-background flex flex-col justify-end pb-20 pl-6 md:pl-10 pr-8 pt-32 relative">
          <span className="absolute top-32 left-6 md:left-10 text-white/25 text-xs tracking-[0.3em] uppercase">
            No. 01 — Barbershop
          </span>
          <div className="w-8 h-px bg-white/20 mb-8" />
          {business.heroHeadline ? (
            <h1 className="font-light text-5xl md:text-7xl tracking-[0.15em] uppercase text-white">
              {business.heroHeadline}
            </h1>
          ) : (
            <>
              <h1 className="font-light text-5xl md:text-7xl tracking-[0.15em] uppercase text-white">
                PRECISION
              </h1>
              <h1 className="font-light text-5xl md:text-7xl tracking-[0.15em] uppercase text-white/40 -mt-2">
                & CRAFT
              </h1>
            </>
          )}
          {business.heroSubheadline && (
            <p className="mt-6 text-white/50 text-sm font-light leading-relaxed max-w-md">
              {business.heroSubheadline}
            </p>
          )}
          <div className="mt-16 flex items-center gap-8">
            <button
              onClick={() => scrollTo('services')}
              className="text-white/60 text-xs tracking-widest uppercase hover:text-white transition-colors font-light"
            >
              {business.ctaSecondary || 'View Services →'}
            </button>
            <button
              onClick={() => scrollTo('story')}
              className="text-white/30 text-xs tracking-widest uppercase hover:text-white/60 transition-colors font-light"
            >
              Our Story →
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden min-h-[60vh] md:min-h-0">
          {heroImg ? (
            <img
              src={heroImg!}
              alt={business.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20" />
          )}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent" />
          {(business.foundedYear || business.address) && (
            <div className="absolute bottom-10 left-0 md:left-[-20px] bg-background border border-white/10 p-5 w-44">
              {business.foundedYear && (
                <p className="text-white/30 text-[10px] tracking-widest uppercase mb-1">
                  Est. {business.foundedYear}
                </p>
              )}
              {business.address && (
                <p className="text-white text-sm font-light line-clamp-1">{business.address}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-background py-32 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-20">
            <div>
              <p className="text-white/20 text-[10px] tracking-[0.4em] uppercase mb-3">02 — Services</p>
              <h2 className="text-white font-light text-4xl tracking-wide">What We Do</h2>
            </div>
            <p className="text-white/20 text-[10px] tracking-widest uppercase text-right max-w-[8rem] hidden md:block">
              All services include consultation
            </p>
          </div>
          {services.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-8 border-b border-white/[0.06] group cursor-pointer"
              onClick={() => openBooking(s)}
            >
              <div className="flex items-center">
                <span className="text-white/15 text-xs tracking-widest mr-8 font-mono shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-white font-light text-xl tracking-wide group-hover:text-white/60 transition-colors">
                  {s.name}
                </span>
              </div>
              <span className="text-white/30 text-sm font-light hidden md:block flex-1 mx-8">
                {s.description ?? ''}
              </span>
              <div className="flex items-center gap-8">
                <span className="text-white/25 text-xs tracking-widest font-mono hidden sm:inline">
                  {s.durationMinutes} MIN
                </span>
                <span className="text-white font-light text-xl">
                  €{s.price}
                </span>
                <span className="text-white/0 group-hover:text-white/40 transition-colors text-sm">→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="bg-card py-32 px-6 md:px-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-16 md:gap-24 items-center">
          <div className="aspect-[3/4] overflow-hidden">
            {storyImg ? (
              <img
                src={storyImg!}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/10" />
            )}
          </div>
          <div>
            <p className="text-white/20 text-[10px] tracking-[0.4em] uppercase mb-6">03 — Story</p>
            <h2 className="text-white font-light text-3xl tracking-wide mb-8">
              {business.tagline ?? business.name}
            </h2>
            {(business.aboutCopy ?? business.description) && (
              <p className="text-white/40 text-sm leading-loose font-light mb-10">
                {business.aboutCopy ?? business.description}
              </p>
            )}
            {(yearsActive || services.length > 0) && (
              <div className="flex gap-16 mt-10 pt-10 border-t border-white/[0.06]">
                {yearsActive && yearsActive > 0 && (
                  <div>
                    <p className="text-white font-light text-3xl tracking-wide">{yearsActive}+</p>
                    <p className="text-white/25 text-[10px] tracking-widest uppercase mt-2">
                      {yearsActive === 1 ? 'Year' : 'Years'}
                    </p>
                  </div>
                )}
                {services.length > 0 && (
                  <div>
                    <p className="text-white font-light text-3xl tracking-wide">{services.length}</p>
                    <p className="text-white/25 text-[10px] tracking-widest uppercase mt-2">Services</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HOURS */}
      <section id="hours" className="bg-background py-32 px-6 md:px-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 md:gap-32">
          <div>
            <p className="text-white/20 text-[10px] tracking-[0.4em] uppercase mb-6">04 — Hours</p>
            <h2 className="text-white font-light text-3xl tracking-wide mb-12">When We're Open</h2>
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
                  return (
                    <div key={h.dayOfWeek}
                         className="flex justify-between items-center py-5 border-b border-white/[0.05]">
                      <span className={`text-xs tracking-[0.2em] uppercase font-light ${isToday ? 'text-white' : 'text-white/40'}`}>
                        {dayNames[h.dayOfWeek]}
                      </span>
                      <span className="text-white/60 text-xs font-mono tracking-wider">
                        {h.isOpen
                          ? `${h.openTime.slice(0,5)} – ${h.closeTime.slice(0,5)}`
                          : 'CLOSED'}
                      </span>
                    </div>
                  )
                })
            })()}
          </div>
          <div>
            <p className="text-white/20 text-[10px] tracking-[0.4em] uppercase mb-6">05 — Contact</p>
            <h2 className="text-white font-light text-3xl tracking-wide mb-12">Find Us</h2>
            <p className="text-white/40 text-sm font-light leading-loose mb-6">
              {business.address}
            </p>
            <p className="text-white text-sm font-light mb-10">{business.phone}</p>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-3 text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors font-light border-l border-white/20 pl-4 hover:border-white/60"
              >
                <Phone size={12} /> Call Us
              </a>
              <a
                href={`https://wa.me/${(
                  business.socialLinks?.whatsapp || 
                  business.phone || ''
                ).replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/40 text-xs tracking-widest uppercase hover:text-white transition-colors font-light border-l border-white/20 pl-4 hover:border-white/60"
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <BookingDrawer
        business={business}
        services={services}
        hours={hours}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialService={drawerService}
      />

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] py-10 px-6 md:px-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <span className="text-white/15 text-[10px] tracking-widest uppercase font-light">
            © {new Date().getFullYear()} {business.name}
          </span>
          <span className="text-white/10 text-[10px] tracking-widest uppercase font-light">Powered by LokalWeb</span>
        </div>
      </footer>
    </div>
  );
};

export default BarbershopModern;
