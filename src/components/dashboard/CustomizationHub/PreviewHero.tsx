'use client';

import { WebsiteCustomization } from '@/lib/types';

interface PreviewHeroProps {
  customization: Partial<WebsiteCustomization>;
}

export default function PreviewHero({ customization }: PreviewHeroProps) {
  const heroHeightMap = {
    small: 'h-48 md:h-64',
    medium: 'h-64 md:h-[450px]',
    large: 'h-80 md:h-[600px]',
  };

  return (
    <section
      className={`${heroHeightMap[customization.hero_height || 'medium']} bg-gradient-to-br from-primary to-accent relative overflow-hidden flex flex-col items-center justify-center text-center px-4 md:px-12`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />

      <div className="relative z-10 max-w-3xl">
        <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-[1.1]">
          Welcome to Your Business Website
        </h1>
        <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          The best local services in Kosovo, now available for online booking.
          Quality and professional care for every customer.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-white text-primary font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95">
            View Services
          </button>
          <button className="bg-transparent text-white border-2 border-white/40 font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all hover:border-white">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
