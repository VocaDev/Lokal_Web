'use client'

import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import { Clock, Phone, Calendar } from 'lucide-react'
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

export default function RestaurantTemplate({ business, services, hours }: Props) {
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
          {business.ctaPrimary || 'Reserve a Table'}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center overflow-hidden">
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
            <div className="absolute inset-0 bg-black/65 z-0" />
          </>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0f00 60%, #0a0a0f 100%)',
            }}
          />
        )}

        <div className="relative z-10 px-6 max-w-3xl">
          <div className="bg-white/10 text-white/60 text-xs rounded-full px-3 py-1 mb-6 inline-block tracking-widest uppercase">
            {business.industry.replace('-', ' ')}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4">
            {business.heroHeadline || business.name}
          </h1>
          <p className="text-lg text-white/65 max-w-xl mx-auto mb-10">{business.heroSubheadline || business.description}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => handleScroll('services')}
              className="border border-white/25 text-white rounded-lg px-7 py-3 font-semibold hover:bg-white/8 transition-colors"
            >
              {business.ctaSecondary || 'View Menu'}
            </button>
            <button
              onClick={() => openBooking()}
              className="text-white font-semibold rounded-lg px-7 py-3 transition-all hover:opacity-90"
              style={{ backgroundColor: business.accentColor }}
            >
              {business.ctaPrimary || 'Reserve a Table'}
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

      {/* MENU */}
      <section id="services" className="py-20 px-4 md:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Our Menu</h2>
            <div
              className="w-12 h-1 rounded-full mb-10"
              style={{ backgroundColor: business.accentColor }}
            />
          </div>

          {services.length === 0 ? (
            <p className="text-center text-[#5a5a7a]">Menu coming soon</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <div
                  key={service.id}
                  className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-5 flex items-start justify-between gap-4 hover:border-[rgba(120,120,255,0.25)] transition-all duration-200"
                >
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-[#e8e8f0]">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-[#8888aa] mt-1 leading-relaxed">{service.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-[#5a5a7a]">
                      <Clock className="h-3 w-3" />
                      Prep: {service.durationMinutes} min
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="text-2xl font-black"
                      style={{ color: business.accentColor }}
                    >
                      €{service.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RESERVATION NOTE */}
      <section className="py-16 px-4 md:px-8 bg-[#0f0f1a]">
        <div className="max-w-2xl mx-auto text-center">
          <Calendar className="h-10 w-10 mx-auto mb-4 text-[#8888aa]" />
          <h2 className="text-2xl font-bold text-[#e8e8f0] mb-3">Reservations</h2>
          <p className="text-[#8888aa] mb-6">
            For groups of 6 or more, please contact us directly to reserve your table.
          </p>
          {business.phone && (
            <a href={`tel:${business.phone}`}>
              <button className="border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] rounded-lg px-6 py-3 font-semibold hover:bg-[#1e1e35] transition-colors inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {business.phone}
              </button>
            </a>
          )}
        </div>
      </section>

      {/* HOURS */}
      <section className="py-20 px-4 md:px-8 bg-[#0a0a0f]">
        <div className="max-w-2xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Kitchen Hours</h2>
            <div
              className="w-12 h-1 rounded-full mb-10"
              style={{ backgroundColor: business.accentColor }}
            />
          </div>
          <HoursSection hours={hours} />
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-4 md:px-8 bg-[#0f0f1a]">
        <div className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Come Visit Us</h2>
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