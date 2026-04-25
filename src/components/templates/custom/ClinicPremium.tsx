'use client'

import { useState } from 'react'
import { CheckCircle, Clock, Phone, MessageCircle } from 'lucide-react'
import { Business, Service, BusinessHours } from '@/lib/types'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

const BlueCross = ({ size = 7 }: { size?: number }) => (
  <div className={`w-${size} h-${size} relative`} style={{ width: size * 4, height: size * 4 }}>
    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary -translate-y-1/2" />
    <div className="absolute left-1/2 top-0 h-full w-0.5 bg-primary -translate-x-1/2" />
  </div>
);

const ClinicPremium = ({ business, services, hours }: {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerService, setDrawerService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null)
    setDrawerOpen(true)
  }

  const today = new Date();
  const todayName = ['Sunday','Monday','Tuesday','Wednesday',
                     'Thursday','Friday','Saturday'][today.getDay()]
  const yearsActive = business.foundedYear ? today.getFullYear() - business.foundedYear : null;

  // Stats are derived from real business data only — no fake review averages
  // or "patients served" numbers. Show the cards we can back with truth.
  const clinicStats = [
    yearsActive && yearsActive > 0
      ? { value: `${yearsActive}+`, label: yearsActive === 1 ? 'Year of Experience' : 'Years of Experience' }
      : null,
    services.length > 0
      ? { value: `${services.length}`, label: services.length === 1 ? 'Service Offered' : 'Services Offered' }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
    <div className="bg-background min-h-screen">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-8 md:px-16">
        <div className="flex items-center">
          <BlueCross />
          <span className="text-foreground text-sm font-semibold tracking-wide ml-3">{business.name}</span>
        </div>
        <div className="hidden md:flex gap-10">
          {[["services", "Services"], ["team", "Our Team"], ["hours", "Hours"], ["contact", "Contact"]].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => openBooking()} className="bg-primary text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-primary/90 transition-colors">
          {business.ctaPrimary || 'Book Consultation'}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-[88vh] grid grid-cols-1 md:grid-cols-2 bg-background">
        <div className="flex flex-col justify-center px-8 md:px-16 py-20">
          <div className="inline-flex items-center gap-2 mb-8 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 w-fit">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-primary text-xs font-medium">Accepting New Patients</span>
          </div>
          <h1 className="text-foreground font-semibold leading-tight mb-6" style={{ fontSize: "3rem", lineHeight: "1.15" }}>
            {business.heroHeadline || 'Your Health Deserves Expert Care'}
          </h1>
          <p className="text-muted-foreground text-lg font-normal leading-relaxed max-w-md mb-10">
            {business.heroSubheadline ?? business.description ??
            "We provide evidence-based medicine with a compassionate approach. Your wellbeing is our highest priority."}
          </p>
          <div className="flex flex-wrap gap-6 mb-10">
            {["Licensed Professionals", "Modern Equipment", "Patient Confidentiality"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-muted-foreground text-sm">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => openBooking()} className="bg-primary text-white font-medium text-sm px-6 py-3 rounded-md hover:bg-primary/90 transition-colors">
              {business.ctaPrimary || 'Book Consultation'}
            </button>
            <button onClick={() => scrollTo("services")} className="border border-border text-foreground font-medium text-sm px-6 py-3 rounded-md hover:border-primary transition-colors">
              {business.ctaSecondary || 'View Services'}
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden min-h-[400px]">
          {business.galleryImages?.[0] ? (
            <img
              src={business.galleryImages[0]}
              alt={business.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-accent/10" />
          )}
        </div>
      </section>

      {/* STATS — only shown when we have real numbers to back them. */}
      {clinicStats.length > 0 && (
        <section className="bg-card border-y border-border py-10 px-8 md:px-16">
          <div className={`max-w-5xl mx-auto grid ${clinicStats.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-8 text-center`}>
            {clinicStats.map((s) => (
              <div key={s.label}>
                <p className="text-primary font-semibold text-3xl mb-1">{s.value}</p>
                <p className="text-muted-foreground text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SERVICES */}
      <section id="services" className="bg-background py-24 px-8 md:px-16">
        <div className="max-w-5xl mx-auto mb-14 text-center">
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Medical Services</span>
          <h2 className="text-foreground font-semibold text-3xl mb-4">What We Treat</h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">Comprehensive healthcare services delivered by experienced professionals.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.length === 0 ? (
            <div className="col-span-3 py-20 text-center 
                text-muted-foreground/70 text-sm">
              Services coming soon
            </div>
          ) : (
            services.map((s) => (
              <div
                key={s.id}
                className="group bg-card rounded-xl p-6 border 
                border-border hover:border-primary/30 
                hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => openBooking(s)}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-foreground font-semibold text-base">
                    {s.name}
                  </span>
                  <span className="bg-primary/10 text-primary text-xs 
                      font-medium px-2.5 py-1 rounded-full">
                    €{s.price}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {s.description ?? ''}
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-muted-foreground/70" />
                    <span className="text-muted-foreground/70 text-xs">
                      {s.durationMinutes} min
                    </span>
                  </div>
                  <span className="text-primary text-xs font-medium 
                      opacity-0 group-hover:opacity-100 transition-opacity">
                    Book →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* TEAM section removed: hardcoded fake doctors with stock photos.
          Bring it back once tenants can upload team members from the dashboard. */}

      {/* HOURS & CONTACT */}
      <section className="bg-background py-24 px-8 md:px-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16">
          <div id="hours" className="bg-card rounded-xl p-8 border border-border">
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Schedule</span>
            <h2 className="text-foreground font-semibold text-2xl mb-6">Clinic Hours</h2>
            {(() => {
              const dayNames = [
                'Sunday','Monday','Tuesday','Wednesday',
                'Thursday','Friday','Saturday'
              ]
              return hours
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((h, i) => {
                  const dayName = dayNames[h.dayOfWeek]
                  const isToday = dayName === todayName
                  return (
                    <div
                      key={h.dayOfWeek}
                      className={`flex justify-between py-4 ${
                        i < hours.length - 1 
                          ? 'border-b border-border/60' 
                          : ''
                      }`}
                    >
                      <span className={
                        isToday
                          ? 'text-foreground font-medium text-sm'
                          : 'text-muted-foreground text-sm'
                      }>
                        {dayName}
                      </span>
                      <span className={
                        !h.isOpen
                          ? 'text-muted-foreground/70 text-sm'
                          : 'text-foreground text-sm'
                      }>
                        {h.isOpen
                          ? `${h.openTime.slice(0,5)} — ${h.closeTime.slice(0,5)}`
                          : 'CLOSED'}
                      </span>
                    </div>
                  )
                })
            })()}
          </div>
          <div id="contact" className="bg-card rounded-xl p-8 border border-border">
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Contact</span>
            <h2 className="text-foreground font-semibold text-2xl mb-6">Book an Appointment</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">{business.address}</p>
            <p className="text-foreground font-semibold text-lg mb-8">{business.phone}</p>
            <a href={`tel:${business.phone}`} className="bg-primary text-white font-medium text-sm rounded-md w-full py-4 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <Phone size={16} />Call to Book
            </a>
            <a href={`https://wa.me/${(
                    business.socialLinks?.whatsapp ??
                    business.phone ?? ''
                  ).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="border border-border text-muted-foreground text-sm rounded-md w-full py-3.5 mt-3 flex items-center justify-center gap-2 hover:border-primary/30 hover:text-primary transition-colors">
              <MessageCircle size={16} />WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-card border-t border-border py-8 px-8 md:px-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BlueCross size={5} />
            <span className="text-foreground text-sm font-semibold">{business.name}</span>
          </div>
          <span className="text-muted-foreground/70 text-xs">© {new Date().getFullYear()} {business.name}. All rights reserved.</span>
          <span className="text-muted-foreground/70 text-xs">Powered by LokalWeb</span>
        </div>
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
  );
};

export default ClinicPremium;
