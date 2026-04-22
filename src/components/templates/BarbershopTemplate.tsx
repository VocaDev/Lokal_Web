'use client'

import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import { Clock } from 'lucide-react'
import HoursSection from './shared/HoursSection'
import ContactSection from './shared/ContactSection'
import BookingDrawer from '@/components/templates/shared/BookingDrawer'

type Props = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}

function isCurrentlyOpen(hours: BusinessHours[]): boolean {
  const now = new Date()
  const today = hours.find(h => h.dayOfWeek === now.getDay())
  if (!today?.isOpen) return false
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return current >= today.openTime && current < today.closeTime
}

export default function BarbershopTemplate({ business, services, hours }: Props) {
  const open = isCurrentlyOpen(hours)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerService, setDrawerService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null)
    setDrawerOpen(true)
  }

  const handleScroll = (elementId: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[rgba(120,120,255,0.12)] h-16 flex items-center justify-between px-6">
        <h1 className="text-lg font-bold text-[#e8e8f0]">{business.name}</h1>
        <button
          onClick={() => openBooking()}
          className="text-white font-semibold rounded-lg px-5 py-2 text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: business.accentColor }}
        >
          {business.ctaPrimary || 'Book Now'}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center overflow-hidden">
        {business.galleryImages && business.galleryImages[0] ? (
          <>
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${business.galleryImages[0]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-black/70 z-0" />
          </>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{
              background: `linear-gradient(135deg, #0a0a0f 0%, ${business.accentColor}22 100%)`,
            }}
          />
        )}

        <div className="relative z-10 px-6 max-w-3xl">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-20 w-20 rounded-xl object-contain mb-6 mx-auto"
            />
          )}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            {business.heroHeadline || business.name}
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto mb-8">{business.heroSubheadline || business.description}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => handleScroll('services')}
              className="border-2 border-white/30 text-white rounded-lg px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
            >
              {business.ctaSecondary || 'View Services'}
            </button>
            <button
              onClick={() => openBooking()}
              className="text-white font-semibold rounded-lg px-6 py-3 transition-all hover:opacity-90"
              style={{ backgroundColor: business.accentColor }}
            >
              {business.ctaPrimary || 'Book Appointment'}
            </button>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border ${
              open
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: open ? '#4ade80' : '#f87171',
              }}
            />
            {open ? 'Open Now' : 'Closed'}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-20 px-4 md:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Our Services</h2>
            <div
              className="w-12 h-1 rounded-full mb-10"
              style={{ backgroundColor: business.accentColor }}
            />
          </div>

          {services.length === 0 ? (
            <p className="text-center text-[#5a5a7a]">Services coming soon</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map(service => (
                <div
                  key={service.id}
                  className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6 hover:border-[rgba(120,120,255,0.25)] hover:translate-y-[-2px] transition-all duration-200"
                >
                  <h3 className="text-lg font-bold text-[#e8e8f0]">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[#8888aa] mt-1">{service.description}</p>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#5a5a7a]" />
                      <span className="text-sm text-[#8888aa]">{service.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-2xl font-black"
                        style={{ color: business.accentColor }}
                      >
                        €{service.price}
                      </span>
                      <button
                        onClick={() => openBooking(service)}
                        className="text-sm font-semibold text-white rounded-lg px-4 py-2 transition-all hover:opacity-90"
                        style={{ backgroundColor: business.accentColor }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOURS */}
      <section className="py-20 px-4 md:px-8 bg-[#0f0f1a]">
        <div className="max-w-2xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Opening Hours</h2>
            <div
              className="w-12 h-1 rounded-full mb-10"
              style={{ backgroundColor: business.accentColor }}
            />
          </div>
          <HoursSection hours={hours} />
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-4 md:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Find Us</h2>
            <div
              className="w-12 h-1 rounded-full mb-10"
              style={{ backgroundColor: business.accentColor }}
            />
          </div>
          <ContactSection business={business} />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-[rgba(120,120,255,0.12)] text-center">
        <p className="text-sm font-semibold text-[#e8e8f0]">{business.name}</p>
        <p className="text-xs text-[#5a5a7a] mt-1">
          Powered by{' '}
          <a href="/" className="text-[#4f8ef7] hover:underline">
            LokalWeb
          </a>
        </p>
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