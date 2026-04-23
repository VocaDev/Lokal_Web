'use client'
import { Business, Service, BusinessHours } from '@/lib/types'
import { normalizeIndustry, type Industry } from '@/lib/industries'

// Custom templates
import BarberShopFirstTemplate from './custom/BarberShopFirstTemplate'
import BarbershopMinimal from './custom/BarbershopMinimal'
import BarbershopModern from './custom/BarbershopModern'
import RestaurantElegant from './custom/RestaurantElegant'
import RestaurantCasual from './custom/RestaurantCasual'
import RestaurantBistro from './custom/RestaurantBistro'
import ClinicClean from './custom/ClinicClean'
import ClinicModern from './custom/ClinicModern'
import ClinicPremium from './custom/ClinicPremium'
import BeautyLuxury from './custom/BeautyLuxury'
import BeautyMinimal from './custom/BeautyMinimal'

type TemplateProps = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}

type TemplateComponent = React.ComponentType<TemplateProps>

// Industry + templateId → template component.
// templateId values from the AI generator's enum: 'modern' | 'minimal' | 'bold' | 'elegant'.
// Also kept: 'casual', 'bistro', 'clean', 'premium', 'luxury' (legacy/per-industry ids).
const TEMPLATE_MAP: Record<Industry, Record<string, TemplateComponent>> = {
  barbershop: {
    modern:  BarbershopModern,
    minimal: BarbershopMinimal,
    bold:    BarberShopFirstTemplate,
    elegant: BarberShopFirstTemplate,
  },
  restaurant: {
    modern:  RestaurantBistro,
    minimal: RestaurantBistro,
    bold:    RestaurantBistro,
    elegant: RestaurantElegant,
    casual:  RestaurantCasual,
    bistro:  RestaurantBistro,
  },
  clinic: {
    modern:  ClinicModern,
    minimal: ClinicClean,
    bold:    ClinicPremium,
    elegant: ClinicPremium,
    clean:   ClinicClean,
    premium: ClinicPremium,
  },
  beauty_salon: {
    modern:  BeautyLuxury,
    minimal: BeautyMinimal,
    bold:    BeautyLuxury,
    elegant: BeautyLuxury,
    luxury:  BeautyLuxury,
  },
  gym: {
    // No gym-specific templates yet — reuse the best general one as fallback.
    modern:  BarberShopFirstTemplate,
    minimal: BarberShopFirstTemplate,
    bold:    BarberShopFirstTemplate,
    elegant: BarberShopFirstTemplate,
  },
  other: {
    modern:  BarberShopFirstTemplate,
    minimal: BarberShopFirstTemplate,
    bold:    BarberShopFirstTemplate,
    elegant: BarberShopFirstTemplate,
  },
}

export default function TemplateRouter({ business, services, hours }: TemplateProps) {
  const industry = normalizeIndustry(business.industry)
  const templateId = (business.templateId || 'modern').toLowerCase()

  const family = TEMPLATE_MAP[industry] ?? TEMPLATE_MAP.other
  const Template = family[templateId] ?? family.modern ?? BarberShopFirstTemplate

  return <Template business={business} services={services} hours={hours} />
}
