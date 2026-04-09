'use client';

import { WebsiteCustomization } from '@/lib/types';

interface PreviewServicesProps {
  customization: Partial<WebsiteCustomization>;
}

const cardStyleMap = {
  minimal: 'rounded-lg border-0 bg-[var(--surface-color)]',
  rounded: 'rounded-3xl border-0 bg-[var(--surface-color)] shadow-xl',
  bordered: 'rounded-xl border-2 border-[rgba(120,120,255,0.22)] bg-transparent',
};

export default function PreviewServices({
  customization,
}: PreviewServicesProps) {
  const services = [
    { name: 'Initial Consultation', price: 'Free', icon: '📞' },
    { name: 'Premium Service', price: '€49.99', icon: '✨' },
    { name: 'Maintenance Package', price: '€120', icon: '🛠️' },
  ];

  return (
    <section className="px-6 py-24 max-w-6xl mx-auto w-full text-center">
      <h2 
        className="text-3xl md:text-4xl font-extrabold text-[var(--text-color)] mb-4"
        style={{ fontFamily: `${customization.heading_font || 'dm-sans'}, sans-serif` }}
      >
        Our Premium Services
      </h2>
      <p 
        className="text-[var(--muted-text-color)] max-w-xl mx-auto mb-16 text-lg"
        style={{ fontFamily: `${customization.body_font || 'dm-sans'}, sans-serif` }}
      >
        Explore our curated selection of professional services tailored for your needs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service, idx) => (
          <div
            key={idx}
            className={`group p-8 transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center ${cardStyleMap[customization.card_style || 'minimal']}`}
            style={{ 
              borderColor: customization.card_style === 'bordered' ? 'var(--primary-color)' : undefined,
              boxShadow: customization.card_style === 'rounded' ? '0 20px 40px -20px var(--primary-color)/20' : undefined
            }}
          >
            <div className="text-4xl mb-6 p-4 bg-[var(--primary-color)]/10 rounded-2xl group-hover:scale-110 transition-transform">
              {service.icon}
            </div>
            <h3 
              className="text-xl font-bold text-[var(--text-color)] mb-3"
              style={{ fontFamily: `${customization.heading_font || 'dm-sans'}, sans-serif` }}
            >
              {service.name}
            </h3>
            <p 
              className="text-[var(--muted-text-color)] text-sm mb-6 flex-grow leading-relaxed"
              style={{ fontFamily: `${customization.body_font || 'dm-sans'}, sans-serif` }}
            >
              Professional service with quality guarantee and full customer satisfaction support.
            </p>
            <div className="flex flex-col items-center gap-4 w-full mt-4">
              <span className="text-2xl font-black text-[var(--primary-color)]">
                {service.price}
              </span>
              <button 
                className="w-full bg-[var(--primary-color)] text-white font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-[var(--primary-color)]/20 shadow-[var(--primary-color)]/10"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
