import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WebsiteBuilderWizard from '@/components/website-builder/WebsiteBuilderWizard'

export default async function WebsiteBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, industry')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-[#e8e8f0]">AI Website Builder</h1>
          <p className="text-[#8888aa] mt-2">Krijoni një website profesional për {business.name} në pak hapa.</p>
        </div>
        
        <WebsiteBuilderWizard />
      </div>
    </div>
  )
}
