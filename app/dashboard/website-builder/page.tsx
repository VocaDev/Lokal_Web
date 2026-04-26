import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WizardV2 from '@/components/website-builder/WizardV2'

export default async function WebsiteBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, subdomain')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    redirect('/dashboard')
  }

  return <WizardV2 businessId={business.id} subdomain={business.subdomain} />
}
