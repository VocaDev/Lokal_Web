'use client'

import { useState } from 'react'
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
  Eye,
  Clock,
  Briefcase,
  Mail,
  Image as ImageIcon,
  MessageSquare,
  CalendarDays
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Business } from '@/lib/types'
import { cn } from '@/lib/utils'

interface WebsiteBuilderWizardProps {
  // Props removed as fields are now editable in Step 1
}

const COLOR_PRESETS = [
  { label: "Blu", value: "#4f8ef7" },
  { label: "Vjollcë", value: "#8b5cf6" },
  { label: "Jeshil", value: "#22c55e" },
  { label: "Portokalli", value: "#f97316" },
  { label: "Kuq", value: "#ef4444" },
  { label: "Rozë", value: "#ec4899" },
  { label: "Qiell", value: "#06b6d4" },
  { label: "Amber", value: "#f59e0b" }
]

const LAYOUT_STYLES = [
  { id: 'modern', label: 'Moderne', icon: Sparkles, description: 'Gradiante, cepa të rrumbullakosur dhe dizajn dinamik.' },
  { id: 'minimal', label: 'Minimaliste', icon: Layout, description: 'E pastër, me fokus tek hapësira dhe thjeshtësia.' },
  { id: 'bold', label: 'E guximshme', icon: Layers, description: 'Tipografi e madhe dhe kontrast i lartë.' },
  { id: 'elegant', label: 'Elegante', icon: Palette, description: 'E hollë, luksoze dhe me hapësirë të kuruar.' },
]

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero Kryesor', description: 'Prezantimi i parë i biznesit', icon: Sparkles, default: true },
  { id: 'services', label: 'Shërbimet', description: 'Lista e shërbimeve tuaja', icon: Briefcase, default: true },
  { id: 'hours', label: 'Orari', description: 'Orari i punës', icon: Clock, default: true },
  { id: 'booking', label: 'Rezervim', description: 'Forma e rezervimit online', icon: CalendarDays, default: true },
  { id: 'contact', label: 'Kontakt', description: 'Informacioni i kontaktit', icon: Mail, default: true },
  { id: 'gallery', label: 'Galeri', description: 'Fotot e biznesit', icon: ImageIcon, default: false },
  { id: 'testimonials', label: 'Dëshmi', description: 'Komentet e klientëve', icon: MessageSquare, default: false },
]

export default function WebsiteBuilderWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    tagline: '',
    primaryColor: '#4f8ef7',
    layoutStyle: 'modern',
    sections: SECTION_OPTIONS.filter(s => s.default).map(s => s.id),
    accentColor: '#8b5cf6'
  })

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.businessName || formData.businessName.length < 2) {
        toast.error("Ju lutem shënoni emrin e biznesit (min. 2 karaktere)")
        return
      }
      if (!formData.industry || formData.industry.length < 2) {
        toast.error("Ju lutem shënoni industrinë (min. 2 karaktere)")
        return
      }
    }
    if (currentStep === 2 && !formData.primaryColor) {
      toast.error("Ju lutem zgjidhni një ngjyrë primare")
      return
    }
    if (currentStep === 3 && formData.sections.length < 3) {
      toast.error("Ju lutem zgjidhni të paktën 3 seksione")
      return
    }
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => setCurrentStep(prev => prev - 1)

  const toggleSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(id => id !== sectionId)
        : [...prev.sections, sectionId]
    }))
  }

  const INDUSTRY_SUGGESTIONS = [
    "Berber", "Restorant", "Klinikë", "Sallon Bukurie", 
    "Kafene", "Gym", "Fotograf", "Tjetër"
  ]

  const generateWebsite = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGeneratedHtml(data.html)
      toast.success("Website u gjenerua me sukses!")
    } catch (error: any) {
      toast.error(error.message || "Dështoi gjenerimi i website-it")
    } finally {
      setIsGenerating(false)
    }
  }

  const publishWebsite = async () => {
    if (!generatedHtml) return
    setIsPublishing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Përdoruesi nuk u gjet")

      const { error } = await supabase
        .from('businesses')
        .update({
          name: formData.businessName,
          industry: formData.industry,
          custom_website_html: generatedHtml,
          website_creation_method: 'ai_generated',
          website_builder_completed: true
        })
        .eq('owner_id', user.id)

      if (error) throw error

      toast.success("Website-i juaj është live!")
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || "Dështoi publikimi i website-it")
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="flex justify-between items-center max-w-md mx-auto relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[rgba(120,120,255,0.12)] -translate-y-1/2 z-0"></div>
        {[1, 2, 3, 4].map((step) => (
          <div 
            key={step} 
            className={cn(
              "z-10 w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300",
              currentStep >= step 
                ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white" 
                : "bg-[#151522] border border-[rgba(120,120,255,0.22)] text-[#5a5a7a]"
            )}
          >
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* Step 1: Basics */}
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
                        "px-3 py-1 rounded-full text-xs transition-all border",
                        formData.industry === sugg 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                          : "bg-[#0a0a0f] border-[rgba(120,120,255,0.12)] text-[#8888aa] hover:border-[rgba(120,120,255,0.3)]"
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

        {/* Step 2: Style */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Stili Vizual</h2>
              <p className="text-[#8888aa] mt-1">Zgjidhni ngjyrën dhe stilin që i përshtatet brendit tuaj</p>
            </div>

            <div className="grid gap-6">
              <Card className="bg-[#151522] border-[rgba(120,120,255,0.12)] p-6 space-y-4">
                <label className="text-sm font-medium text-[#e8e8f0]">Ngjyra Primare</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData(p => ({ ...p, primaryColor: color.value }))}
                      className={cn(
                        "w-10 h-10 rounded-full transition-all duration-300 ring-offset-[#151522] ring-offset-2",
                        formData.primaryColor === color.value ? "ring-2 ring-white scale-110" : ""
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                  <div className="relative w-10 h-10 rounded-full border border-dashed border-[#5a5a7a] flex items-center justify-center">
                    <input 
                      type="color" 
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(p => ({ ...p, primaryColor: e.target.value }))}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Palette className="w-5 h-5 text-[#5a5a7a]" />
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LAYOUT_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setFormData(p => ({ ...p, layoutStyle: style.id }))}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left",
                      formData.layoutStyle === style.id 
                        ? "bg-[#1e1e35] border-[rgba(120,120,255,0.6)]" 
                        : "bg-[#151522] border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.3)]"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg mb-3",
                      formData.layoutStyle === style.id ? "bg-blue-500/20 text-blue-400" : "bg-[#1e1e35] text-[#8888aa]"
                    )}>
                      <style.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[#e8e8f0]">{style.label}</span>
                    <span className="text-xs text-[#8888aa] mt-1">{style.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sections */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#e8e8f0]">Seksionet e Website-it</h2>
              <p className="text-[#8888aa] mt-1">Zgjidhni pjesët që dëshironi të përfshini</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SECTION_OPTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex items-center p-4 rounded-xl border transition-all duration-300 text-left gap-4",
                    formData.sections.includes(section.id)
                      ? "bg-[#1e1e35] border-[rgba(120,120,255,0.6)]"
                      : "bg-[#151522] border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.3)]"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    formData.sections.includes(section.id) ? "bg-violet-500/20 text-violet-400" : "bg-[#1e1e35] text-[#8888aa]"
                  )}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-semibold text-[#e8e8f0]">{section.label}</span>
                    <span className="text-xs text-[#8888aa]">{section.description}</span>
                  </div>
                  {formData.sections.includes(section.id) && <Check className="w-5 h-5 text-violet-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review + Generate */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!generatedHtml ? (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[#e8e8f0]">Përmbledhja</h2>
                  <p className="text-[#8888aa] mt-1">Gati për të gjeneruar faqen tuaj!</p>
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
                      <span className="text-[#8888aa] block">Stili:</span>
                      <span className="text-[#e8e8f0] font-medium uppercase">{formData.layoutStyle}</span>
                    </div>
                    <div>
                      <span className="text-[#8888aa] block">Ngjyra:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
                        <span className="text-[#e8e8f0] font-mono text-xs">{formData.primaryColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-[#8888aa] text-sm block mb-2">Seksionet e zgjedhura:</span>
                    <div className="flex flex-wrap gap-2">
                      {formData.sections.map(id => (
                        <span key={id} className="bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5 text-xs font-medium">
                          {SECTION_OPTIONS.find(s => s.id === id)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>

                <Button
                  onClick={generateWebsite}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold h-12 rounded-xl group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Duke gjeneruar website-in tuaj...
                    </>
                  ) : (
                    <>
                      Gjenero Website-in
                      <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[#e8e8f0]">Pamja Paraprake</h2>
                  <p className="text-[#8888aa] mt-1">Shikoni rezultatin dhe publikojeni nëse ju pëlqen</p>
                </div>

                <div className="rounded-xl border border-[rgba(120,120,255,0.22)] overflow-hidden bg-white shadow-2xl">
                    <iframe 
                      srcDoc={generatedHtml} 
                      className="w-full h-[600px] border-none"
                      title="Preview"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    onClick={generateWebsite}
                    disabled={isGenerating || isPublishing}
                    className="flex-1 border-[rgba(120,120,255,0.22)] text-[#8888aa] hover:bg-[#1e1e35] hover:text-[#e8e8f0] h-12 rounded-xl"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rishiko (Ri-gjenero)"}
                  </Button>
                  <Button
                    onClick={publishWebsite}
                    disabled={isPublishing || isGenerating}
                    className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold h-12 rounded-xl"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Duke publikuar...
                      </>
                    ) : (
                      <>
                        Publiko Website-in
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {!generatedHtml && (
        <div className="flex justify-between items-center pt-8 border-t border-[rgba(120,120,255,0.12)]">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1 || isGenerating}
            className={cn(
              "text-[#8888aa] hover:text-[#e8e8f0] hover:bg-[#151522]",
              currentStep === 1 ? "invisible" : ""
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Mbrapa
          </Button>

          {currentStep < 4 && (
            <Button
              onClick={nextStep}
              className="bg-gradient-to-r from-blue-500 to-violet-600 text-white px-8 rounded-lg"
            >
              Vazhdo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
