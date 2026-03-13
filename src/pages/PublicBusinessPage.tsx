import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getBusinessBySubdomain, addBooking } from "@/lib/store";
import { Business, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Clock, MapPin } from "lucide-react";

const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export default function PublicBusinessPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [step, setStep] = useState(1);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (subdomain) {
      // demo fallback
      if (subdomain === "demo") {
        setBusiness({
          id: "demo",
          name: "Demo Barbershop",
          subdomain: "demo",
          industry: "barbershop",
          phone: "+383 44 000 000",
          description: "The best barbershop in Prishtina. Professional haircuts and grooming since 2015.",
          services: [
            { id: "1", name: "Haircut", price: 5, duration: 30 },
            { id: "2", name: "Beard Trim", price: 3, duration: 15 },
            { id: "3", name: "Full Package", price: 8, duration: 45 },
          ],
          bookings: [],
        });
      } else {
        setBusiness(getBusinessBySubdomain(subdomain) || null);
      }
    }
  }, [subdomain]);

  const openBooking = (service: Service) => {
    setBookingService(service);
    setStep(1);
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setBooked(false);
  };

  const confirmBooking = () => {
    if (!business || !bookingService) return;
    const today = new Date().toISOString().split("T")[0];
    addBooking(business.id, {
      customerName,
      customerPhone,
      serviceName: bookingService.name,
      date: today,
      time: selectedTime,
    });
    setBooked(true);
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Business not found</h1>
          <p className="text-muted-foreground">This business page doesn't exist yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{business.name}</h1>
          <p className="text-primary-foreground/80 text-lg mb-4">{business.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/70">
            {business.phone && (
              <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {business.phone}</span>
            )}
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Kosovo</span>
            <span className="flex items-center gap-1 capitalize"><Clock className="h-4 w-4" /> {business.industry.replace("-", " ")}</span>
          </div>
        </div>
      </header>

      {/* Services */}
      <section className="container max-w-3xl py-12 px-4">
        <h2 className="text-2xl font-bold text-foreground mb-6">Our Services</h2>
        <div className="grid gap-4">
          {business.services.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-card border rounded-xl">
              <div>
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.duration} min</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">€{s.price}</span>
                <Button size="sm" onClick={() => openBooking(s)}>Book Now</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking Modal */}
      <Dialog open={!!bookingService} onOpenChange={() => setBookingService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {booked ? "Booking Confirmed!" : `Book ${bookingService?.name}`}
            </DialogTitle>
          </DialogHeader>

          {booked ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-success text-2xl">✓</span>
              </div>
              <p className="text-foreground font-medium">Your booking has been submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {bookingService?.name} at {selectedTime}
              </p>
              <Button className="mt-4" onClick={() => setBookingService(null)}>Done</Button>
            </div>
          ) : (
            <div>
              {/* Step indicator */}
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">{bookingService?.name}</p>
                    <p className="text-sm text-muted-foreground">{bookingService?.duration} min · €{bookingService?.price}</p>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Select a time slot</p>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          selectedTime === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
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
