'use client'
import TemplateRouter from '@/components/templates'
import { Business, Service, BusinessHours } from '@/lib/types'

const mockBusiness = (industry: any, templateId: string): Business => ({
  id: '1',
  name: `Test ${industry} - ${templateId}`,
  subdomain: 'test',
  industry,
  template: 'classic',
  templateId,
  phone: '+38349123456',
  address: 'Rr. Agim Ramadani, Prishtinë',
  description: 'Ky është një përshkrim testues për të treguar dizajnin real të template-it.',
  logoUrl: '',
  accentColor: '#2563eb',
  socialLinks: { instagram: '#', facebook: '#', whatsapp: '#' },
  galleryImages: [],
  createdAt: new Date().toISOString(),
})

const mockServices: Service[] = [
  { id: '1', businessId: '1', name: 'Shërbimi Standard', description: 'Përshkrim i shërbimit', price: 10, durationMinutes: 30 },
  { id: '2', businessId: '1', name: 'Shërbimi Premium', description: 'Përshkrim i shërbimit luksoz', price: 25, durationMinutes: 60 },
]

const mockHours: BusinessHours[] = [
  { id: '1', businessId: '1', dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
]

export default function TempGalleryPage() {
  const variations = [
    { industry: 'barbershop', tid: 'bold' },
    { industry: 'barbershop', tid: 'minimal' },
    { industry: 'barbershop', tid: 'modern' },
    { industry: 'restaurant', tid: 'elegant' },
    { industry: 'restaurant', tid: 'casual' },
    { industry: 'restaurant', tid: 'bistro' },
    { industry: 'clinic', tid: 'clean' },
    { industry: 'clinic', tid: 'modern' },
    { industry: 'clinic', tid: 'premium' },
    { industry: 'beauty-salon', tid: 'luxury' },
    { industry: 'beauty-salon', tid: 'minimal' },
  ]

  return (
    <div className="bg-white min-h-screen p-10 space-y-20">
      <h1 className="text-4xl font-bold text-center border-b pb-10">LokalWeb Template Gallery (Real Screenshots)</h1>
      {variations.map((v, i) => (
        <div key={i} id={`${v.industry}-${v.tid}`} className="border-8 border-gray-200 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-4 left-4 z-50 bg-black/80 text-white px-4 py-2 rounded-full font-mono text-sm">
            {v.industry} / {v.tid}
          </div>
          <TemplateRouter 
            business={mockBusiness(v.industry, v.tid)} 
            services={mockServices} 
            hours={mockHours} 
          />
        </div>
      ))}
    </div>
  )
}
