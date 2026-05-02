import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WizardV2 from '@/components/website-builder/WizardV2'

export default async function RegisterWebsiteBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, subdomain, name, booking_enabled')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!business) {
    redirect('/register')
  }

  return (
    <WizardV2
      businessId={business.id}
      subdomain={business.subdomain}
      businessName={business.name}
      bookingEnabled={business.booking_enabled !== false}
    />
  )
}
