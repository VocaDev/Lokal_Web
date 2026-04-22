'use client'

import { useState } from 'react'
import { Business, Service, BusinessHours } from '@/lib/types'
import { Clock, Plus, Shield, Heart, Phone } from 'lucide-react'
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

export default function ClinicTemplate({ business, services, hours }: Props) {
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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-[#e8e8f0]">{business.name}</h1>
          <span className="bg-blue-400/10 text-blue-400 text-xs rounded-full px-2 py-0.5 border border-blue-400/20">
            Medical Clinic
          </span>
        </div>
        <button
          onClick={() => openBooking()}
          className="text-white font-semibold rounded-lg px-5 py-2 text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: business.accentColor }}
        >
          {business.ctaPrimary || 'Book Consultation'}
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
            <div className="absolute inset-0 bg-black/75 z-0" />
          </>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(160deg, #0a0a0f 0%, #0a0f1a 50%, #0a0a0f 100%)',
            }}
          />
        )}

        <div className="relative z-10 px-6 max-w-3xl">
          <div
            className="h-12 w-12 mx-auto mb-6 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${business.accentColor}33` }}
          >
            <Plus className="h-6 w-6" style={{ color: business.accentColor }} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            {business.heroHeadline || business.name}
          </h1>
          <p className="text-sm uppercase tracking-[0.25em] text-white/40 mb-4">Your Health, Our Priority</p>
          <p className="text-base text-white/65 max-w-lg mx-auto mb-10">{business.heroSubheadline || business.description}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => handleScroll('services')}
              className="border border-white/20 text-white/80 rounded-lg px-6 py-3 font-semibold hover:bg-white/8 transition-colors"
            >
              {business.ctaSecondary || 'Our Services'}
            </button>
            <button
              onClick={() => openBooking()}
              className="text-white font-semibold rounded-lg px-6 py-3 transition-all hover:opacity-90"
              style={{ backgroundColor: business.accentColor }}
            >
              {business.ctaPrimary || 'Book Consultation'}
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
            {open ? 'Accepting Patients' : 'Currently Closed'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {services.map(service => (
                <div
                  key={service.id}
                  className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6 hover:border-[rgba(120,120,255,0.25)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-[#e8e8f0]">{service.name}</h3>
                    <span
                      className="text-xl font-black"
                      style={{ color: business.accentColor }}
                    >
                      €{service.price}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-[#8888aa] mt-2 leading-relaxed">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgba(120,120,255,0.08)]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#5a5a7a]" />
                      <span className="text-xs text-[#5a5a7a]">{service.durationMinutes} min consultation</span>
                    </div>
                    <button
                      onClick={() => openBooking(service)}
                      className="border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] text-sm rounded-lg px-4 py-1.5 hover:bg-[#1e1e35] transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-16 px-4 md:px-8 bg-[#0f0f1a]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left Column */}
            <div>
              <h2 className="text-2xl font-bold text-[#e8e8f0] mb-4">About Our Clinic</h2>
              <p className="text-[#8888aa] leading-relaxed mb-6">
                {business.aboutCopy || business.description || 'We are committed to providing compassionate, evidence-based healthcare to our community. Our experienced team is here to support your wellbeing.'}
              </p>
              {business.phone && (
                <a href={`tel:${business.phone}`}>
                  <button className="border border-[rgba(120,120,255,0.22)] text-[#e8e8f0] rounded-lg px-5 py-2.5 font-semibold hover:bg-[#1e1e35] transition-colors inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Call Us
                  </button>
                </a>
              )}
            </div>

            {/* Right Column - Trust Stats */}
            <div>
              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-4 mb-3 flex items-center gap-4">
                <div
                  className="flex items-center justify-center h-8 w-8 rounded-lg"
                  style={{ backgroundColor: `${business.accentColor}22` }}
                >
                  <Shield className="h-5 w-5" style={{ color: business.accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#e8e8f0]">Certified Professionals</p>
                  <p className="text-xs text-[#8888aa]">Licensed and experienced staff</p>
                </div>
              </div>

              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-4 mb-3 flex items-center gap-4">
                <div
                  className="flex items-center justify-center h-8 w-8 rounded-lg"
                  style={{ backgroundColor: `${business.accentColor}22` }}
                >
                  <Clock className="h-5 w-5" style={{ color: business.accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#e8e8f0]">Flexible Hours</p>
                  <p className="text-xs text-[#8888aa]">Morning and evening appointments</p>
                </div>
              </div>

              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-4 flex items-center gap-4">
                <div
                  className="flex items-center justify-center h-8 w-8 rounded-lg"
                  style={{ backgroundColor: `${business.accentColor}22` }}
                >
                  <Heart className="h-5 w-5" style={{ color: business.accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#e8e8f0]">Patient First</p>
                  <p className="text-xs text-[#8888aa]">Compassionate care always</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOURS */}
      <section className="py-20 px-4 md:px-8 bg-[#0a0a0f]">
        <div className="max-w-2xl mx-auto">
          <div>
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Clinic Hours</h2>
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
            <h2 className="text-3xl font-black text-[#e8e8f0] mb-2">Contact & Location</h2>
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