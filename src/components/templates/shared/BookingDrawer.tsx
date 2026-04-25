'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { Business, Service, BusinessHours } from '@/lib/types'
import { addBooking } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { validateKosovoPhone } from '@/lib/validators'
import {
  AvailableSlot,
  BookedSlot,
  DEFAULT_TIMEZONE,
  fetchBookedSlots,
  generateAvailableSlots,
  isUniqueViolation,
  ymdInTz,
} from '@/lib/services/bookingService'

type BookingDrawerProps = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
  isOpen: boolean
  onClose: () => void
  initialService?: Service | null
}

export default function BookingDrawer({
  business,
  services,
  hours,
  isOpen,
  onClose,
  initialService,
}: BookingDrawerProps) {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(initialService ?? null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])
  const [slotConflict, setSlotConflict] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const tz = business.timezone || DEFAULT_TIMEZONE
  const supabase = useMemo(() => createClient(), [])

  const handleClose = () => {
    setStep(1)
    setSelectedService(initialService ?? null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setCustomerName('')
    setCustomerPhone('')
    setPhoneError(null)
    setIsSubmitting(false)
    setSlotConflict(false)
    setSubmitError(null)
    onClose()
  }

  // Skip step 1 if a service was pre-selected
  useEffect(() => {
    if (initialService && step === 1) {
      setSelectedService(initialService)
      setStep(2)
    }
  }, [initialService, step])

  // Fetch booked slots for the selected day via the public-safe RPC
  useEffect(() => {
    if (!selectedDate || !business.id) return
    let cancelled = false
    fetchBookedSlots(supabase, business.id, selectedDate, tz)
      .then((rows) => {
        if (!cancelled) setBookedSlots(rows)
      })
      .catch((e) => {
        console.error('[BookingDrawer] fetchBookedSlots failed', e)
        if (!cancelled) setBookedSlots([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, business.id, supabase, tz])

  const next7Days = useMemo(() => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      days.push(d)
    }
    return days
  }, [])

  const availableSlots: AvailableSlot[] = useMemo(() => {
    if (!selectedDate || !selectedService) return []
    return generateAvailableSlots({
      hours,
      serviceDurationMinutes: selectedService.durationMinutes,
      selectedDate,
      timeZone: tz,
      bookedSlots,
    })
  }, [selectedDate, selectedService, hours, bookedSlots, tz])

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || !business.id) return

    if (!validateKosovoPhone(customerPhone)) {
      setPhoneError('Enter a valid Kosovo phone number (e.g. +38344123456 or 044123456).')
      return
    }
    setPhoneError(null)
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await addBooking(business.id, {
        businessId: business.id,
        serviceId: selectedService.id,
        customerName,
        customerPhone,
        appointmentAt: selectedSlot.startUtc.toISOString(),
      })
      setStep(4)
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        // The DB-level partial unique index (migration 008) caught a race —
        // a concurrent booking just claimed this slot.
        setSlotConflict(true)
        setSelectedSlot(null)
        setStep(2)
      } else {
        console.error('Booking failed', err)
        setSubmitError('Failed to book appointment. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDisplayDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(date)
  }

  const accentBg = { backgroundColor: business.accentColor }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[360px] z-50 bg-card border-l border-border flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-foreground text-lg font-medium">
              {step === 1 && 'Book an appointment'}
              {step === 2 && 'Pick a date and time'}
              {step === 3 && 'Your details'}
              {step === 4 && 'Booking confirmed'}
            </h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-1.5 h-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: s <= step ? '100%' : '0%',
                    backgroundColor: s <= step ? business.accentColor : 'transparent',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Persistent summary */}
        {step >= 2 && selectedService && (
          <div className="bg-muted border-b border-border px-5 py-[10px] flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-medium leading-tight">{selectedService.name}</span>
              <span className="text-muted-foreground text-[12px]">{selectedService.durationMinutes} min</span>
            </div>
            <div className="text-foreground font-medium leading-none">€{selectedService.price}</div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {/* STEP 1: Service */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="text-[10px] text-muted-foreground uppercase tracking-[0.07em]">Select a service</label>
              <div className="space-y-2">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id
                  return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full text-left p-4 rounded-[10px] border transition-all duration-200 ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-muted'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-foreground font-medium">{service.name}</span>
                        <span className="text-foreground font-medium">€{service.price}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {service.description && (
                          <p className="text-muted-foreground text-sm leading-snug">{service.description}</p>
                        )}
                        <span className="text-muted-foreground/70 text-[12px]">{service.durationMinutes} min</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Date + time */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-[0.07em] mb-3 block">Select Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {next7Days.map((date, idx) => {
                    // Day-of-week interpreted in business timezone
                    const { y, m, d } = ymdInTz(date, tz)
                    const probe = new Date(Date.UTC(y, m - 1, d, 12))
                    const dow = probe.getUTCDay()
                    const isOpenDay = hours.find((h) => h.dayOfWeek === dow)?.isOpen ?? false
                    const isSelected = selectedDate?.toDateString() === date.toDateString()
                    return (
                      <button
                        key={idx}
                        disabled={!isOpenDay}
                        onClick={() => {
                          setSelectedDate(date)
                          setSelectedSlot(null)
                          setSlotConflict(false)
                        }}
                        className="flex flex-col items-center justify-center min-w-[54px] h-[64px] rounded-[10px] border transition-all duration-200 shrink-0"
                        style={{
                          opacity: isOpenDay ? 1 : 0.35,
                          cursor: isOpenDay ? 'pointer' : 'not-allowed',
                          borderColor: isSelected ? business.accentColor : undefined,
                          backgroundColor: isSelected ? `${business.accentColor}14` : undefined,
                          color: isSelected ? business.accentColor : undefined,
                        }}
                      >
                        <span className="text-[11px] uppercase font-medium">
                          {date.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz })}
                        </span>
                        <span className="text-lg font-bold">
                          {date.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.07em] mb-3 block">Available Slots</label>

                  {slotConflict && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-[10px_12px] mb-[10px]">
                      <p className="text-destructive text-[12px]">That slot was just taken. Please pick another time.</p>
                    </div>
                  )}

                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlot?.startUtc.getTime() === slot.startUtc.getTime()
                        return (
                          <button
                            key={slot.startUtc.toISOString()}
                            disabled={slot.isBooked}
                            onClick={() => {
                              setSelectedSlot(slot)
                              setSlotConflict(false)
                            }}
                            className="py-3 px-2 rounded-[10px] border text-center transition-all duration-200 bg-muted text-foreground"
                            style={{
                              opacity: slot.isBooked ? 0.35 : 1,
                              cursor: slot.isBooked ? 'not-allowed' : 'pointer',
                              textDecoration: slot.isBooked ? 'line-through' : 'none',
                              borderColor: isSelected ? business.accentColor : undefined,
                              backgroundColor: isSelected ? `${business.accentColor}14` : undefined,
                              color: isSelected ? business.accentColor : undefined,
                            }}
                          >
                            <span className="text-sm font-medium">{slot.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No slots available for this day.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && selectedService && selectedDate && selectedSlot && (
            <div className="space-y-6">
              <div className="bg-muted rounded-[10px] border border-border p-4">
                <div className="text-foreground text-sm font-medium text-center leading-relaxed">
                  {selectedService.name} | {formatDisplayDate(selectedDate)} | {selectedSlot.label} | {selectedService.durationMinutes} min | €{selectedService.price}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.07em]">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-muted border border-border rounded-[9px] px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.07em]">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value)
                      if (phoneError) setPhoneError(null)
                    }}
                    placeholder="+383 44 000 000"
                    className="w-full bg-muted border border-border rounded-[9px] px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  {phoneError && (
                    <p className="text-destructive text-[12px]">{phoneError}</p>
                  )}
                </div>
                <p className="text-muted-foreground text-[12px]">Used only to confirm your appointment</p>
              </div>

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-[10px_12px]">
                  <p className="text-destructive text-[12px]">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && selectedService && selectedDate && selectedSlot && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border bg-success/10 border-success/30">
                <Check size={40} className="text-success" />
              </div>

              <h3 className="text-foreground text-2xl font-bold mb-2">You're booked in!</h3>
              <p className="text-muted-foreground mb-8">
                {formatDisplayDate(selectedDate)} at {selectedSlot.label} <br />
                <span className="text-foreground font-medium">{business.name}</span>
              </p>

              <div className="w-full bg-muted rounded-[10px] border border-border p-5 space-y-3 mb-8">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Service</span>
                  <span className="text-foreground text-sm font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Phone</span>
                  <span className="text-foreground text-sm font-medium">{customerPhone}</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <a
                  href={`https://wa.me/${(business.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hi! I just booked a ${selectedService.name} on ${formatDisplayDate(selectedDate)} at ${selectedSlot.label}. My name is ${customerName}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-[9px] font-semibold border bg-success/10 border-success/25 text-success transition-all hover:bg-success/20"
                >
                  <MessageCircle size={20} />
                  Send to WhatsApp
                </a>
                <button
                  onClick={handleClose}
                  className="w-full py-4 text-muted-foreground hover:text-foreground font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="px-5 pb-5 pt-3 border-t border-border flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 border border-border text-foreground font-semibold rounded-[9px] hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} />
                Back
              </button>
            )}

            {step === 1 && (
              <button
                disabled={!selectedService}
                onClick={() => setStep(2)}
                className="w-full py-4 text-primary-foreground font-bold rounded-[9px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={accentBg}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}

            {step === 2 && (
              <button
                disabled={!selectedDate || !selectedSlot}
                onClick={() => setStep(3)}
                className="flex-[2] py-4 text-primary-foreground font-bold rounded-[9px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={accentBg}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}

            {step === 3 && (
              <button
                disabled={!customerName || !customerPhone || isSubmitting}
                onClick={handleBooking}
                className="flex-[2] py-4 text-primary-foreground font-bold rounded-[9px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={accentBg}
              >
                {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                {!isSubmitting && <Check size={18} />}
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}
