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

  // Tenant-driven values (migration 007). Fall back to undefined → caller hides
  // the eyebrow/stat. NO hardcoded "EST. 2015" / "12+ YEARS" / "2000+ CLIENTS".
  const currentYear = new Date().getFullYear();
  const yearsActive = business.foundedYear ? currentYear - business.foundedYear : null;
  const tagline = business.tagline ?? business.heroSubheadline ?? business.description ?? null;

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
      className="text-foreground bg-background min-h-screen transition-colors duration-500 font-sans"
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
        {business.galleryImages?.[0] ? (
          <img
            src={business.galleryImages[0]}
            alt={business.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Empty-state hero — primary→accent gradient over the page bg.
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20" />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center px-4">
          {business.foundedYear && (
            <span className="inline-block border border-white/30 text-white/60 text-xs tracking-[0.4em] px-4 py-1.5 uppercase mb-8">
              EST. {business.foundedYear}
            </span>
          )}
          <h1
            className="font-heading font-black text-white leading-[0.95] mb-6"
            style={{
              fontSize: "clamp(3rem, 8vw, 7rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {business.heroHeadline ? business.heroHeadline : <>THE ART OF<br />THE CUT</>}
          </h1>
          {tagline && (
            <p className="text-white/60 text-lg tracking-wide mb-10">
              {tagline}
            </p>
          )}
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
        className="py-32 px-8 bg-background"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">OUR SERVICES</p>
          <h2 className="font-heading font-black text-white" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>WHAT WE DO</h2>
          <div className="w-16 h-px bg-white/20 mt-6 mb-16" />
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {services.map((s, i) => (
            <div
              key={s.id}
              className="p-10 cursor-pointer group hover:bg-white/5 transition-colors bg-card"
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
      <section className="bg-card py-32">
        <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-2 gap-0">
          <div className="flex flex-col justify-center pr-0 md:pr-16 mb-12 md:mb-0">
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-6">OUR STORY</p>
            <h2 className="font-heading text-white font-black text-4xl leading-tight mb-6">
              {business.tagline ?? business.name}
            </h2>
            {(business.aboutCopy || business.description) && (
              <p className="text-white/50 leading-relaxed mb-10">
                {business.aboutCopy || business.description}
              </p>
            )}
            {(yearsActive || services.length > 0) && (
              <div className="flex gap-12">
                {yearsActive && yearsActive > 0 && (
                  <div>
                    <span className="text-white font-black text-2xl block">{yearsActive}+</span>
                    <span className="text-white/40 text-xs tracking-widest uppercase mt-1 block">
                      {yearsActive === 1 ? 'YEAR' : 'YEARS'}
                    </span>
                  </div>
                )}
                {services.length > 0 && (
                  <div>
                    <span className="text-white font-black text-2xl block">{services.length}</span>
                    <span className="text-white/40 text-xs tracking-widest uppercase mt-1 block">SERVICES</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            {business.galleryImages?.[1] ? (
              <img
                src={business.galleryImages[1]}
                alt={business.name}
                className="object-cover w-full h-full min-h-[400px]"
              />
            ) : (
              // Empty state — gradient placeholder, no stock photo.
              <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-primary/20 via-card to-accent/10" />
            )}
          </div>
        </div>
      </section>

      {/* HOURS & CONTACT */}
      {business.showContact !== false && (
        <section className="bg-background py-32 px-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
            <div>
              <p className="text-white/40 text-xs tracking-[0.4em] uppercase mb-4">HOURS</p>
              <h2 className="font-heading text-white font-black text-4xl mb-10">WHEN WE'RE OPEN</h2>
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
              <h2 className="font-heading text-white font-black text-4xl mb-10">FIND US</h2>
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
          <span className="text-white/30 text-xs tracking-widest">© {currentYear}</span>
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
