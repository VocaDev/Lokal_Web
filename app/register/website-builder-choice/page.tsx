import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, LayoutTemplate, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function WebsiteBuilderChoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
            Si dëshironi ta krijoni website-in tuaj?
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Zgjidhni mënyrën që ju përshtatet më shumë për të filluar prezantimin e biznesit tuaj online.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Builder Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative h-full flex flex-col bg-card border border-border p-8 rounded-2xl shadow-2xl transition-all duration-300 group-hover:translate-y-[-4px]">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                  <Sparkles className="w-8 h-8" />
                </div>
                <Badge className="bg-green-500/10 text-green-500 border-none px-3 py-1">
                  Rekomandohet
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Krijo me AI</h3>
              <p className="text-muted-foreground mb-8 flex-1">
                Përshkruaj biznesin tënd në pak sekonda dhe inteligjenca artificiale do të gjenerojë një website të kompletuar dhe të personalizuar për ju.
              </p>
              <Link 
                href="/dashboard/website-builder"
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,158,247,0.4)] group/btn"
              >
                Fillo tani
                <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Template Choice Card */}
          <div className="group relative">
            <div className="relative h-full flex flex-col bg-card border border-border p-8 rounded-2xl shadow-2xl transition-all duration-300 group-hover:translate-y-[-4px]">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500">
                  <LayoutTemplate className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Zgjidh Template</h3>
              <p className="text-muted-foreground mb-8 flex-1">
                Zgjidhni nga libraria jonë e template-ve profesionale dhe shkoni live menjëherë duke shtuar informacionin tuaj.
              </p>
              <Link
                href="/dashboard/customization"
                className="inline-flex items-center justify-center w-full border border-border text-foreground font-bold py-4 rounded-xl transition-all duration-300 hover:bg-muted group/btn"
              >
                Eksploro Templates
                <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link 
            href="/dashboard"
            className="text-muted-foreground/80 hover:text-foreground transition-colors text-sm flex items-center justify-center gap-2 group"
          >
            Anashkalo tani
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
