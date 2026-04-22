'use client'
import { useState, useEffect } from "react";
import { ChevronDown, Phone, MessageCircle } from "lucide-react";
import { Business, Service, BusinessHours } from "@/lib/types";
import BookingDrawer from "@/components/templates/shared/BookingDrawer";

type Props = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}

const BarberShopFirstTemplate = ({ business, services, hours }: Props) => {
  const [navVisible, setNavVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerService, setDrawerService] = useState<Service | null>(null);

  const openBooking = (service?: Service) => {
    setDrawerService(service ?? null);
    setDrawerOpen(true);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setNavVisible(y < lastY || y < 50);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div 
      className="text-white min-h-screen transition-colors duration-500" 
      style={{ 
        backgroundColor: 'var(--bg-color, #0a0a0f)',
        color: 'var(--text-color, white)',
        fontFamily: 'var(--body-font, "Inter", sans-serif)' 
      }}
    >
      {/* NAVBAR */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-transform duration-300 bg-black/20 backdrop-blur-sm"
        style={{ transform: navVisible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <span className="text-sm font-black tracking-[0.15em] uppercase">{business.name.toUpperCase()}</span>
        <button
          onClick={() => openBooking()}
          className="border border-white text-white bg-transparent px-6 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-white hover:text-black"
        >
          {(business.ctaPrimary || 'BOOK NOW').toUpperCase()}
        </button>
      </nav>

      {/* HERO */}
      <section 
        className="relative flex items-center justify-center transition-all duration-700"
        style={{ 
          minHeight: business.heroHeight === 'small' ? '60vh' : business.heroHeight === 'large' ? '100vh' : '85vh' 
        }}
      >
        <img
          src={business.galleryImages?.[0] ?? "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80"}
          alt="Barbershop"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center px-4">
          <span className="inline-block border border-white/30 text-white/60 text-xs tracking-[0.4em] px-4 py-1.5 uppercase mb-8">
            EST. 2015
          </span>
          <h1
            className="font-black text-white leading-[0.95] mb-6"
            style={{
              fontSize: "clamp(3rem, 8vw, 7rem)",
              letterSpacing: "-0.02em",
              fontFamily: 'var(--heading-font, inherit)'
            }}
          >
            {business.heroHeadline ? business.heroHeadline : <>THE ART OF<br />THE CUT</>}
          </h1>
          <p className="text-white/60 text-lg tracking-wide mb-10">
            {business.heroSubheadline || business.description || 'Precision cuts. Clean lines. Since 2015.'}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => scrollTo("services")}
              className="border-2 border-white text-white px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-white hover:text-black"
            >
              {(business.ctaSecondary || 'VIEW SERVICES').toUpperCase()}
            </button>
            <button
              onClick={() => openBooking()}
              className="bg-white text-black px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-white/90"
            >
              {(business.ctaPrimary || 'BOOK APPOINTMENT').toUpperCase()}
            </button>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="text-white/40" size={28} />
        </div>
      </section>

      {/* SERVICES */}
      <section 
        id="services" 
        className="py-32 px-8"
        style={{ backgroundColor: 'var(--bg-color, #0a0a0f)' }}
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">OUR SERVICES</p>
          <h2 className="font-black text-white" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontFamily: 'var(--heading-font, inherit)' }}>WHAT WE DO</h2>
          <div className="w-16 h-px bg-white/20 mt-6 mb-16" />
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
          {services.map((s, i) => (
            <div 
              key={s.id} 
              className="p-10 cursor-pointer group hover:bg-white/5 transition-colors" 
              style={{ backgroundColor: 'var(--surface-color, #0a0a0f)' }}
              onClick={() => openBooking(s)}
            >
              <span className="text-white/10 text-6xl font-black block mb-4">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-white font-black text-xl tracking-widest uppercase mb-3">
                {s.name.toUpperCase()}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                {s.description ?? ''}
              </p>
              <div className="flex justify-between items-end">
                <span className="text-white/30 text-xs tracking-widest">
                  {s.durationMinutes} MIN
                </span>
                <span className="text-white font-black text-3xl">€{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="bg-[#0f0f0f] py-32">
        <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-0">
          <div className="flex flex-col justify-center pr-0 md:pr-16 mb-12 md:mb-0">
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-6">OUR STORY</p>
            <h2 className="text-white font-black text-4xl leading-tight mb-6">MORE THAN A HAIRCUT</h2>
            <p className="text-white/50 leading-relaxed mb-10">
              {business.aboutCopy || business.description || "We believe every man deserves to look and feel his best. Our barbers combine traditional techniques with modern style to deliver a cut that's uniquely yours."}
            </p>
            <div className="flex gap-12">
              <div>
                <span className="text-white font-black text-2xl block">12+</span>
                <span className="text-white/40 text-xs tracking-widest uppercase mt-1 block">YEARS</span>
              </div>
              <div>
                <span className="text-white font-black text-2xl block">2000+</span>
                <span className="text-white/40 text-xs tracking-widest uppercase mt-1 block">HAPPY CLIENTS</span>
              </div>
            </div>
          </div>
          <div>
            <img
              src={business.galleryImages?.[1] ?? "https://images.unsplash.com/photo-1621605815971-b8f9d4fbb2b3?w=800&q=80"}
              alt="Barber at work"
              className="object-cover w-full h-full min-h-[400px]"
            />
          </div>
        </div>
      </section>

      {/* HOURS & CONTACT */}
      {business.showContact !== false && (
        <section className="bg-[#0a0a0f] py-32 px-8" style={{ backgroundColor: 'var(--bg-color, #0a0a0f)' }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
            <div>
              <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">HOURS</p>
              <h2 className="text-white font-black text-4xl mb-10" style={{ fontFamily: 'var(--heading-font, inherit)' }}>WHEN WE'RE OPEN</h2>
              <div>
                {(() => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                  const todayIdx = new Date().getDay()
                  return hours
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((h) => {
                      const isToday = h.dayOfWeek === todayIdx
                      return (
                        <div key={h.dayOfWeek} className="flex justify-between py-4 border-b border-white/[0.08]">
                          <span className={`text-sm tracking-widest uppercase ${isToday ? 'text-white' : 'text-white/60'}`}>
                            {dayNames[h.dayOfWeek]}
                          </span>
                          <span className="text-white text-sm font-medium">
                            {h.isOpen
                              ? `${h.openTime.slice(0, 5)} – ${h.closeTime.slice(0, 5)}`
                              : 'CLOSED'}
                          </span>
                        </div>
                      )
                    })
                })()}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">CONTACT</p>
              <h2 className="text-white font-black text-4xl mb-10" style={{ fontFamily: 'var(--heading-font, inherit)' }}>FIND US</h2>
              <p className="text-white/60 text-sm leading-loose mb-8">{business.address}</p>
              <p className="text-white font-medium mb-8">{business.phone}</p>
              <div className="flex flex-col gap-3">
                <a href={`tel:${business.phone}`} className="flex items-center justify-center gap-2 border border-white/30 text-white/70 w-full py-4 text-xs tracking-widest uppercase transition-colors hover:border-white hover:text-white">
                  <Phone size={16} /> CALL US
                </a>
                <a href={`https://wa.me/${(business.socialLinks?.whatsapp ?? business.phone ?? '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border border-white/30 text-white/70 w-full py-4 text-xs tracking-widest uppercase transition-colors hover:border-white hover:text-white">
                  <MessageCircle size={16} /> WHATSAPP
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08] py-12 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-white/30 text-xs tracking-widest">© 2026</span>
          <span className="text-white font-black text-sm tracking-[0.3em]">{business.name.toUpperCase()}</span>
          <span className="text-white/20 text-xs tracking-widest">Powered by LokalWeb</span>
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

export default BarberShopFirstTemplate;
