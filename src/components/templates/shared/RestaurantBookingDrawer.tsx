'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BusinessHours } from '@/lib/types'
import { X, Check } from 'lucide-react'

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
  onClose
}: RestaurantBookingDrawerProps) {
  const [step, setStep] = useState(1)
  const [partySize, setPartySize] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set())
  const [slotConflict, setSlotConflict] = useState(false)

  const handleClose = () => {
    setStep(1)
    setPartySize(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setCustomerName('')
    setCustomerPhone('')
    setIsSubmitting(false)
    setIsBooked(false)
    setSlotConflict(false)
    onClose()
  }

  useEffect(() => {
    if (!selectedDate || !isOpen) return
    const fetchBookings = async () => {
      const supabase = createClient()
      const dateStr = selectedDate.toISOString().split('T')[0]
      const { data } = await supabase
        .from('bookings')
        .select('appointment_at, status')
        .eq('business_id', business.id)
        .gte('appointment_at', dateStr + 'T00:00:00')
        .lte('appointment_at', dateStr + 'T23:59:59')
        .neq('status', 'cancelled')

      const times = new Set(
        (data ?? []).map(b => {
          const d = new Date(b.appointment_at)
          return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
        })
      )
      setBookedTimes(times)
    }
    fetchBookings()
  }, [selectedDate, isOpen, business.id])

  const submitBooking = async () => {
    if (!selectedDate || !selectedTime) return
    setIsSubmitting(true)
    setSlotConflict(false)

    try {
      const supabase = createClient()
      const dateStr = selectedDate.toISOString().split('T')[0]
      const appointmentAt = `${dateStr}T${selectedTime}:00`

      const { data: conflict } = await supabase
        .from('bookings')
        .select('id')
        .eq('business_id', business.id)
        .eq('appointment_at', appointmentAt)
        .neq('status', 'cancelled')
        .maybeSingle()

      if (conflict) {
        setSlotConflict(true)
        setSelectedTime(null)
        setStep(2)
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from('bookings').insert({
        id: crypto.randomUUID(),
        business_id: business.id,
        service_id: null,
        customer_name: customerName,
        customer_phone: customerPhone,
        appointment_at: appointmentAt,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setIsBooked(true)
      setStep(4)
    } catch (error) {
      console.error('Booking failed:', error)
      // In a real app we might show an error toast here
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate date chips
  const dates = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) { // Next 7 days starting tomorrow
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }

  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  let formattedDate = ''
  if (selectedDate) {
    formattedDate = `${shortDayNames[selectedDate.getDay()]} ${selectedDate.getDate()} ${months[selectedDate.getMonth()]}`
  }

  // Generate time slots
  let availableSlots: string[] = []
  if (selectedDate) {
    const dayOfWeek = selectedDate.getDay()
    const dayHours = hours?.find(h => h.dayOfWeek === dayOfWeek)

    if (dayHours && dayHours.isOpen) {
      const partsStart = dayHours.openTime.split(':').map(Number)
      const partsEnd = dayHours.closeTime.split(':').map(Number)

      let currentH = partsStart[0]
      let currentM = partsStart[1]

      const endH = partsEnd[0]
      const endM = partsEnd[1]

      while (currentH < endH || (currentH === endH && currentM < endM)) {
        availableSlots.push(`${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`)
        currentM += 30
        if (currentM >= 60) {
          currentM -= 60
          currentH += 1
        }
      }
    }
  }

  const formatPhoneNumberForWhatsApp = (phone: string) => {
    return phone.replace(/[^0-9]/g, '')
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-full w-[360px] z-50 bg-[#111111] border-l border-white/[0.08] flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-medium text-lg">
              {step === 1 && "Reserve a Table"}
              {step === 2 && "Pick a date and time"}
              {step === 3 && "Almost done"}
              {step === 4 && "Reservation confirmed!"}
            </h2>
            <button onClick={handleClose} className="text-white/50 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#d97706]' : 'bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        {/* Persistent Bar */}
        {step > 1 && (
          <div className="bg-[#1a1a1a] border-b border-white/[0.08] px-5 py-3 flex justify-between items-center shrink-0">
            <span className="text-white/60 text-xs">
              Table for {partySize === 6 ? '6+' : partySize}
            </span>
            <span className="text-white/40 text-xs truncate max-w-[150px]">
              {business.name}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {step === 1 && (
            <div>
              <p className="text-white/30 text-[10px] tracking-widest uppercase mb-4">HOW MANY GUESTS?</p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(num => {
                  const isOver6 = num === 6
                  const label = isOver6 ? '6+' : num.toString()
                  const isSelected = partySize === num
                  
                  return (
                    <div
                      key={num}
                      onClick={() => setPartySize(num)}
                      className={`rounded-lg py-4 text-center text-sm cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border border-[#d97706] bg-[#d97706]/10 text-[#d97706]' 
                          : 'bg-[#1a1a1a] border border-white/10 text-white/60 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </div>
                  )
                })}
              </div>
              <p className="text-white/30 text-xs mt-3 text-center">
                For parties larger than 6, please call us directly.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-white/30 text-[10px] tracking-widest uppercase mb-4">Select a date</p>
              <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
                {dates.map((date, i) => {
                  const dayOfWeek = date.getDay()
                  const dayHours = hours?.find(h => h.dayOfWeek === dayOfWeek)
                  const isOpenDay = dayHours?.isOpen

                  const isSelected = selectedDate?.toDateString() === date.toDateString()

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!isOpenDay) return
                        setSelectedDate(date)
                        setSelectedTime(null)
                        setSlotConflict(false)
                      }}
                      className={`min-w-[60px] flex-shrink-0 flex flex-col items-center justify-center rounded-lg py-3 border transition-colors ${
                        !isOpenDay 
                          ? 'opacity-35 cursor-not-allowed border-white/5 bg-[#1a1a1a]' 
                          : isSelected
                            ? 'border-[#d97706] bg-[#d97706]/10 text-[#d97706]'
                            : 'border-white/10 bg-[#1a1a1a] text-white/80 hover:border-white/25 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs uppercase mb-1">{shortDayNames[dayOfWeek]}</span>
                      <span className="text-lg font-light">{date.getDate()}</span>
                    </div>
                  )
                })}
              </div>

              {selectedDate && (
                <div className="mt-4">
                  <p className="text-white/30 text-[10px] tracking-widest uppercase mb-4">Select a time</p>
                  
                  {slotConflict && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-3">
                      <p className="text-red-400 text-xs">That time was just taken. Please pick another.</p>
                    </div>
                  )}

                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(time => {
                        const isBookedSlot = bookedTimes.has(time)
                        const isSelected = selectedTime === time
                        
                        return (
                          <div
                            key={time}
                            onClick={() => {
                              if (isBookedSlot) return
                              setSelectedTime(time)
                              setSlotConflict(false)
                            }}
                            className={`rounded-lg py-3 text-center text-sm border transition-colors ${
                              isBookedSlot
                                ? 'opacity-30 line-through text-white/30 cursor-not-allowed border-white/5 bg-[#1a1a1a]'
                                : isSelected
                                  ? 'border-[#d97706] bg-[#d97706]/10 text-[#d97706]'
                                  : 'border-white/10 bg-[#1a1a1a] text-white/80 hover:border-white/25 cursor-pointer'
                            }`}
                          >
                            {time}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-white/50 py-8 text-sm">
                      No availability on this date.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="bg-[#1a1a1a] border border-[#d97706]/20 rounded-lg p-4 mb-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">Party</span>
                  <span className="text-white text-sm">{partySize === 6 ? '6+ guests' : `${partySize} guests`}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">Date</span>
                  <span className="text-white text-sm">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/50 text-sm">Time</span>
                  <span className="text-white text-sm">{selectedTime}</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                  <span className="text-white/50 text-sm">Total</span>
                  <span className="text-[#d97706] text-sm">Contact restaurant for pricing</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/25 outline-none focus:border-[#d97706]/50 transition-colors"
                />
                <input
                  type="tel"
                  placeholder="+383 44 000 000"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/25 outline-none focus:border-[#d97706]/50 transition-colors"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pt-8">
              <div className="w-14 h-14 rounded-full bg-[#d97706]/15 border border-[#d97706]/30 flex items-center justify-center mx-auto mb-5">
                <Check className="text-[#d97706]" size={28} />
              </div>
              <h3 className="text-white text-lg font-bold text-center">You're reserved!</h3>
              <p className="text-white/50 text-sm text-center mt-1 mb-6">
                {formattedDate} at {selectedTime} · {partySize === 6 ? '6+ guests' : `${partySize} guests`}
              </p>

              <div className="bg-[#1a1a1a] border border-[#d97706]/20 rounded-lg p-4 mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">Party</span>
                  <span className="text-white text-sm">{partySize === 6 ? '6+ guests' : `${partySize} guests`}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">Date</span>
                  <span className="text-white text-sm">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/50 text-sm">Time</span>
                  <span className="text-white text-sm">{selectedTime}</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                  <span className="text-white/50 text-sm">Total</span>
                  <span className="text-[#d97706] text-sm">Contact restaurant for pricing</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${formatPhoneNumberForWhatsApp(business.socialLinks?.whatsapp ?? business.phone ?? '')}?text=${encodeURIComponent(`Hi! I just reserved a table for ${partySize === 6 ? '6+ guests' : `${partySize} guests`} on ${formattedDate} at ${selectedTime}. My name is ${customerName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg py-3 w-full text-xs font-bold tracking-widest uppercase mb-3 hover:bg-green-500/20 transition-colors"
              >
                WhatsApp
              </a>
              <button
                onClick={handleClose}
                className="w-full text-white/50 hover:text-white py-3 text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="px-5 pb-5 pt-3 border-t border-white/[0.08]">
            {step === 1 && (
              <button
                disabled={!partySize}
                onClick={() => setStep(2)}
                className={`w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                  partySize
                    ? 'bg-[#d97706] text-black hover:bg-[#b46205]'
                    : 'bg-[#1a1a1a] text-white/30 cursor-not-allowed'
                }`}
              >
                Continue →
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="bg-[#1a1a1a] text-white/60 hover:text-white px-5 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                    selectedDate && selectedTime
                      ? 'bg-[#d97706] text-black hover:bg-[#b46205]'
                      : 'bg-[#1a1a1a] text-white/30 cursor-not-allowed'
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
                  className="bg-[#1a1a1a] text-white/60 hover:text-white px-5 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  disabled={!customerName || !customerPhone || isSubmitting}
                  onClick={submitBooking}
                  className={`flex-1 flex justify-center items-center py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                    customerName && customerPhone && !isSubmitting
                      ? 'bg-[#d97706] text-black hover:bg-[#b46205]'
                      : 'bg-[#1a1a1a] text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    "Confirm Reservation"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  )
}
