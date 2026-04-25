'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BusinessHours } from '@/lib/types'
import { addBooking } from '@/lib/store'
import { validateKosovoPhone } from '@/lib/validators'
import { X, Check } from 'lucide-react'
import {
  AvailableSlot,
  BookedSlot,
  DEFAULT_RESERVATION_DURATION_MIN,
  DEFAULT_TIMEZONE,
  fetchBookedSlots,
  generateAvailableSlots,
  isUniqueViolation,
  ymdInTz,
} from '@/lib/services/bookingService'

type RestaurantBookingDrawerProps = {
  business: Business
  hours: BusinessHours[]
  isOpen: boolean
  onClose: () => void
}

export default function RestaurantBookingDrawer({
  business,
  hours,
  isOpen,
  onClose,
}: RestaurantBookingDrawerProps) {
  const [step, setStep] = useState(1)
  const [partySize, setPartySize] = useState<number | null>(null)
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
    setPartySize(null)
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

  useEffect(() => {
    if (!selectedDate || !isOpen || !business.id) return
    let cancelled = false
    fetchBookedSlots(supabase, business.id, selectedDate, tz)
      .then((rows) => {
        if (!cancelled) setBookedSlots(rows)
      })
      .catch((e) => {
        console.error('[RestaurantBookingDrawer] fetchBookedSlots failed', e)
        if (!cancelled) setBookedSlots([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, isOpen, business.id, supabase, tz])

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

  // Restaurant reservations don't have a service; default to 60-min slots,
  // 30-min grid (matches the prior hardcoded interval).
  const availableSlots = useMemo(() => {
    if (!selectedDate) return []
    return generateAvailableSlots({
      hours,
      serviceDurationMinutes: DEFAULT_RESERVATION_DURATION_MIN,
      selectedDate,
      timeZone: tz,
      bookedSlots,
      slotIntervalMinutes: 30,
    })
  }, [selectedDate, hours, bookedSlots, tz])

  const submitBooking = async () => {
    if (!selectedDate || !selectedSlot || !partySize || !business.id) return

    if (!validateKosovoPhone(customerPhone)) {
      setPhoneError('Enter a valid Kosovo phone number (e.g. +38344123456 or 044123456).')
      return
    }
    setPhoneError(null)
    setSubmitError(null)
    setSlotConflict(false)
    setIsSubmitting(true)

    try {
      await addBooking(business.id, {
        businessId: business.id,
        serviceId: null,
        customerName,
        customerPhone,
        appointmentAt: selectedSlot.startUtc.toISOString(),
        partySize,
      })
      setStep(4)
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        setSlotConflict(true)
        setSelectedSlot(null)
        setStep(2)
      } else {
        console.error('Reservation failed', err)
        setSubmitError('Could not save your reservation. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDate = useMemo(() => {
    if (!selectedDate) return ''
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(selectedDate)
  }, [selectedDate, tz])

  const formatPhoneNumberForWhatsApp = (phone: string) => phone.replace(/[^0-9]/g, '')

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={handleClose} />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-[360px] z-50 bg-card border-l border-border flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-foreground font-medium text-lg">
              {step === 1 && 'Reserve a Table'}
              {step === 2 && 'Pick a date and time'}
              {step === 3 && 'Almost done'}
              {step === 4 && 'Reservation confirmed!'}
            </h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        {step > 1 && (
          <div className="bg-muted border-b border-border px-5 py-3 flex justify-between items-center shrink-0">
            <span className="text-muted-foreground text-xs">
              Table for {partySize === 6 ? '6+' : partySize}
            </span>
            <span className="text-muted-foreground text-xs truncate max-w-[150px]">
              {business.name}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {step === 1 && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-4">HOW MANY GUESTS?</p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isOver6 = num === 6
                  const label = isOver6 ? '6+' : num.toString()
                  const isSelected = partySize === num
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPartySize(num)}
                      className={`rounded-lg py-4 text-center text-sm transition-colors ${
                        isSelected
                          ? 'border border-primary bg-primary/10 text-primary'
                          : 'bg-muted border border-border text-muted-foreground hover:border-foreground/40'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="text-muted-foreground text-xs mt-3 text-center">
                For parties larger than 6, please call us directly.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-4">Select a date</p>
              <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
                {next7Days.map((date, idx) => {
                  const { y, m, d } = ymdInTz(date, tz)
                  const probe = new Date(Date.UTC(y, m - 1, d, 12))
                  const dow = probe.getUTCDay()
                  const isOpenDay = hours?.find((h) => h.dayOfWeek === dow)?.isOpen ?? false
                  const isSelected = selectedDate?.toDateString() === date.toDateString()
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isOpenDay}
                      onClick={() => {
                        setSelectedDate(date)
                        setSelectedSlot(null)
                        setSlotConflict(false)
                      }}
                      className={`min-w-[60px] flex-shrink-0 flex flex-col items-center justify-center rounded-lg py-3 border transition-colors ${
                        !isOpenDay
                          ? 'opacity-35 cursor-not-allowed border-border bg-muted'
                          : isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted text-foreground hover:border-foreground/40'
                      }`}
                    >
                      <span className="text-xs uppercase mb-1">
                        {date.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz })}
                      </span>
                      <span className="text-lg font-light">
                        {date.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz })}
                      </span>
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <div className="mt-4">
                  <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-4">Select a time</p>

                  {slotConflict && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 mb-3">
                      <p className="text-destructive text-xs">That time was just taken. Please pick another.</p>
                    </div>
                  )}

                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlot?.startUtc.getTime() === slot.startUtc.getTime()
                        return (
                          <button
                            key={slot.startUtc.toISOString()}
                            type="button"
                            disabled={slot.isBooked}
                            onClick={() => {
                              setSelectedSlot(slot)
                              setSlotConflict(false)
                            }}
                            className={`rounded-lg py-3 text-center text-sm border transition-colors ${
                              slot.isBooked
                                ? 'opacity-30 line-through text-muted-foreground cursor-not-allowed border-border bg-muted'
                                : isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted text-foreground hover:border-foreground/40'
                            }`}
                          >
                            {slot.label}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No availability on this date.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="bg-muted border border-primary/20 rounded-lg p-4 mb-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground text-sm">Party</span>
                  <span className="text-foreground text-sm">{partySize === 6 ? '6+ guests' : `${partySize} guests`}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground text-sm">Date</span>
                  <span className="text-foreground text-sm">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground text-sm">Time</span>
                  <span className="text-foreground text-sm">{selectedSlot?.label}</span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Total</span>
                  <span className="text-primary text-sm">Contact restaurant for pricing</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <input
                  type="tel"
                  placeholder="+383 44 000 000"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    if (phoneError) setPhoneError(null)
                  }}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                {phoneError && (
                  <p className="text-destructive text-[12px]">{phoneError}</p>
                )}
              </div>

              {submitError && (
                <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                  <p className="text-destructive text-xs">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="pt-8">
              <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5">
                <Check className="text-primary" size={28} />
              </div>
              <h3 className="text-foreground text-lg font-bold text-center">You're reserved!</h3>
              <p className="text-muted-foreground text-sm text-center mt-1 mb-6">
                {formattedDate} at {selectedSlot?.label} · {partySize === 6 ? '6+ guests' : `${partySize} guests`}
              </p>

              <div className="bg-muted border border-primary/20 rounded-lg p-4 mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground text-sm">Party</span>
                  <span className="text-foreground text-sm">{partySize === 6 ? '6+ guests' : `${partySize} guests`}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground text-sm">Date</span>
                  <span className="text-foreground text-sm">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground text-sm">Time</span>
                  <span className="text-foreground text-sm">{selectedSlot?.label}</span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Total</span>
                  <span className="text-primary text-sm">Contact restaurant for pricing</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${formatPhoneNumberForWhatsApp(business.socialLinks?.whatsapp ?? business.phone ?? '')}?text=${encodeURIComponent(`Hi! I just reserved a table for ${partySize === 6 ? '6+ guests' : `${partySize} guests`} on ${formattedDate} at ${selectedSlot?.label}. My name is ${customerName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-success/10 border border-success/20 text-success rounded-lg py-3 w-full text-xs font-bold tracking-widest uppercase mb-3 hover:bg-success/20 transition-colors"
              >
                WhatsApp
              </a>
              <button
                onClick={handleClose}
                className="w-full text-muted-foreground hover:text-foreground py-3 text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="px-5 pb-5 pt-3 border-t border-border">
            {step === 1 && (
              <button
                disabled={!partySize}
                onClick={() => setStep(2)}
                className={`w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                  partySize
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Continue →
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="bg-muted text-muted-foreground hover:text-foreground px-5 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={!selectedDate || !selectedSlot}
                  onClick={() => setStep(3)}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                    selectedDate && selectedSlot
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  Continue →
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="bg-muted text-muted-foreground hover:text-foreground px-5 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  disabled={!customerName || !customerPhone || isSubmitting}
                  onClick={submitBooking}
                  className={`flex-1 flex justify-center items-center py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                    customerName && customerPhone && !isSubmitting
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    'Confirm Reservation'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 4px;
        }
      `}</style>
    </>
  )
}
