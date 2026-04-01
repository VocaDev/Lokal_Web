'use client'

import React, { useState } from 'react'
import { Service } from '@/lib/types'
import { TemplateProps } from '../TemplateProps'
import BookingDrawer from '../shared/BookingDrawer'

export default function TestTemplate({ business, services, hours }: TemplateProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#f9fafb' }}>
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: business.accentColor }}>
          {business.name} (Custom Test)
        </h1>
        <p className="text-gray-600">{business.description || "Welcome to our custom template test."}</p>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {services.map(service => (
          <div key={service.id} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">{service.name}</h3>
              <p className="text-sm text-gray-500">{service.durationMinutes} min</p>
            </div>
            <button 
              onClick={() => {
                setSelectedService(service)
                setDrawerOpen(true)
              }}
              className="px-4 py-2 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: business.accentColor }}
            >
              €{service.price}
            </button>
          </div>
        ))}
      </section>

      <BookingDrawer 
        business={business}
        services={services}
        hours={hours}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialService={selectedService}
      />
    </div>
  )
}
