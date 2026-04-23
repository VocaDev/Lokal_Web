'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { INDUSTRIES, INDUSTRY_LABELS, normalizeIndustry } from '@/lib/industries'
import GenerationLoader, { Brief, LoaderStage } from './GenerationLoader'
import VariantPicker, { Variant } from './VariantPicker'

type Phase = 'form' | LoaderStage | 'picking'

export const MOODS = [
  {
    id: 'heritage',
    label: 'Heritage & Warm',
    keywords: ['traditional', 'timeless', 'rooted'],
    primaryColor: '#8b6f47',
    bgColor: '#1a1512',
    fontFamily: "'Playfair Display', serif",
    preview: 'Where craft is passed down.',
  },
  {
    id: 'modern',
    label: 'Modern & Sharp',
    keywords: ['clean', 'precise', 'confident'],
    primaryColor: '#3b82f6',
    bgColor: '#0a0a0f',
    fontFamily: "'Inter', sans-serif",
    preview: 'Designed for today.',
  },
  {
    id: 'bold',
    label: 'Bold & Unforgettable',
    keywords: ['high-contrast', 'striking', 'memorable'],
    primaryColor: '#ef4444',
    bgColor: '#0a0a0f',
    fontFamily: "'Space Grotesk', sans-serif",
    preview: 'You will remember this.',
  },
  {
    id: 'premium',
    label: 'Premium & Refined',
    keywords: ['elegant', 'discreet', 'quality'],
    primaryColor: '#d4af37',
    bgColor: '#0d0a0a',
    fontFamily: "'Playfair Display', serif",
    preview: 'The quiet signal of quality.',
  },
  {
    id: 'warm',
    label: 'Warm & Welcoming',
    keywords: ['friendly', 'approachable', 'honest'],
    primaryColor: '#ea580c',
    bgColor: '#1a110a',
    fontFamily: "'Poppins', sans-serif",
    preview: 'Come in, stay awhile.',
  },
] as const

const INDUSTRY_CHIPS = INDUSTRIES.map((id) => ({
  id,
  label: INDUSTRY_LABELS[id].sq,
}))

interface FormState {
  businessName: string
  industry: string          // raw user text (may be free-text)
  tagline: string
  moodId: string
  userProvidedServices: string
}

export default function WebsiteBuilderWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [phase, setPhase] = useState<Phase>('form')
  const [brief, setBrief] = useState<Brief>(null)
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  const [formData, setFormData] = useState<FormState>({
    businessName: '',
    industry: '',
    tagline: '',
    moodId: 'premium',
    userProvidedServices: '',
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

  const persistIndustry = async () => {
    if (!businessId) return
    const canonical = normalizeIndustry(formData.industry)
    const supabase = createClient()
    const { error } = await supabase
      .from('businesses')
      .update({ industry: canonical })
      .eq('id', businessId)
    if (error) {
      console.error('[wizard] persistIndustry failed (non-fatal):', error)
    }
  }

  const nextStep = async () => {
    if (currentStep === 1) {
      if (!formData.businessName || formData.businessName.length < 2) {
        toast.error('Ju lutem shënoni emrin e biznesit (min. 2 karaktere)')
        return
      }
      if (!formData.industry || formData.industry.length < 2) {
        toast.error('Ju lutem shënoni industrinë (min. 2 karaktere)')
        return
      }
      // Persist the canonical industry to the businesses row before we advance.
      // Non-fatal if it fails — log + continue.
      await persistIndustry()
    }
    if (currentStep === 2 && !formData.moodId) {
      toast.error('Ju lutem zgjidhni një mood')
      return
    }
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => setCurrentStep(prev => prev - 1)

  const selectedMood = MOODS.find(m => m.id === formData.moodId) ?? MOODS[0]

  const handleGenerate = async () => {
    if (!businessId) {
      toast.error('Biznesi nuk u gjet. Ju lutem rifreskoni faqen.')
      return
    }
    setPhase('thinking')
    setBrief(null)
    setVariants(null)
    try {
      const moodKeywords = MOODS.find((m) => m.id === formData.moodId)?.keywords ?? []

      const canonicalIndustry = normalizeIndustry(formData.industry)

      const briefRes = await fetch('/api/brand-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName,
          industry: canonicalIndustry,
          industryLabel: formData.industry,
          tagline: formData.tagline,
          moodKeywords,
          userProvidedServices: formData.userProvidedServices,
        }),
      })
      if (!briefRes.ok) {
        const err = await briefRes.json()
        throw new Error(err.error || `Brief generation failed (${briefRes.status})`)
      }
      const briefData = await briefRes.json()
      setBrief(briefData.brief)
      setPhase('brief-revealing')

      const revealMin = new Promise<void>((resolve) => setTimeout(resolve, 4500))
      const variantsPromise = fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefData.brief,
          businessName: formData.businessName,
          industry: canonicalIndustry,
          userProvidedServices: formData.userProvidedServices,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || `Variants generation failed (${r.status})`)
        }
        return r.json() as Promise<{ variants: Variant[] }>
      })

      const [, variantsData] = await Promise.all([revealMin, variantsPromise])

      setPhase('designing')
      await new Promise<void>((resolve) => setTimeout(resolve, 1000))

      setVariants(variantsData.variants)
      setPhase('picking')
    } catch (error: any) {
      toast.error(error.message || 'Dështoi gjenerimi i temës')
      setPhase('form')
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4f8ef7] animate-spin" />
      </div>
    )
  }

  if (phase === 'thinking' || phase === 'brief-revealing' || phase === 'designing') {
    return <GenerationLoader stage={phase} brief={brief} />
  }

  if (phase === 'picking' && variants && businessId) {
    return (
      <VariantPicker
        variants={variants}
        businessId={businessId}
        onRegenerate={handleGenerate}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center max-w-md mx-auto relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[rgba(120,120,255,0.12)] -translate-y-1/2 z-0" />
        {[1, 2, 3].map((step) => (
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
                  {INDUSTRY_CHIPS.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, industry: chip.label }))}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs transition-all border',
                        normalizeIndustry(formData.industry) === chip.id
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-[#0a0a0f] border-[rgba(120,120,255,0.12)] text-[#8888aa] hover:border-[rgba(120,120,255,0.3)]'
                      )}
                    >
                      {chip.label}
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
                <label className="text-sm font-medium text-[#e8e8f0]">Çfarë shërbimesh ofron? (Opsionale)</label>
                <Input
                  placeholder="p.sh. qethje, fade, rregullim mjekre, brisk"
                  value={formData.userProvidedServices}
                  onChange={(e) => setFormData(p => ({ ...p, userProvidedServices: e.target.value }))}
                  className="bg-[#1e1e35] border-[rgba(120,120,255,0.22)] text-[#e8e8f0] focus:border-blue-500"
                />
                <p className="text-xs text-[#5a5a7a]">
                  Opsionale. Shërbimet e listuara e ndihmojnë AI-n të ndërtojë më mirë faqen tënde.
                </p>
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
              <h2 className="text-3xl font-bold text-[#e8e8f0]">Pick your vibe</h2>
              <p className="text-[#8888aa] mt-1">Our AI will design within this direction. Pick what fits you — not what you think customers want.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {MOODS.map((mood) => {
                const active = formData.moodId === mood.id
                return (
                  <button
                    key={mood.id}
                    onClick={() => setFormData(p => ({ ...p, moodId: mood.id }))}
                    className={cn(
                      'text-left rounded-xl overflow-hidden transition-all duration-300',
                      active
                        ? 'ring-2 ring-blue-400 scale-[1.02]'
                        : 'ring-1 ring-[rgba(120,120,255,0.12)] hover:ring-[rgba(120,120,255,0.3)]'
                    )}
                  >
                    <div
                      className="p-6 h-36 flex flex-col justify-end relative overflow-hidden"
                      style={{ backgroundColor: mood.bgColor }}
                    >
                      <div
                        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-40 -translate-y-1/3 translate-x-1/4"
                        style={{ backgroundColor: mood.primaryColor }}
                      />
                      <div className="relative">
                        <p className="text-2xl font-bold" style={{ color: '#fff', fontFamily: mood.fontFamily }}>
                          {mood.preview}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#151522] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#e8e8f0]">{mood.label}</h3>
                        <div className="flex gap-1">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: mood.primaryColor }} />
                          <div className="w-4 h-4 rounded-full bg-white/10" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mood.keywords.map((k) => (
                          <span key={k} className="text-xs bg-blue-400/10 text-blue-400 rounded-full px-2 py-0.5">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {currentStep === 3 && (
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
                  <span className="text-[#e8e8f0] font-medium">{selectedMood.label}</span>
                </div>
                <div>
                  <span className="text-[#8888aa] block">Slogani:</span>
                  <span className="text-[#e8e8f0] font-medium">{formData.tagline || '—'}</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold h-12 rounded-xl group"
            >
              Gjenero Temën
              <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
            </Button>
          </div>
        )}
      </div>

      {currentStep < 3 && (
        <div className="flex justify-between items-center pt-8 border-t border-[rgba(120,120,255,0.12)]">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1}
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
