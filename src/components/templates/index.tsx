'use client'
import { Business, Service, BusinessHours } from '@/lib/types'

// Industry default templates (existing)
import BarbershopTemplate from './BarbershopTemplate'
import BeautySalonTemplate from './BeautySalonTemplate'
import RestaurantTemplate from './RestaurantTemplate'
import ClinicTemplate from './ClinicTemplate'

// Custom templates
import BarberShopFirstTemplate from './custom/BarberShopFirstTemplate'
import BarbershopMinimal from './custom/BarbershopMinimal'
import RestaurantElegant from './custom/RestaurantElegant'
import RestaurantCasual from './custom/RestaurantCasual'
import ClinicClean from './custom/ClinicClean'
import ClinicModern from './custom/ClinicModern'
import ClinicPremium from './custom/ClinicPremium'
import BeautyLuxury from './custom/BeautyLuxury'
import BeautyMinimal from './custom/BeautyMinimal'
import BarbershopModern from './custom/BarbershopModern'
import RestaurantBistro from './custom/RestaurantBistro'

type TemplateProps = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}

export default function TemplateRouter({ business, services, hours }: TemplateProps) {
  const props = { business, services, hours }
  const tid = business.templateId ?? 'default'

  switch (business.industry) {
    case 'barbershop':
      if (tid === 'bold') return <BarberShopFirstTemplate {...props} />
      if (tid === 'minimal') return <BarbershopMinimal {...props} />
      if (tid === 'modern') return <BarbershopModern {...props} />
      return <BarberShopFirstTemplate {...props} /> // default for barbershop

    case 'restaurant':
      if (tid === 'elegant') return <RestaurantElegant {...props} />
      if (tid === 'casual') return <RestaurantCasual {...props} />
      if (tid === 'bistro') return <RestaurantBistro {...props} />
      return <RestaurantBistro {...props} /> // default for restaurant

    case 'clinic':
      if (tid === 'clean') return <ClinicClean {...props} />
      if (tid === 'modern') return <ClinicModern {...props} />
      if (tid === 'premium') return <ClinicPremium {...props} />
      return <ClinicPremium {...props} /> // default for clinic

    case 'beauty-salon':
      if (tid === 'luxury') return <BeautyLuxury {...props} />
      if (tid === 'minimal') return <BeautyMinimal {...props} />
      return <BeautyLuxury {...props} /> // default for beauty-salon

    default:
      return <BarberShopFirstTemplate {...props} />
  }
}
