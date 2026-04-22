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
    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#2563eb] -translate-y-1/2" />
    <div className="absolute left-1/2 top-0 h-full w-0.5 bg-[#2563eb] -translate-x-1/2" />
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

  const todayName = ['Sunday','Monday','Tuesday','Wednesday',
                     'Thursday','Friday','Saturday'][new Date().getDay()]

  const clinicStats = [
    { value: '15+', label: 'Years of Experience' },
    { value: `${services.length}`, label: 'Services Offered' },
    { value: '4.9★', label: 'Average Rating' },
    { value: '2,000+', label: 'Patients Served' },
  ]

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-8 md:px-16">
        <div className="flex items-center">
          <BlueCross />
          <span className="text-[#1a1a2e] text-sm font-semibold tracking-wide ml-3">{business.name}</span>
        </div>
        <div className="hidden md:flex gap-10">
          {[["services", "Services"], ["team", "Our Team"], ["hours", "Hours"], ["contact", "Contact"]].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-[#6b7280] text-sm hover:text-[#1a1a2e] transition-colors">
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => openBooking()} className="bg-[#2563eb] text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-[#1d4ed8] transition-colors">
          {business.ctaPrimary || 'Book Consultation'}
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-[88vh] grid grid-cols-1 md:grid-cols-2 bg-[#f8f9fa]">
        <div className="flex flex-col justify-center px-8 md:px-16 py-20">
          <div className="inline-flex items-center gap-2 mb-8 bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-4 py-1.5 w-fit">
            <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
            <span className="text-[#2563eb] text-xs font-medium">Accepting New Patients</span>
          </div>
          <h1 className="text-[#1a1a2e] font-semibold leading-tight mb-6" style={{ fontSize: "3rem", lineHeight: "1.15" }}>
            {business.heroHeadline || 'Your Health Deserves Expert Care'}
          </h1>
          <p className="text-[#6b7280] text-lg font-normal leading-relaxed max-w-md mb-10">
            {business.heroSubheadline ?? business.description ??
            "We provide evidence-based medicine with a compassionate approach. Your wellbeing is our highest priority."}
          </p>
          <div className="flex flex-wrap gap-6 mb-10">
            {["Licensed Professionals", "Modern Equipment", "Patient Confidentiality"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#2563eb]" />
                <span className="text-[#6b7280] text-sm">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => openBooking()} className="bg-[#2563eb] text-white font-medium text-sm px-6 py-3 rounded-md hover:bg-[#1d4ed8] transition-colors">
              {business.ctaPrimary || 'Book Consultation'}
            </button>
            <button onClick={() => scrollTo("services")} className="border border-[#e5e7eb] text-[#1a1a2e] font-medium text-sm px-6 py-3 rounded-md hover:border-[#2563eb] transition-colors">
              {business.ctaSecondary || 'View Services'}
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden min-h-[400px]">
          <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=80" alt="Modern medical facility" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute bottom-8 left-8 bg-white rounded-xl shadow-lg p-5 w-52 border border-[#e5e7eb]">
            <p className="text-[#1a1a2e] font-semibold text-xl mb-1">4.9 ★</p>
            <p className="text-[#6b7280] text-xs mb-3">Patient Rating</p>
            <div className="w-full h-px bg-[#e5e7eb] mb-3" />
            <p className="text-[#6b7280] text-xs">2,000+ patients served</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white border-y border-[#e5e7eb] py-10 px-8 md:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {clinicStats.map((s) => (
            <div key={s.label}>
              <p className="text-[#2563eb] font-semibold text-3xl mb-1">{s.value}</p>
              <p className="text-[#6b7280] text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-[#f8f9fa] py-24 px-8 md:px-16">
        <div className="max-w-5xl mx-auto mb-14 text-center">
          <span className="bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Medical Services</span>
          <h2 className="text-[#1a1a2e] font-semibold text-3xl mb-4">What We Treat</h2>
          <p className="text-[#6b7280] text-base max-w-xl mx-auto">Comprehensive healthcare services delivered by experienced professionals.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.length === 0 ? (
            <div className="col-span-3 py-20 text-center 
                text-[#9ca3af] text-sm">
              Services coming soon
            </div>
          ) : (
            services.map((s) => (
              <div
                key={s.id}
                className="group bg-white rounded-xl p-6 border 
                border-[#e5e7eb] hover:border-[#2563eb]/30 
                hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => openBooking(s)}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[#1a1a2e] font-semibold text-base">
                    {s.name}
                  </span>
                  <span className="bg-[#eff6ff] text-[#2563eb] text-xs 
                      font-medium px-2.5 py-1 rounded-full">
                    €{s.price}
                  </span>
                </div>
                <p className="text-[#6b7280] text-sm leading-relaxed mb-6">
                  {s.description ?? ''}
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#9ca3af]" />
                    <span className="text-[#9ca3af] text-xs">
                      {s.durationMinutes} min
                    </span>
                  </div>
                  <span className="text-[#2563eb] text-xs font-medium 
                      opacity-0 group-hover:opacity-100 transition-opacity">
                    Book →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* TEAM */}
      {business.showTeam !== false && (
      <section id="team" className="bg-white py-24 px-8 md:px-16">
        <div className="max-w-5xl mx-auto mb-14 text-center">
          <span className="bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Our Specialists</span>
          <h2 className="text-[#1a1a2e] font-semibold text-3xl mb-4">Meet the Team</h2>
          <p className="text-[#6b7280] text-base max-w-xl mx-auto">Experienced, licensed professionals dedicated to your care.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Dr. Arben Krasniqi',
              title: 'General Practitioner',
              photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80'
            },
            {
              name: 'Dr. Fjolla Berisha',
              title: 'Cardiologist',
              photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80'
            },
            {
              name: 'Dr. Besart Morina',
              title: 'Dermatologist',
              photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
            },
          ].map((t) => (
            <div key={t.name}>
              <div className="w-full aspect-square overflow-hidden 
                  rounded-xl mb-5">
                <img
                  src={t.photo}
                  alt={t.name}
                  className="w-full h-full object-cover object-top"
                  style={{ filter: 'grayscale(20%)' }}
                />
              </div>
              <h3 className="text-[#1a1a2e] font-semibold text-base mb-1">
                {t.name}
              </h3>
              <p className="text-[#2563eb] text-sm mb-1">{t.title}</p>
              <div className="w-8 h-0.5 bg-[#e5e7eb] mt-3" />
            </div>
          ))}
        </div>
      </section>
      )}

      {/* HOURS & CONTACT */}
      <section className="bg-[#f8f9fa] py-24 px-8 md:px-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16">
          <div id="hours" className="bg-white rounded-xl p-8 border border-[#e5e7eb]">
            <span className="bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Schedule</span>
            <h2 className="text-[#1a1a2e] font-semibold text-2xl mb-6">Clinic Hours</h2>
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
                          ? 'border-b border-[#f3f4f6]' 
                          : ''
                      }`}
                    >
                      <span className={
                        isToday
                          ? 'text-[#1a1a2e] font-medium text-sm'
                          : 'text-[#6b7280] text-sm'
                      }>
                        {dayName}
                      </span>
                      <span className={
                        !h.isOpen
                          ? 'text-[#9ca3af] text-sm'
                          : 'text-[#1a1a2e] text-sm'
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
          <div id="contact" className="bg-white rounded-xl p-8 border border-[#e5e7eb]">
            <span className="bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">Contact</span>
            <h2 className="text-[#1a1a2e] font-semibold text-2xl mb-6">Book an Appointment</h2>
            <p className="text-[#6b7280] text-sm leading-relaxed mb-4">{business.address}</p>
            <p className="text-[#1a1a2e] font-semibold text-lg mb-8">{business.phone}</p>
            <a href={`tel:${business.phone}`} className="bg-[#2563eb] text-white font-medium text-sm rounded-md w-full py-4 flex items-center justify-center gap-2 hover:bg-[#1d4ed8] transition-colors">
              <Phone size={16} />Call to Book
            </a>
            <a href={`https://wa.me/${(
                    business.socialLinks?.whatsapp ??
                    business.phone ?? ''
                  ).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="border border-[#e5e7eb] text-[#6b7280] text-sm rounded-md w-full py-3.5 mt-3 flex items-center justify-center gap-2 hover:border-[#2563eb]/30 hover:text-[#2563eb] transition-colors">
              <MessageCircle size={16} />WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#e5e7eb] py-8 px-8 md:px-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BlueCross size={5} />
            <span className="text-[#1a1a2e] text-sm font-semibold">{business.name}</span>
          </div>
          <span className="text-[#9ca3af] text-xs">© {new Date().getFullYear()} {business.name}. All rights reserved.</span>
          <span className="text-[#9ca3af] text-xs">Powered by LokalWeb</span>
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
