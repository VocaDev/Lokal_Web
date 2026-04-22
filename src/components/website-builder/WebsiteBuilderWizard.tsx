'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Palette,
  Layout,
  Layers,
  Crown,
  MessageSquare,
  Users,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MOODS = [
  {
    id: 'premium',
    label: 'Premium',
    icon: Crown,
    description: 'Sfond i errët, aksente ari/vjollcë, Playfair headings.',
  },
  {
    id: 'playful',
    label: 'Playful',
    icon: Sparkles,
    description: 'Aksente të ndritshme, karta të rrumbullakosura, Poppins.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    icon: Layout,
    description: 'Sfond i bardhë/off-white, bordura të holla, Inter.',
  },
  {
    id: 'elegant',
    label: 'Elegant',
    icon: Layers,
    description: 'Hapësirë bujare, tipografi e hollë, animacione të buta.',
  },
]

const INDUSTRY_SUGGESTIONS = [
  'Berber',
  'Restorant',
  'Klinikë',
  'Sallon Bukurie',
  'Kafene',
  'Gym',
  'Fotograf',
  'Tjetër',
]

interface FormState {
  businessName: string
  industry: string
  tagline: string
  preferredMood: string
  sections: {
    testimonials: boolean
    team: boolean
    contact: boolean
  }
}

export default function WebsiteBuilderWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  const [formData, setFormData] = useState<FormState>({
    businessName: '',
    industry: '',
    tagline: '',
    preferredMood: 'premium',
    sections: {
      testimonials: true,
      team: false,
      contact: true,
    },
  })

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, industry')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!biz) {
          router.push('/dashboard')
          return
        }
        setBusinessId(biz.id)
        setFormData(prev => ({
          ...prev,
          businessName: biz.name ?? '',
          industry: biz.industry ?? '',
        }))
      } catch (err) {
        console.error('[wizard] bootstrap failed', err)
      } finally {
        setBootstrapping(false)
      }
    })()
  }, [router])

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.businessName || formData.businessName.length < 2) {
        toast.error('Ju lutem shënoni emrin e biznesit (min. 2 karaktere)')
        return
      }
      if (!formData.industry || formData.industry.length < 2) {
        toast.error('Ju lutem shënoni industrinë (min. 2 karaktere)')
        return
      }
    }
    if (currentStep === 2 && !formData.preferredMood) {
      toast.error('Ju lutem zgjidhni një mood')
      return
    }
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => setCurrentStep(prev => prev - 1)

  const toggleSection = (key: keyof FormState['sections']) => {
    setFormData(prev => ({
      ...prev,
      sections: { ...prev.sections, [key]: !prev.sections[key] },
    }))
  }

  const generateTheme = async () => {
    if (!businessId) {
      toast.error('Biznesi nuk u gjet. Ju lutem rifreskoni faqen.')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessName: formData.businessName,
          industry: formData.industry,
          tagline: formData.tagline,
          preferredMood: formData.preferredMood,
          sections: formData.sections,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      toast.success('Tema u gjenerua! Mund ta personalizoni më tutje këtu.')
      router.push('/dashboard/customization')
    } catch (error: any) {
      toast.error(error.message || 'Dështoi gjenerimi i temës')
      setIsGenerating(false)
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4f8ef7] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center max-w-md mx-auto relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[rgba(120,120,255,0.12)] -translate-y-1/2 z-0" />
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              'z-10 w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
              currentStep >= step
                ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white'
                : 'bg-[#151522] border border-[rgba(120,120,255,0.22)] text-[#5a5a7a]'
            )}
          >
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Bazat e Biznesit</h2>
              <p className="text-[#8888aa] mt-1">Shënoni informacionin bazë për faqen tuaj</p>
            </div>

            <Card className="bg-[#151522] border-[rgba(120,120,255,0.12)] p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e8e8f0]">Emri i Biznesit</label>
                <Input
                  placeholder="p.sh., Barber Albi, Restorant Gjirafa"
                  value={formData.businessName}
                  onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))}
                  maxLength={60}
                  className="bg-[#1e1e35] border-[rgba(120,120,255,0.22)] text-[#e8e8f0] focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-[#e8e8f0]">Industria</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {INDUSTRY_SUGGESTIONS.map(sugg => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, industry: sugg }))}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs transition-all border',
                        formData.industry === sugg
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-[#0a0a0f] border-[rgba(120,120,255,0.12)] text-[#8888aa] hover:border-[rgba(120,120,255,0.3)]'
                      )}
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="p.sh., Lavazh Makinash, Studio Tatuazhi"
                  value={formData.industry}
                  onChange={(e) => setFormData(p => ({ ...p, industry: e.target.value }))}
                  className="bg-[#1e1e35] border-[rgba(120,120,255,0.22)] text-[#e8e8f0] focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e8e8f0]">Slogani (Opsionale)</label>
                <Input
                  placeholder="p.sh., Prerjet më të mira në qytet"
                  value={formData.tagline}
                  onChange={(e) => setFormData(p => ({ ...p, tagline: e.target.value }))}
                  maxLength={60}
                  className="bg-[#1e1e35] border-[rgba(120,120,255,0.22)] text-[#e8e8f0] focus:border-blue-500"
                />
              </div>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Mood i Brendit</h2>
              <p className="text-[#8888aa] mt-1">AI do zgjedhë paletën, fontet dhe template-in bazuar në mood-in tuaj</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setFormData(p => ({ ...p, preferredMood: mood.id }))}
                  className={cn(
                    'flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left',
                    formData.preferredMood === mood.id
                      ? 'bg-[#1e1e35] border-[rgba(120,120,255,0.6)]'
                      : 'bg-[#151522] border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.3)]'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg mb-3',
                    formData.preferredMood === mood.id ? 'bg-blue-500/20 text-blue-400' : 'bg-[#1e1e35] text-[#8888aa]'
                  )}>
                    <mood.icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-[#e8e8f0]">{mood.label}</span>
                  <span className="text-xs text-[#8888aa] mt-1">{mood.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Seksione Shtesë</h2>
              <p className="text-[#8888aa] mt-1">Hero, shërbimet dhe orari përfshihen gjithmonë. Zgjidh seksionet shtesë.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'testimonials' as const, label: 'Dëshmi', description: 'Komentet e klientëve', icon: MessageSquare },
                { key: 'team' as const, label: 'Ekipi', description: 'Anëtarët e stafit', icon: Users },
                { key: 'contact' as const, label: 'Kontakt', description: 'Info + WhatsApp', icon: Mail },
              ].map((section) => {
                const active = formData.sections[section.key]
                const Icon = section.icon
                return (
                  <button
                    key={section.key}
                    onClick={() => toggleSection(section.key)}
                    className={cn(
                      'flex items-center p-4 rounded-xl border transition-all duration-300 text-left gap-4',
                      active
                        ? 'bg-[#1e1e35] border-[rgba(120,120,255,0.6)]'
                        : 'bg-[#151522] border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.3)]'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      active ? 'bg-violet-500/20 text-violet-400' : 'bg-[#1e1e35] text-[#8888aa]'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="font-semibold text-[#e8e8f0]">{section.label}</span>
                      <span className="text-xs text-[#8888aa]">{section.description}</span>
                    </div>
                    {active && <Check className="w-5 h-5 text-violet-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Përmbledhja</h2>
              <p className="text-[#8888aa] mt-1">Gati për të gjeneruar temën!</p>
            </div>

            <Card className="bg-[#151522] border-[rgba(120,120,255,0.12)] p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#8888aa] block">Biznesi:</span>
                  <span className="text-[#e8e8f0] font-medium">{formData.businessName}</span>
                </div>
                <div>
                  <span className="text-[#8888aa] block">Industria:</span>
                  <span className="text-[#e8e8f0] font-medium">{formData.industry}</span>
                </div>
                <div>
                  <span className="text-[#8888aa] block">Mood:</span>
                  <span className="text-[#e8e8f0] font-medium capitalize">{formData.preferredMood}</span>
                </div>
                <div>
                  <span className="text-[#8888aa] block">Slogani:</span>
                  <span className="text-[#e8e8f0] font-medium">{formData.tagline || '—'}</span>
                </div>
              </div>
              <div className="pt-2">
                <span className="text-[#8888aa] text-sm block mb-2">Seksione shtesë:</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(formData.sections) as Array<[keyof FormState['sections'], boolean]>)
                    .filter(([, on]) => on)
                    .map(([key]) => (
                      <span key={key} className="bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5 text-xs font-medium capitalize">
                        {key}
                      </span>
                    ))}
                </div>
              </div>
            </Card>

            <Button
              onClick={generateTheme}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold h-12 rounded-xl group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Duke dizajnuar website-in tuaj...
                </>
              ) : (
                <>
                  Gjenero Temën
                  <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {currentStep < 4 && (
        <div className="flex justify-between items-center pt-8 border-t border-[rgba(120,120,255,0.12)]">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1 || isGenerating}
            className={cn(
              'text-[#8888aa] hover:text-[#e8e8f0] hover:bg-[#151522]',
              currentStep === 1 ? 'invisible' : ''
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Mbrapa
          </Button>

          <Button
            onClick={nextStep}
            className="bg-gradient-to-r from-blue-500 to-violet-600 text-white px-8 rounded-lg"
          >
            Vazhdo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
