'use client'

import { useState, useEffect, useMemo } from "react";
import { getBusinessBySubdomain, addBooking, getServices, getBusinessHours, getBookings } from "@/lib/store";
import { Business, Service, BusinessHours, Booking } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Clock, MapPin, MessageCircle, Instagram, Facebook } from "lucide-react";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const demoBusiness: Business = {
  id: "demo", name: "Demo Barbershop", subdomain: "demo", industry: "barbershop",
  phone: "+383 44 000 000", address: "Rr. Agim Ramadani, Prishtina",
  description: "The best barbershop in Prishtina. Professional haircuts and grooming since 2015.",
  logoUrl: "", accentColor: "#2563eb", galleryImages: [],
  socialLinks: { instagram: "", facebook: "", whatsapp: "+38344000000" },
  createdAt: new Date().toISOString(),
};

const demoServices: Service[] = [
  { id: "1", businessId: "demo", name: "Haircut", description: "", price: 5, durationMinutes: 30 },
  { id: "2", businessId: "demo", name: "Beard Trim", description: "", price: 3, durationMinutes: 15 },
  { id: "3", businessId: "demo", name: "Full Package", description: "", price: 8, durationMinutes: 45 },
];

const demoHours: BusinessHours[] = [
  { id: "h0", businessId: "demo", dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "17:00" },
  { id: "h1", businessId: "demo", dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { id: "h2", businessId: "demo", dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { id: "h3", businessId: "demo", dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { id: "h4", businessId: "demo", dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { id: "h5", businessId: "demo", dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { id: "h6", businessId: "demo", dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "17:00" },
];

function isCurrentlyOpen(hours: BusinessHours[]): boolean {
  const now = new Date();
  const today = hours.find(h => h.dayOfWeek === now.getDay());
  if (!today?.isOpen) return false;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return currentTime >= today.openTime && currentTime < today.closeTime;
}

function generateTimeSlots(hours: BusinessHours[], durationMinutes: number, bookings: Booking[]): { time: string; booked: boolean }[] {
  const now = new Date();
  const today = hours.find(h => h.dayOfWeek === now.getDay());
  if (!today?.isOpen) return [];

  const [openH, openM] = today.openTime.split(":").map(Number);
  const [closeH, closeM] = today.closeTime.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const todayStr = now.toISOString().split("T")[0];

  const todayBookings = bookings.filter(b => b.appointmentAt.startsWith(todayStr) && b.status !== 'cancelled');
  const bookedTimes = new Set(todayBookings.map(b => {
    const d = new Date(b.appointmentAt);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }));

  const slots: { time: string; booked: boolean }[] = [];
  for (let m = openMin; m + durationMinutes <= closeMin; m += durationMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const t = `${hh}:${mm}`;
    slots.push({ time: t, booked: bookedTimes.has(t) });
  }
  return slots;
}

export default function PublicBusinessPage({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [step, setStep] = useState(1);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!subdomain) return;
    if (subdomain === "demo") {
      setBusiness(demoBusiness);
      setServices(demoServices);
      setHours(demoHours);
      setBookings([]);
    } else {
      (async () => {
        try {
          const biz = await getBusinessBySubdomain(subdomain);
          if (!biz) {
            setNotFound(true);
            return;
          }
          setBusiness(biz);
          const [svc, hrs, bks] = await Promise.all([
            getServices(biz.id),
            getBusinessHours(biz.id),
            getBookings(biz.id),
          ]);
          setServices(svc);
          setHours(hrs);
          setBookings(bks);
        } catch (err) {
          console.error("Failed to load business data", err);
          setNotFound(true);
        }
      })();
    }
  }, [subdomain]);

  const open = business ? isCurrentlyOpen(hours) : false;

  const timeSlots = useMemo(() => {
    if (!bookingService) return [];
    return generateTimeSlots(hours, bookingService.durationMinutes, bookings);
  }, [bookingService, hours, bookings]);

  const openBooking = (service: Service) => {
    setBookingService(service);
    setStep(1);
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setBooked(false);
  };

  const confirmBooking = async () => {
    if (!business || !bookingService) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      await addBooking(business.id, {
        businessId: business.id,
        serviceId: bookingService.id,
        customerName,
        customerPhone,
        appointmentAt: `${today}T${selectedTime}:00`,
      });
      setBooked(true);
    } catch (err) {
      console.error("Failed to create booking", err);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Business not found</h1>
          <p className="text-muted-foreground">This business page doesn't exist yet.</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            {business.logoUrl && <img src={business.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain bg-white/10" />}
            <h1 className="text-3xl sm:text-4xl font-bold">{business.name}</h1>
          </div>
          <p className="text-primary-foreground/80 text-lg mb-4">{business.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/70">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${open ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}>
              {open ? "● Open Now" : "● Closed"}
            </span>
            {business.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {business.phone}</span>}
            {business.address && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {business.address}</span>}
            <span className="flex items-center gap-1 capitalize"><Clock className="h-4 w-4" /> {business.industry.replace("-", " ")}</span>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="container max-w-3xl py-12 px-4">
        <h2 className="text-2xl font-bold text-foreground mb-6">Our Services</h2>
        <div className="grid gap-4">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-card border rounded-xl">
              <div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.durationMinutes} min</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">€{s.price}</span>
                <Button size="sm" onClick={() => openBooking(s)}>Book Now</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {business.galleryImages && business.galleryImages.length > 0 && (
        <section className="container max-w-3xl py-12 px-4 border-t">
          <h2 className="text-2xl font-bold text-foreground mb-6">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {business.galleryImages.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden border aspect-square">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Business Hours */}
      <section className="container max-w-3xl py-12 px-4 border-t">
        <h2 className="text-2xl font-bold text-foreground mb-6">Business Hours</h2>
        <div className="bg-card border rounded-xl p-4">
          {hours.map(h => (
            <div key={h.dayOfWeek} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span className="font-medium text-foreground">{dayNames[h.dayOfWeek]}</span>
              <span className={h.isOpen ? "text-foreground" : "text-muted-foreground"}>
                {h.isOpen ? `${h.openTime} – ${h.closeTime}` : "Closed"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="container max-w-3xl py-12 px-4 border-t">
        <h2 className="text-2xl font-bold text-foreground mb-6">Contact</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <a href={`tel:${business.phone}`} className="text-foreground hover:text-primary">{business.phone}</a>
              </div>
            )}
            {business.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-foreground">{business.address}</span>
              </div>
            )}
            {business.socialLinks?.whatsapp && (
              <a href={`https://wa.me/${business.socialLinks.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
              </a>
            )}
            <div className="flex gap-3 mt-2">
              {business.socialLinks?.instagram && (
                <a href={business.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5" /></a>
              )}
              {business.socialLinks?.facebook && (
                <a href={business.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5" /></a>
              )}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border bg-muted h-48">
            <iframe
              title="Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d46882.45082215498!2d21.14!3d42.66!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x13549ee605110927%3A0x9f74d19444b28e9!2sPrishtina!5e0!3m2!1sen!2s!4v1"
              width="100%" height="100%" style={{ border: 0 }} loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <Dialog open={!!bookingService} onOpenChange={() => setBookingService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{booked ? "Booking Confirmed!" : `Book ${bookingService?.name}`}</DialogTitle>
          </DialogHeader>

          {booked ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <p className="text-foreground font-medium">Your booking has been submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">{bookingService?.name} at {selectedTime}</p>
              <Button className="mt-4" onClick={() => setBookingService(null)}>Done</Button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">{bookingService?.name}</p>
                    <p className="text-sm text-muted-foreground">{bookingService?.durationMinutes} min · €{bookingService?.price}</p>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Select a time slot</p>
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available slots today. The business may be closed.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map(slot => (
                        <button
                          key={slot.time}
                          disabled={slot.booked}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${slot.booked
                              ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50 line-through"
                              : selectedTime === slot.time
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-foreground border-border hover:border-primary/50"
                            }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button className="w-full" disabled={!selectedTime} onClick={() => setStep(3)}>Continue</Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Arben Krasniqi" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+383 44 000 000" />
                  </div>
                  <Button className="w-full" disabled={!customerName || !customerPhone} onClick={confirmBooking}>
                    Confirm Booking
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="py-6 border-t text-center text-xs text-muted-foreground">
        Powered by <span className="font-medium text-primary">LokalWeb</span>
      </footer>
    </div>
  );
}
