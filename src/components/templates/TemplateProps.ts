import { Business, Service, BusinessHours } from '@/lib/types'

export type TemplateProps = {
  business: Business
  services: Service[]
  hours: BusinessHours[]
}
