'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, publicSiteLabel } from '@/lib/utils';
import type { WizardInput, AiSitePayload } from '@/lib/types/customization';
import type { Business, Service } from '@/lib/types';
import { DynamicSiteRenderer } from '@/components/templates/ai/DynamicSiteRenderer';
import { createClient } from '@/lib/supabase/client';
import type { ProgressStep, ProgressStatus } from '@/lib/ai-progress';
import { ARCHETYPES, type ArchetypeKey, type Archetype } from '@/lib/archetypes';

type Brief = {
  positioning: string;
  definingTraits: string[];
  targetCustomer: string;
  voice: string;
  culturalAnchor: string;
};

// The wizard's preview consumes the same AiSitePayload that the public site
// renders. What you see in preview is what you get on the live tenant page.
type Theme = AiSitePayload;

type Props = {
  businessId: string;
  subdomain: string;
  // Pre-loaded from the businesses row by the route's server component, so
  // the wizard never has to re-ask the user for these. businessName comes
  // from registration; bookingEnabled comes from the registration toggle
  // (or a later /dashboard/profile change). undefined → treat as enabled.
  businessName: string;
  bookingEnabled: boolean;
};

const TOTAL_STEPS = 5;

const INDUSTRY_CHIPS: Array<{ label: string; id: string }> = [
  { label: 'Berber', id: 'barbershop' },
  { label: 'Restorant', id: 'restaurant' },
  { label: 'Klinikë', id: 'clinic' },
  { label: 'Sallon Bukurie', id: 'beauty_salon' },
  { label: 'Palestër', id: 'gym' },
  { label: 'Diçka tjetër', id: 'other' },
];

const BOOKING_CHIPS: Array<{ label: string; value: WizardInput['bookingMethod'] }> = [
  { label: 'Me termin', value: 'appointments' },
  { label: 'Pa termin', value: 'walkin' },
  { label: 'Të dyja', value: 'both' },
  { label: 'Nuk është e zbatueshme', value: 'none' },
];

// Per-section layout pickers. Each ends with an 'ai' option that is the
// default and lets the model pick freely. Specific values force the AI's
// layout choice in the post-processor.
//
// `sub` is the 1-2 word descriptor under the label.

const HERO_LAYOUTS: Array<{ id: WizardInput['heroLayout']; label: string; sub: string }> = [
  { id: 'fullbleed', label: 'Kinematik', sub: 'Foto e plotë' },
  { id: 'split',     label: 'I ndarë',    sub: 'Foto + tekst' },
  { id: 'centered',  label: 'I qendërsuar', sub: 'Minimalist' },
  { id: 'editorial', label: 'Editorial',  sub: 'Si revistë' },
  { id: 'ai',        label: 'AI vendos',  sub: 'Le AI të zgjedhë' },
];

const STORY_LAYOUTS: Array<{ id: WizardInput['storyLayout']; label: string; sub: string }> = [
  { id: 'centered-quote', label: 'Citim qendror', sub: 'Një frazë e madhe' },
  { id: 'two-column',     label: 'Dy kolona',     sub: 'Foto + tekst' },
  { id: 'long-form',      label: 'Tekst i gjatë', sub: 'Foto sipër' },
  { id: 'pull-quote',     label: 'Citat i nxjerrë', sub: 'Citat + prozë' },
  { id: 'ai',             label: 'AI vendos',     sub: 'Le AI të zgjedhë' },
];

const SERVICES_LAYOUTS: Array<{ id: WizardInput['servicesLayout']; label: string; sub: string }> = [
  { id: 'list',            label: 'Listë',           sub: 'Sparse, type-first' },
  { id: 'grid-3',          label: 'Rrjet 3 kolona',  sub: 'Karta të vogla' },
  { id: 'editorial-rows',  label: 'Rreshta editorial', sub: 'Numrash + prozë' },
  { id: 'cards',           label: 'Karta',           sub: 'Foto + tekst' },
  { id: 'ai',              label: 'AI vendos',       sub: 'Le AI të zgjedhë' },
];

const GALLERY_LAYOUTS: Array<{ id: WizardInput['galleryLayout']; label: string; sub: string }> = [
  { id: 'masonry',       label: 'Masonry',          sub: 'Lartësi të ndryshme' },
  { id: 'grid-uniform',  label: 'Rrjet uniform',    sub: 'Të gjitha të barabarta' },
  { id: 'showcase',      label: 'Vetrina',          sub: 'Një e madhe + miniatura' },
  { id: 'strip',         label: 'Shirit',           sub: 'Horizontal, scroll' },
  { id: 'ai',            label: 'AI vendos',        sub: 'Le AI të zgjedhë' },
];

const CUSTOM_FONT_OPTIONS: Array<{ value: NonNullable<WizardInput['customFont']>; label: string }> = [
  { value: 'playfair',      label: 'Klasik & Serif' },
  { value: 'space-grotesk', label: 'Modern & Gjeometrik' },
  { value: 'dm-sans',       label: 'I pastër & Neutral' },
  { value: 'poppins',       label: 'Miqësor & i Rrumbullakët' },
];

const LANGUAGE_CHIPS: Array<{ label: string; value: WizardInput['language'] }> = [
  { label: 'Shqip', value: 'sq' },
  { label: 'Anglisht', value: 'en' },
];

const TONE_OPTIONS: Array<{ value: WizardInput['tone']; label: string; example: string }> = [
  { value: 'friendly',     label: 'Miqësor',     example: '"Hyrni kur të doni. Ju njohim me emër."' },
  { value: 'professional', label: 'Profesional', example: '"8 minuta pritje. Çdo herë."' },
  { value: 'bold',         label: 'I guximshëm', example: '"Prerja e fundit që do t\'ju duhet."' },
];

const SUBSTEPS: { step: ProgressStep; labelSq: string; labelEn: string }[] = [
  { step: 'analyzing_business', labelSq: 'Po analizojmë biznesin tënd', labelEn: 'Analyzing your business' },
  { step: 'building_brief',     labelSq: 'Po krijojmë strategjinë',     labelEn: 'Building the strategy' },
  { step: 'designing_theme',    labelSq: 'Po dizajnojmë temën',         labelEn: 'Designing the theme' },
  { step: 'writing_copy',       labelSq: 'Po shkruajmë përmbajtjen',    labelEn: 'Writing the content' },
  { step: 'finalizing',         labelSq: 'Po e mbledhim faqen',         labelEn: 'Finalizing the page' },
];

const FALLBACK_ADVANCE_MS = 8000;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isHex = (v?: string) => !!v && HEX_RE.test(v.trim());

function defaultInput(bookingEnabled: boolean): WizardInput {
  return {
    industry: '',
    industryChip: undefined,
    city: '',
    uniqueness: '',
    businessDescription: '',
    services: [
      { name: '', price: '', durationMinutes: undefined },
      { name: '', price: '', durationMinutes: undefined },
    ],
    // When the user opted out of booking at registration, force 'none' so
    // the AI doesn't generate booking-themed copy/CTAs and the wizard's
    // Step 2 chip group is hidden.
    bookingMethod: bookingEnabled ? 'appointments' : 'none',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
    archetypeKey: 'ai',
    brandPrimary: undefined,
    brandAccent: undefined,
    customFont: undefined,
    language: 'sq',
    tone: 'friendly',
  };
}

export default function WizardV2({ businessId, subdomain, businessName, bookingEnabled }: Props) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<WizardInput>(() => defaultInput(bookingEnabled));
  const [brief, setBrief] = useState<Brief | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ProgressStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ProgressStep>>(new Set());
  const [genError, setGenError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Fallback timer ref — if no event arrives for 8s, advance the active step
  // manually so a Realtime hiccup doesn't freeze the UI.
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceFallback = (currentStep: ProgressStep | null) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (!currentStep) return;
    fallbackTimerRef.current = setTimeout(() => {
      const idx = SUBSTEPS.findIndex(s => s.step === currentStep);
      if (idx < 0 || idx >= SUBSTEPS.length - 1) return;
      const next = SUBSTEPS[idx + 1].step;
      setCompletedSteps(prev => {
        const out = new Set(prev);
        out.add(currentStep);
        return out;
      });
      setActiveStep(next);
      advanceFallback(next);
    }, FALLBACK_ADVANCE_MS);
  };

  // Subscribe to Realtime progress events for this generation. Cleans up on
  // generationId change (regenerate) and on unmount.
  useEffect(() => {
    if (!generationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`ai-progress-${generationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_generation_events',
          filter: `generation_id=eq.${generationId}`,
        },
        (payload) => {
          const evt = payload.new as { step: ProgressStep; status: ProgressStatus; message: string | null };
          if (evt.status === 'completed') {
            setCompletedSteps(prev => {
              const out = new Set(prev);
              out.add(evt.step);
              return out;
            });
            const idx = SUBSTEPS.findIndex(s => s.step === evt.step);
            if (idx >= 0 && idx < SUBSTEPS.length - 1) {
              const nextStep = SUBSTEPS[idx + 1].step;
              setActiveStep(nextStep);
              advanceFallback(nextStep);
            } else {
              if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            }
          } else if (evt.status === 'started' || evt.status === 'progress') {
            setActiveStep(evt.step);
            advanceFallback(evt.step);
          } else if (evt.status === 'error') {
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            setGenError(evt.message ?? 'Generation failed');
          }
        },
      )
      .subscribe();
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      channel.unsubscribe();
    };
  }, [generationId]);

  const update = (patch: Partial<WizardInput>) => setInput(prev => ({ ...prev, ...patch }));

  // -------- step validation --------
  const validateStep = (s: number): boolean => {
    if (s === 1) {
      // businessName is no longer asked here — it's set at registration and
      // shown as a confirmed header. Only industry + city are required.
      return input.industry.trim().length >= 2 &&
             input.city.trim().length >= 2;
    }
    if (s === 2) {
      // Free-text business description gates the whole step. Min 30 chars
      // is enforced silently — no visible "required" label, just a disabled
      // Continue button until the user has written something substantial.
      return (input.businessDescription?.trim().length ?? 0) >= 30;
    }
    // Step 3 always valid — every layout picker defaults to 'ai'.
    if (s === 3) return true;
    if (s === 4) {
      if (!input.archetypeKey) return false;
      if (input.archetypeKey === 'custom') return isHex(input.brandPrimary) && isHex(input.brandAccent);
      return true;
    }
    if (s === 5) return !!input.language && !!input.tone;
    return true;
  };

  const canContinue = step >= 1 && step <= 5 ? validateStep(step) : true;

  // -------- generation pipeline --------
  const runGeneration = async (opts: { reuseBrief?: Brief } = {}) => {
    setStep(6);
    setGenError(null);

    // Reset progress state and assign a fresh generationId. The Realtime
    // subscription useEffect re-fires when generationId changes.
    const newGenId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (opts.reuseBrief) {
      // Skip brand-brief on regenerate — mark it done and start at design.
      setCompletedSteps(new Set<ProgressStep>(['analyzing_business', 'building_brief']));
      setActiveStep('designing_theme');
    } else {
      setCompletedSteps(new Set());
      setActiveStep('analyzing_business');
    }
    advanceFallback(opts.reuseBrief ? 'designing_theme' : 'analyzing_business');
    setGenerationId(newGenId);

    let currentBrief: Brief | null = opts.reuseBrief ?? null;

    try {
      // Step A — brand brief (skipped on regenerate)
      if (!currentBrief) {
        const briefRes = await fetch('/api/brand-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName,
            industry: input.industry,
            industryChip: input.industryChip,
            city: input.city,
            uniqueness: input.uniqueness,
            businessDescription: input.businessDescription,
            services: input.services
              .filter(s => s.name.trim())
              .map(s => ({
                name: s.name.trim(),
                price: s.price,
                durationMinutes: s.durationMinutes,
              })),
            bookingMethod: input.bookingMethod,
            language: input.language,
            tone: input.tone,
            generationId: newGenId,
            businessId,
          }),
        });
        if (!briefRes.ok) {
          const err = await briefRes.json().catch(() => ({}));
          throw new Error(err.error || `Brief generation failed (${briefRes.status})`);
        }
        const briefData = await briefRes.json();
        currentBrief = briefData.brief as Brief;
        setBrief(currentBrief);
      }

      const themeRes = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: currentBrief,
          businessName,
          industry: input.industry,
          city: input.city,
          uniqueness: input.uniqueness,
          businessDescription: input.businessDescription,
          heroLayout: input.heroLayout,
          storyLayout: input.storyLayout,
          servicesLayout: input.servicesLayout,
          galleryLayout: input.galleryLayout,
          archetypeKey: input.archetypeKey,
          brandPrimary: input.brandPrimary,
          brandAccent: input.brandAccent,
          customFont: input.customFont,
          language: input.language,
          tone: input.tone,
          userProvidedServices: input.services
            .filter(s => s.name.trim())
            .map(s => {
              const parts = [s.name.trim()];
              if (s.price && String(s.price).trim()) parts.push(`€${String(s.price).trim()}`);
              if (s.durationMinutes !== undefined) parts.push(`${s.durationMinutes}min`);
              if (s.description && s.description.trim()) parts.push(`— ${s.description.trim()}`);
              return parts.join(' / ');
            })
            .join('\n'),
          // Structured copy of the same input — used by postProcessTheme to
          // overlay user-typed prices/durations onto the AI's items so the
          // preview shows what the user actually entered.
          wizardServices: input.services
            .filter(s => s.name.trim())
            .map(s => ({
              name: s.name.trim(),
              price: s.price,
              durationMinutes: s.durationMinutes,
              description: s.description?.trim() || undefined,
            })),
          regenSeed: opts.reuseBrief ? Date.now().toString() : undefined,
          generationId: newGenId,
          businessId,
        }),
      });

      if (!themeRes.ok) {
        const err = await themeRes.json().catch(() => ({}));
        throw new Error(err.error || `Theme generation failed (${themeRes.status})`);
      }
      const themeData = await themeRes.json();
      const t = themeData.theme as Theme;
      setTheme(t);
      // Mark all steps complete; the Realtime stream may have already done
      // most of this, but the API responses are the source of truth.
      setCompletedSteps(new Set<ProgressStep>([
        'analyzing_business', 'building_brief', 'designing_theme', 'writing_copy', 'finalizing',
      ]));
      setActiveStep(null);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      setStep(7);
    } catch (e: any) {
      setGenError(e?.message || 'Gjenerimi dështoi');
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    }
  };

  const handleApply = async () => {
    if (!theme) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch('/api/apply-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          theme,
          siteLanguage: input.language,
          siteTone: input.tone,
          uniquenessStatement: input.uniqueness,
          bookingMethod: input.bookingMethod,
          // Belt-and-suspenders: user prices/durations win even if the theme
          // payload is stale or never went through /api/generate-variants.
          wizardServices: input.services
            .filter(s => s.name.trim())
            .map(s => ({
              name: s.name.trim(),
              price: s.price,
              durationMinutes: s.durationMinutes,
            })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Aplikimi dështoi');
      window.location.href = '/dashboard';
    } catch (e: any) {
      setApplyError(e?.message || 'Aplikimi dështoi');
      setApplying(false);
    }
  };

  // -------- chrome --------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress bar (hidden on generation/preview screens) */}
      {step >= 1 && step <= 5 && (
        <div className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
                const stepNum = idx + 1;
                const done = stepNum < step;
                const current = stepNum === step;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'h-1 flex-1 rounded-full overflow-hidden bg-muted',
                    )}
                  >
                    {done && (
                      <div className="h-full w-full bg-gradient-to-r from-primary to-accent" />
                    )}
                    {current && (
                      <div className="h-full w-1/2 bg-gradient-to-r from-primary to-accent transition-all duration-500" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
              Hapi {step} nga {TOTAL_STEPS}
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {step === 1 && (
          <StepShell
            heading="Tregona për biznesin tënd"
            subtitle="Pesë detaje të shpejta. Sa më specifike, aq më i mirë rezultati përfundimtar."
          >
            <Step1 input={input} update={update} businessName={businessName} />
          </StepShell>
        )}
        {step === 2 && (
          <StepShell
            heading="Çfarë ofron?"
            subtitle="Fillimi nga përshkrimi, pastaj shërbimet specifike nëse ke."
          >
            <Step2 input={input} update={update} bookingEnabled={bookingEnabled} />
          </StepShell>
        )}
        {step === 3 && (
          <StepShell
            heading="Si do duket faqja jote?"
            subtitle="Drejtim, jo formë e ngurtë. AI gjeneron strukturën reale brenda zgjedhjes tënde."
          >
            <Step3 input={input} update={update} />
          </StepShell>
        )}
        {step === 4 && (
          <StepShell
            heading="Atmosfera vizuale"
            subtitle='Zgjidh një drejtim ngjyrash, ose nëse ke ngjyrat tua të markës, përdor opsionin "Ngjyrat e mia".'
          >
            <Step4 input={input} update={update} />
          </StepShell>
        )}
        {step === 5 && (
          <StepShell
            heading="Zëri dhe gjuha"
            subtitle="Hapi i fundit. Pastaj ndërtojmë faqen."
          >
            <Step5 input={input} update={update} businessName={businessName} />
          </StepShell>
        )}

        {step === 6 && (
          <GenerationScreen
            activeStep={activeStep}
            completedSteps={completedSteps}
            language={input.language}
            error={genError}
            onRetry={() => runGeneration()}
          />
        )}

        {step === 7 && theme && (
          <PreviewScreen
            theme={theme}
            subdomain={subdomain}
            businessName={businessName}
            city={input.city}
            applying={applying}
            applyError={applyError}
            onRegenerate={() => runGeneration({ reuseBrief: brief ?? undefined })}
            onApply={handleApply}
          />
        )}
      </main>

      {/* Footer nav (only on form steps 1-5) */}
      {step >= 1 && step <= 5 && (
        <footer className="border-t border-border bg-background">
          <div className="max-w-[720px] mx-auto px-7 py-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className={cn(
                'text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded',
                step === 1 && 'invisible',
              )}
            >
              ← Mbrapa
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canContinue) return;
                if (step === 5) {
                  runGeneration();
                } else {
                  setStep(s => s + 1);
                }
              }}
              disabled={!canContinue}
              className={cn(
                'text-sm font-semibold rounded-lg px-6 py-2.5 transition-all',
                'bg-gradient-to-br from-primary to-accent text-primary-foreground',
                'shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]',
                'hover:shadow-[0_0_32px_-6px_hsl(var(--primary)/0.8)]',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
              )}
            >
              {step === 5 ? 'Gjenero faqen ✨' : 'Vazhdo →'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

// =================================================================
// Shell + step components
// =================================================================

function StepShell({
  heading, subtitle, children,
}: { heading: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 px-7 py-10">
      <div className="max-w-[720px] mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-[30px] font-bold tracking-tight leading-tight">{heading}</h1>
          <p className="text-[15px] text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[13px] font-medium text-foreground">{children}</div>
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full text-[13px] px-4 py-2 transition-all border',
        active
          ? 'bg-primary/15 border-primary text-foreground'
          : 'bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full bg-card border border-border rounded-lg px-3.5 py-2.5 text-[14px]',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        'transition-all',
        props.className,
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full bg-card border border-border rounded-lg px-3.5 py-2.5 text-[14px]',
        'text-foreground placeholder:text-muted-foreground min-h-[80px] resize-y',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        'transition-all',
        props.className,
      )}
    />
  );
}

// ---------- Step 1 ----------
function Step1({
  input, update, businessName,
}: {
  input: WizardInput;
  update: (p: Partial<WizardInput>) => void;
  businessName: string;
}) {
  return (
    <div className="space-y-6">
      {/* Confirmed business name from registration — no longer asked here. */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Po krijojmë faqen për
        </div>
        <div className="text-lg font-semibold text-foreground">{businessName}</div>
      </div>

      <div className="space-y-3">
        <FieldLabel hint="Klikon një opsion ose shkruan tëndin më poshtë.">
          Lloji i biznesit
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_CHIPS.map(chip => (
            <Chip
              key={chip.id}
              active={input.industryChip === chip.id}
              onClick={() => update({ industry: chip.label, industryChip: chip.id })}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
        <TextInput
          value={input.industry}
          onChange={(e) => update({ industry: e.target.value, industryChip: undefined })}
          placeholder="ose shkruaj: studio tatuazhi, lavazh makinash..."
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Qyteti ose lagjja</FieldLabel>
        <TextInput
          value={input.city}
          onChange={(e) => update({ city: e.target.value })}
          placeholder="p.sh. Prishtinë, Lagjja Sunny Hill"
        />
        <p className="text-xs text-[#5a5a7a] mt-1">
          Shto lagjen nëse mundesh — ndihmon AI të kuptojë kontekstin lokal.
        </p>
      </div>

      <div className="space-y-2">
        <FieldLabel hint="Një fjali. Gjëja që sjell klientët mbrapa.">
          Çfarë e bën biznesin tënd ndryshe? <span className="text-muted-foreground font-normal">(opsionale)</span>
        </FieldLabel>
        <TextArea
          value={input.uniqueness ?? ''}
          onChange={(e) => update({ uniqueness: e.target.value })}
          placeholder="p.sh. Jam i vetmi berberi në lagje që e di emrin e secilit klient dhe historinë e flokëve të tij."
        />
        <div className="mt-2 p-3 rounded-lg bg-[#1e1e35] border border-[rgba(120,120,255,0.12)]">
          <p className="text-xs text-[#5a5a7a] mb-1">💡 Nëse nuk di nga të fillosh, provo:</p>
          <p className="text-xs text-[#8888aa] italic">
            &quot;Klientët tanë vijnë tek ne sepse _______, jo sepse nuk kanë ku tjetër të shkojnë.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2 ----------
//
// Two-part shape: a required free-text business description on top (the
// strongest scope signal for the AI — the user's own framing of what they
// do), and an optional structured services grid below it. Users without a
// fixed service list can leave the grid empty; the AI generates a
// representative 3-5 services from the description in that case.
function Step2({
  input, update, bookingEnabled,
}: {
  input: WizardInput;
  update: (p: Partial<WizardInput>) => void;
  bookingEnabled: boolean;
}) {
  const updateService = (idx: number, patch: Partial<WizardInput['services'][number]>) => {
    const next = input.services.map((s, i) => i === idx ? { ...s, ...patch } : s);
    update({ services: next });
  };
  const addService = () => {
    if (input.services.length >= 6) return;
    update({ services: [...input.services, { name: '', price: '', durationMinutes: undefined }] });
  };
  const removeService = (idx: number) => {
    update({ services: input.services.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      {/* A — Business description (required, silently gated) */}
      <div className="space-y-2">
        <FieldLabel hint="Mos e mendo si listë — thjesht përshkruaje me fjalët e tua. Çfarë ofron klientëve?">
          Përshkrimi i biznesit
        </FieldLabel>
        <TextArea
          value={input.businessDescription ?? ''}
          onChange={(e) => update({ businessDescription: e.target.value })}
          placeholder="p.sh. Mësoj programim për fillestarë absolutë — njerëz që kurrë nuk kanë parë kod. Grupe prej 6 vetash maksimum, çdo kurs 8 javë, çdo student del me një projekt real."
          maxLength={300}
          className="min-h-[72px]"
        />
        <p className="text-xs text-[#5a5a7a] mt-1">
          Sa më specifik të jesh, aq më mirë do ta kuptojë AI biznesin tënd.
        </p>
      </div>

      {/* Visual divider between sections */}
      <div className="border-t border-border" />

      {/* B — Specific services (optional) */}
      <div className="space-y-3">
        <FieldLabel hint="Opsionale. Nëse ke një listë specifike që do t'i shfaqësh në faqe, shtoji më poshtë. Mund ta lësh bosh — AI do të krijojë seksionin sipas përshkrimit më lart.">
          Shërbime ose produkte specifike
        </FieldLabel>

        {input.services.length > 0 && (
          <div className="space-y-3">
            {input.services.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-[1fr_88px_40px] md:grid-cols-[1fr_100px_120px_40px] gap-2 items-center">
                  <TextInput
                    value={s.name}
                    onChange={(e) => updateService(idx, { name: e.target.value })}
                    placeholder="Emri i shërbimit (p.sh. Kurs Python)"
                  />
                  <TextInput
                    value={s.price ?? ''}
                    onChange={(e) => updateService(idx, { price: e.target.value })}
                    placeholder="Çmimi €"
                  />
                  <TextInput
                    className="hidden md:block"
                    value={s.durationMinutes !== undefined ? String(s.durationMinutes) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      const n = raw === '' ? undefined : Number(raw);
                      updateService(idx, { durationMinutes: Number.isFinite(n) ? (n as number) : undefined });
                    }}
                    placeholder="Kohëzgjatja"
                  />
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className={cn(
                      'h-10 w-10 rounded-lg border border-border text-muted-foreground',
                      'hover:border-foreground/30 hover:text-foreground transition-colors',
                    )}
                    aria-label="Hiq shërbimin"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  value={s.description ?? ''}
                  onChange={(e) => updateService(idx, { description: e.target.value })}
                  placeholder="Përshkrim i shkurtër (opsionale) — p.sh. Me brisk të nxehtë, përfundon me krem."
                  className="w-full text-xs bg-[#1e1e35] border border-[rgba(120,120,255,0.12)] rounded-md px-3 py-1.5 text-[#8888aa] placeholder:text-[#5a5a7a]"
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addService}
          disabled={input.services.length >= 6}
          className={cn(
            'w-full text-[13px] py-2.5 rounded-lg border border-dashed border-border',
            'text-muted-foreground hover:text-foreground hover:border-foreground/30',
            'transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          + Shto një tjetër
        </button>

        <p className="text-[12px] text-muted-foreground">
          {input.services.length === 0
            ? 'Asnjë shërbim · AI do ta krijojë seksionin sipas përshkrimit'
            : `${input.services.length} ${input.services.length === 1 ? 'shërbim' : 'shërbime'} · maksimumi 6`}
        </p>
      </div>

      {/* C — Booking method (existing, conditional on registration toggle) */}
      {bookingEnabled && (
        <div className="space-y-3">
          <FieldLabel>Si i kontaktojnë klientët?</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {BOOKING_CHIPS.map(c => (
              <Chip
                key={c.value}
                active={input.bookingMethod === c.value}
                onClick={() => update({ bookingMethod: c.value })}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Step 3 ----------
//
// One scrollable step with four layout pickers. Each picker is a 5-card grid
// (4 specific layouts + 'AI vendos'). Default selection is 'ai' across the
// board; the post-processor in /api/generate-variants only forces the AI's
// layout when the user picked a specific one.
function Step3({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  return (
    <div className="space-y-10">
      <LayoutPicker
        title="Hero"
        family="hero"
        options={HERO_LAYOUTS}
        selected={input.heroLayout}
        onPick={(v) => update({ heroLayout: v as WizardInput['heroLayout'] })}
      />
      <LayoutPicker
        title="Historia"
        family="story"
        options={STORY_LAYOUTS}
        selected={input.storyLayout}
        onPick={(v) => update({ storyLayout: v as WizardInput['storyLayout'] })}
      />
      <LayoutPicker
        title="Shërbimet"
        family="services"
        options={SERVICES_LAYOUTS}
        selected={input.servicesLayout}
        onPick={(v) => update({ servicesLayout: v as WizardInput['servicesLayout'] })}
      />
      <LayoutPicker
        title="Galeria"
        family="gallery"
        options={GALLERY_LAYOUTS}
        selected={input.galleryLayout}
        onPick={(v) => update({ galleryLayout: v as WizardInput['galleryLayout'] })}
      />
    </div>
  );
}

type LayoutFamily = 'hero' | 'story' | 'services' | 'gallery';

function LayoutPicker({
  title, family, options, selected, onPick,
}: {
  title: string;
  family: LayoutFamily;
  options: Array<{ id: string; label: string; sub: string }>;
  selected: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {options.map(opt => (
          <LayoutCard
            key={opt.id}
            family={family}
            option={opt}
            active={selected === opt.id}
            onClick={() => onPick(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutCard({
  family, option, active, onClick,
}: {
  family: LayoutFamily;
  option: { id: string; label: string; sub: string };
  active: boolean;
  onClick: () => void;
}) {
  const isAi = option.id === 'ai';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-3 bg-card transition-all',
        active
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-foreground/30',
        isAi && !active && 'opacity-80',
      )}
    >
      <div className="rounded-md overflow-hidden mb-2 bg-muted/50">
        <LayoutThumb family={family} id={option.id} />
      </div>
      <div className="text-[13px] font-semibold text-foreground flex items-center gap-1">
        {isAi && <span aria-hidden="true">✨</span>}
        {option.label}
      </div>
      <div className="text-[11px] text-muted-foreground">{option.sub}</div>
    </button>
  );
}

// Inline schematic SVG thumbnails for every layout. Kept tiny + abstract —
// they suggest composition rather than render the real layout.
function LayoutThumb({ family, id }: { family: LayoutFamily; id: string }) {
  if (family === 'hero')     return <HeroThumb id={id} />;
  if (family === 'story')    return <StoryThumb id={id} />;
  if (family === 'services') return <ServicesThumb id={id} />;
  return <GalleryThumb id={id} />;
}

function AiThumb() {
  return (
    <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
      <rect width="140" height="70" fill="currentColor" opacity="0.18" />
      <text
        x="70" y="44" textAnchor="middle"
        fontSize="22" fontWeight="700"
        fill="hsl(var(--primary))" opacity="0.85"
        fontFamily="system-ui, sans-serif"
      >
        ✨ AI
      </text>
    </svg>
  );
}

function HeroThumb({ id }: { id: string }) {
  if (id === 'ai') return <AiThumb />;
  const fill = 'currentColor';
  const muted = 'currentColor';
  const accent = 'hsl(var(--primary))';

  if (id === 'fullbleed') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <defs>
          <linearGradient id="cinegrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="140" height="70" fill={fill} opacity="0.8" />
        <rect x="0" y="0" width="140" height="70" fill="url(#cinegrad)" />
        <rect x="20" y="42" width="64" height="6" rx="1" fill="white" opacity="0.9" />
        <rect x="20" y="52" width="36" height="4" rx="1" fill="white" opacity="0.5" />
      </svg>
    );
  }
  if (id === 'split') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect width="70" height="70" fill={fill} opacity="0.85" />
        <rect x="70" width="70" height="70" fill={muted} opacity="0.25" />
        <rect x="80" y="22" width="44" height="5" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="80" y="32" width="32" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="80" y="44" width="22" height="6" rx="1" fill={accent} opacity="0.85" />
      </svg>
    );
  }
  if (id === 'centered') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect width="140" height="70" fill={fill} opacity="0.7" />
        <rect x="58" y="20" width="24" height="3" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="34" y="29" width="72" height="6" rx="1" fill="white" opacity="0.9" />
        <rect x="46" y="41" width="48" height="3" rx="1" fill="white" opacity="0.5" />
        <rect x="58" y="50" width="24" height="6" rx="1" fill={accent} opacity="0.85" />
      </svg>
    );
  }
  // editorial
  return (
    <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
      <rect width="140" height="70" fill={muted} opacity="0.18" />
      <rect x="6" y="6" width="20" height="3" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="114" y="6" width="20" height="3" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="6" y="11" width="128" height="0.5" fill="currentColor" opacity="0.5" />
      <rect x="10" y="28" width="120" height="10" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="10" y="46" width="80" height="3" rx="1" fill="currentColor" opacity="0.45" />
      <rect x="10" y="54" width="60" height="3" rx="1" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function StoryThumb({ id }: { id: string }) {
  if (id === 'ai') return <AiThumb />;
  const fill = 'currentColor';
  const accent = 'hsl(var(--primary))';
  if (id === 'centered-quote') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect width="140" height="70" fill={fill} opacity="0.12" />
        <text x="20" y="38" fontSize="20" fontWeight="700" fill={accent} opacity="0.7" fontFamily="serif">"</text>
        <rect x="34" y="26" width="72" height="5" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="34" y="36" width="56" height="5" rx="1" fill="currentColor" opacity="0.7" />
        <text x="106" y="46" fontSize="20" fontWeight="700" fill={accent} opacity="0.7" fontFamily="serif">"</text>
      </svg>
    );
  }
  if (id === 'two-column') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect x="8" y="8" width="56" height="54" rx="2" fill={fill} opacity="0.35" />
        <rect x="74" y="14" width="58" height="4" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="74" y="24" width="50" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="74" y="32" width="56" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="74" y="40" width="44" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="74" y="48" width="52" height="3" rx="1" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }
  if (id === 'long-form') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect x="22" y="6" width="96" height="22" rx="2" fill={fill} opacity="0.35" />
        <rect x="22" y="34" width="96" height="3" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="22" y="42" width="96" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="22" y="50" width="80" height="3" rx="1" fill="currentColor" opacity="0.45" />
        <rect x="22" y="58" width="60" height="3" rx="1" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }
  // pull-quote
  return (
    <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
      <rect x="14" y="14" width="3" height="42" fill={accent} opacity="0.85" />
      <rect x="22" y="20" width="100" height="6" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="22" y="32" width="80" height="4" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="22" y="42" width="100" height="3" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="22" y="50" width="74" height="3" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function ServicesThumb({ id }: { id: string }) {
  if (id === 'ai') return <AiThumb />;
  const fill = 'currentColor';
  const accent = 'hsl(var(--primary))';
  if (id === 'list') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        {[12, 28, 44, 60].map((y, i) => (
          <g key={i}>
            <rect x="8" y={y} width="80" height="3" rx="1" fill="currentColor" opacity="0.7" />
            <rect x="116" y={y} width="16" height="3" rx="1" fill={accent} opacity="0.85" />
            <rect x="8" y={y + 6} width="124" height="0.5" fill="currentColor" opacity="0.25" />
          </g>
        ))}
      </svg>
    );
  }
  if (id === 'grid-3') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        {[8, 50, 92].map((x, i) => (
          <g key={i}>
            <rect x={x} y="8" width="40" height="20" rx="2" fill={fill} opacity="0.3" />
            <rect x={x} y="32" width="34" height="3" rx="1" fill="currentColor" opacity="0.7" />
            <rect x={x} y="40" width="24" height="2" rx="1" fill="currentColor" opacity="0.45" />
          </g>
        ))}
      </svg>
    );
  }
  if (id === 'editorial-rows') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        {[8, 30, 52].map((y, i) => (
          <g key={i}>
            <text x="10" y={y + 12} fontSize="11" fontWeight="700" fill={accent} opacity="0.6" fontFamily="serif">0{i + 1}</text>
            <rect x="32" y={y + 4} width="80" height="3" rx="1" fill="currentColor" opacity="0.7" />
            <rect x="32" y={y + 10} width="60" height="2" rx="1" fill="currentColor" opacity="0.45" />
            <rect x="116" y={y + 4} width="16" height="3" rx="1" fill={accent} opacity="0.85" />
            <rect x="8" y={y + 18} width="124" height="0.5" fill="currentColor" opacity="0.25" />
          </g>
        ))}
      </svg>
    );
  }
  // cards
  return (
    <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
      {[8, 74].map((x, i) => (
        <g key={i}>
          <rect x={x} y="8" width="58" height="54" rx="3" fill={fill} opacity="0.25" />
          <rect x={x} y="8" width="58" height="22" rx="3" fill={fill} opacity="0.4" />
          <rect x={x + 6} y="36" width="46" height="3" rx="1" fill="currentColor" opacity="0.7" />
          <rect x={x + 6} y="44" width="34" height="2" rx="1" fill="currentColor" opacity="0.45" />
          <circle cx={x + 50} cy="16" r="6" fill={accent} opacity="0.85" />
        </g>
      ))}
    </svg>
  );
}

function GalleryThumb({ id }: { id: string }) {
  if (id === 'ai') return <AiThumb />;
  const fill = 'currentColor';
  if (id === 'masonry') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect x="6" y="6" width="40" height="36" rx="2" fill={fill} opacity="0.35" />
        <rect x="6" y="46" width="40" height="18" rx="2" fill={fill} opacity="0.3" />
        <rect x="50" y="6" width="40" height="22" rx="2" fill={fill} opacity="0.3" />
        <rect x="50" y="32" width="40" height="32" rx="2" fill={fill} opacity="0.35" />
        <rect x="94" y="6" width="40" height="28" rx="2" fill={fill} opacity="0.3" />
        <rect x="94" y="38" width="40" height="26" rx="2" fill={fill} opacity="0.35" />
      </svg>
    );
  }
  if (id === 'grid-uniform') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        {[6, 50, 94].flatMap((x, i) =>
          [6, 38].map((y, j) => (
            <rect key={`${i}-${j}`} x={x} y={y} width="40" height="26" rx="2" fill={fill} opacity="0.3" />
          )),
        )}
      </svg>
    );
  }
  if (id === 'showcase') {
    return (
      <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
        <rect x="6" y="6" width="80" height="58" rx="2" fill={fill} opacity="0.4" />
        <rect x="92" y="6" width="42" height="18" rx="2" fill={fill} opacity="0.3" />
        <rect x="92" y="26" width="42" height="18" rx="2" fill={fill} opacity="0.3" />
        <rect x="92" y="46" width="42" height="18" rx="2" fill={fill} opacity="0.3" />
      </svg>
    );
  }
  // strip
  return (
    <svg viewBox="0 0 140 70" className="w-full h-auto block text-muted-foreground/30">
      {[6, 36, 66, 96, 126].map((x, i) => (
        <rect key={i} x={x} y="14" width="26" height="42" rx="2" fill={fill} opacity={0.35 - i * 0.03} />
      ))}
    </svg>
  );
}

// ---------- Step 4 ----------
//
// Visual archetype picker — replaces the old mood + fontPersonality steps.
// 8 pre-validated archetype cards, plus a "Ngjyrat e mia" custom-colors card
// (with inline color pickers + font dropdown) and an "AI vendos" card that
// lets Sonnet pick the archetype from the list. The server resolves palette
// and fonts for every path; Sonnet never invents hex values.
function Step4({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  const setArchetype = (key: WizardInput['archetypeKey']) => {
    if (key === 'custom') {
      update({ archetypeKey: 'custom' });
    } else {
      // Selecting an archetype or AI clears any custom-color leftovers so the
      // server doesn't see stale brandPrimary/brandAccent values.
      update({ archetypeKey: key, brandPrimary: undefined, brandAccent: undefined, customFont: undefined });
    }
  };

  return (
    <div className="space-y-3">
      <FieldLabel hint="Zgjidh ndjenjën vizuale që i përshtatet biznesit tënd. Ngjyrat dhe shkronjat janë të paracaktuara — pa rrezik të lexueshmërisë.">
        Stili i faqes suaj
      </FieldLabel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(ARCHETYPES) as Array<[ArchetypeKey, Archetype]>).map(([key, arch]) => (
          <ArchetypeCard
            key={key}
            archetype={arch}
            active={input.archetypeKey === key}
            onClick={() => setArchetype(key)}
          />
        ))}

        <CustomColorsCard
          active={input.archetypeKey === 'custom'}
          onSelect={() => setArchetype('custom')}
          brandPrimary={input.brandPrimary}
          brandAccent={input.brandAccent}
          customFont={input.customFont}
          onPrimaryChange={(v) => update({ brandPrimary: v })}
          onAccentChange={(v) => update({ brandAccent: v })}
          onFontChange={(v) => update({ customFont: v })}
        />

        <AIDecideCard
          active={input.archetypeKey === 'ai'}
          onClick={() => setArchetype('ai')}
        />
      </div>
    </div>
  );
}

function ArchetypeCard({
  archetype, active, onClick,
}: {
  archetype: Archetype;
  active: boolean;
  onClick: () => void;
}) {
  const { bgColor, primaryColor, accentColor, textColor, surfaceColor } = archetype.palette;
  // The wizard preview uses system fonts (Google Fonts only load on the
  // generated tenant site). Approximate per family so the card sample at
  // least hints at serif vs geometric vs neutral vs friendly.
  const fontFamily =
    archetype.headingFont === 'playfair' ? 'Georgia, "Times New Roman", serif' :
    archetype.headingFont === 'space-grotesk' ? '"Helvetica Neue", system-ui, sans-serif' :
    archetype.headingFont === 'poppins' ? '"Trebuchet MS", system-ui, sans-serif' :
    'system-ui, sans-serif';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-3 bg-card transition-all',
        active
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <div className="flex gap-1 mb-2">
        {[bgColor, primaryColor, accentColor, textColor, surfaceColor].map((color, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full border border-border/50"
            style={{ background: color }}
          />
        ))}
      </div>
      <div
        className="text-[13px] font-semibold text-foreground mb-0.5 truncate"
        style={{ fontFamily }}
      >
        {archetype.nameAlb}
      </div>
      <div className="text-[11px] text-muted-foreground leading-tight">{archetype.descriptor}</div>
    </button>
  );
}

function CustomColorsCard({
  active, onSelect, brandPrimary, brandAccent, customFont,
  onPrimaryChange, onAccentChange, onFontChange,
}: {
  active: boolean;
  onSelect: () => void;
  brandPrimary?: string;
  brandAccent?: string;
  customFont?: WizardInput['customFont'];
  onPrimaryChange: (v: string) => void;
  onAccentChange: (v: string) => void;
  onFontChange: (v: NonNullable<WizardInput['customFont']>) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={cn(
        'text-left rounded-xl border p-3 bg-card transition-all cursor-pointer',
        active
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <div className="text-[16px] mb-1" aria-hidden="true">🎨</div>
      <div className="text-[13px] font-semibold text-foreground mb-0.5">Ngjyrat e mia</div>
      <div className="text-[11px] text-muted-foreground leading-tight">Kam tashmë ngjyrat e markës</div>

      {active && (
        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Ngjyra kryesore</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={isHex(brandPrimary) ? brandPrimary! : '#4f8ef7'}
                onChange={(e) => onPrimaryChange(e.target.value)}
                className="h-8 w-10 rounded border border-border cursor-pointer bg-card"
              />
              <input
                type="text"
                value={brandPrimary ?? ''}
                onChange={(e) => onPrimaryChange(e.target.value)}
                placeholder="#4f8ef7"
                className="flex-1 text-[12px] font-mono bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Ngjyra dytësore</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={isHex(brandAccent) ? brandAccent! : '#8b5cf6'}
                onChange={(e) => onAccentChange(e.target.value)}
                className="h-8 w-10 rounded border border-border cursor-pointer bg-card"
              />
              <input
                type="text"
                value={brandAccent ?? ''}
                onChange={(e) => onAccentChange(e.target.value)}
                placeholder="#8b5cf6"
                className="flex-1 text-[12px] font-mono bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Fonti</label>
            <select
              value={customFont ?? 'dm-sans'}
              onChange={(e) => onFontChange(e.target.value as NonNullable<WizardInput['customFont']>)}
              className="w-full text-[12px] bg-background border border-border rounded px-2 py-1.5 text-foreground focus:outline-none focus:border-primary"
            >
              {CUSTOM_FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          {(!isHex(brandPrimary) || !isHex(brandAccent)) && (
            <p className="text-[11px] text-muted-foreground">
              Të dyja ngjyrat duhet të jenë hex të vlefshme (#rrggbb).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AIDecideCard({
  active, onClick,
}: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-3 bg-card transition-all',
        active
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <div className="text-[16px] mb-1" aria-hidden="true">✨</div>
      <div className="text-[13px] font-semibold text-foreground mb-0.5">AI vendos</div>
      <div className="text-[11px] text-muted-foreground leading-tight">Zgjedh stilin bazuar në biznesin tënd</div>
    </button>
  );
}

// ---------- Step 5 ----------
function Step5({
  input, update, businessName,
}: {
  input: WizardInput;
  update: (p: Partial<WizardInput>) => void;
  businessName: string;
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <FieldLabel>Gjuha e faqes</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_CHIPS.map(c => (
            <Chip
              key={c.value}
              active={input.language === c.value}
              onClick={() => update({ language: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel>Toni</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TONE_OPTIONS.map(tone => {
            const active = input.tone === tone.value;
            return (
              <button
                key={tone.value}
                type="button"
                onClick={() => update({ tone: tone.value })}
                className={cn(
                  'flex flex-col items-start text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'bg-primary/15 border-primary'
                    : 'bg-card border-border hover:border-foreground/30',
                )}
              >
                <span className="text-[14px] font-medium text-foreground">{tone.label}</span>
                <span className="text-xs text-[#5a5a7a] italic mt-1 block">{tone.example}</span>
              </button>
            );
          })}
        </div>
      </div>

      <RecapCard input={input} businessName={businessName} />
    </div>
  );
}

function RecapCard({ input, businessName }: { input: WizardInput; businessName: string }) {
  const archetypeLabel: string = input.archetypeKey === 'ai'
    ? '✨ AI vendos'
    : input.archetypeKey === 'custom'
      ? '🎨 Ngjyrat e mia'
      : ARCHETYPES[input.archetypeKey].nameAlb;
  const bookingLabel = BOOKING_CHIPS.find(c => c.value === input.bookingMethod)?.label ?? input.bookingMethod;
  const namedServices = input.services.filter(s => s.name.trim()).length;

  const heroLayoutLabel = HERO_LAYOUTS.find(o => o.id === input.heroLayout)?.label ?? input.heroLayout;
  const storyLayoutLabel = STORY_LAYOUTS.find(o => o.id === input.storyLayout)?.label ?? input.storyLayout;
  const servicesLayoutLabel = SERVICES_LAYOUTS.find(o => o.id === input.servicesLayout)?.label ?? input.servicesLayout;
  const galleryLayoutLabel = GALLERY_LAYOUTS.find(o => o.id === input.galleryLayout)?.label ?? input.galleryLayout;

  const description = (input.businessDescription ?? '').trim();
  const descriptionLabel = description.length === 0
    ? '—'
    : description.length > 60
      ? `${description.slice(0, 60).trimEnd()}…`
      : description;

  const rows: Array<[string, string]> = [
    ['Biznesi', businessName || '—'],
    ['Lloji', input.industry || '—'],
    ['Vendndodhja', input.city || '—'],
    ['Përshkrimi', descriptionLabel],
    ['Shërbime', `${namedServices} shtuar · ${bookingLabel}`],
    ['Hero', heroLayoutLabel],
    ['Historia', storyLayoutLabel],
    ['Shërbimet (layout)', servicesLayoutLabel],
    ['Galeria', galleryLayoutLabel],
    ['Stili', archetypeLabel],
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Përmbledhje e zgjedhjeve
      </div>
      <div className="divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// Step 6 — Generation screen
// =================================================================

function GenerationScreen({
  activeStep, completedSteps, language, error, onRetry,
}: {
  activeStep: ProgressStep | null;
  completedSteps: Set<ProgressStep>;
  language: WizardInput['language'];
  error: string | null;
  onRetry: () => void;
}) {
  const labelOf = (s: { labelSq: string; labelEn: string }) =>
    language === 'en' ? s.labelEn : s.labelSq;

  // Live "message" line above the substeps — current active step's label
  // followed by an ellipsis. Falls back to a generic line when nothing is
  // active yet (very brief — between mount and first event).
  const activeLabel = activeStep
    ? labelOf(SUBSTEPS.find(s => s.step === activeStep) ?? SUBSTEPS[0])
    : labelOf(SUBSTEPS[0]);

  const buildingHeading = language === 'en'
    ? 'Building your website…'
    : 'Po e ndërtojmë faqen tënde…';
  const errorHeading = language === 'en'
    ? 'Something went wrong'
    : 'Ndodhi një gabim';
  const retryLabel = language === 'en' ? 'Try again' : 'Provo përsëri';

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-md w-full">
        {error ? (
          <>
            <div className="text-[15px] text-foreground font-semibold">{errorHeading}</div>
            <div className="text-[13px] text-muted-foreground">{error}</div>
            <button
              type="button"
              onClick={onRetry}
              className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm"
            >
              {retryLabel}
            </button>
          </>
        ) : (
          <>
            <Spinner />
            <div className="space-y-2">
              <h2 className="text-[22px] font-semibold text-foreground">
                {buildingHeading}
              </h2>
              <p className="text-[14px] text-muted-foreground">{activeLabel}…</p>
            </div>

            <ul className="text-left space-y-2.5 mx-auto" style={{ maxWidth: 320 }}>
              {SUBSTEPS.map((s) => {
                const isDone = completedSteps.has(s.step);
                const isActive = activeStep === s.step && !isDone;
                return (
                  <li key={s.step} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full transition-all',
                        isDone
                          ? 'bg-[hsl(var(--success,142_76%_36%))] border-0'
                          : isActive
                            ? 'border-[1.5px] border-primary bg-primary/20 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]'
                            : 'border-[1.5px] border-muted-foreground/40',
                      )}
                    />
                    <span
                      className={cn(
                        'text-[13px]',
                        isDone
                          ? 'text-muted-foreground'
                          : isActive
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground',
                      )}
                    >
                      {labelOf(s)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="mx-auto relative" style={{ width: 64, height: 64 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
          animation: 'spin 1.4s linear infinite',
        }}
      />
      <div className="absolute inset-[6px] rounded-full bg-background" />
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-2xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.6), transparent 70%)' }}
      />
    </div>
  );
}

// =================================================================
// Step 7 — Preview screen
// =================================================================

function PreviewScreen({
  theme, subdomain, businessName, city, applying, applyError, onRegenerate, onApply,
}: {
  theme: Theme;
  subdomain: string;
  businessName: string;
  city: string;
  applying: boolean;
  applyError: string | null;
  onRegenerate: () => void;
  onApply: () => void;
}) {
  return (
    <div className="flex-1 px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="sticky top-0 z-30 -mx-2 flex items-center justify-between gap-4 flex-wrap rounded-xl bg-background/95 px-2 py-2 backdrop-blur">
          <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight">Faqja jote është gati</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={applying}
              className={cn(
                'text-[13px] rounded-lg px-4 py-2 border border-border bg-card',
                'text-foreground hover:border-foreground/30 transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              ↻ Rigjenero
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={applying}
              className={cn(
                'text-[13px] font-semibold rounded-lg px-5 py-2 transition-all',
                'bg-gradient-to-br from-primary to-accent text-primary-foreground',
                'shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]',
                'hover:shadow-[0_0_32px_-6px_hsl(var(--primary)/0.8)]',
                'disabled:opacity-50',
                'inline-flex items-center gap-2',
              )}
            >
              {applying && (
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                />
              )}
              Përdor këtë →
            </button>
          </div>
        </div>

        {applyError && (
          <div className="text-[13px] text-destructive">
            {applyError}
          </div>
        )}

        <div className="relative z-0 bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="flex-1 mx-3 px-3 py-1 rounded-md bg-muted text-[12px] text-muted-foreground font-mono truncate">
              {publicSiteLabel(subdomain)}
            </div>
          </div>
          <div className="relative isolate rounded-xl border border-border overflow-hidden bg-card">
            <div className="relative max-h-[600px] md:max-h-[70vh] overflow-y-auto overscroll-contain">
              <DynamicSiteRenderer
                business={previewBusiness(businessName, city)}
                services={previewServicesFromTheme(theme)}
                hours={[]}
                payload={theme}
                previewMode
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stub Business for the wizard preview. The renderer reads name/address/phone
// for footer + hero metadata. Other fields default to safe empties.
function previewBusiness(businessName: string, city: string): Business {
  return {
    id: 'preview',
    name: businessName || 'Faqja jote',
    subdomain: 'preview',
    industry: 'other',
    template: '__ai__',
    templateId: '__ai__',
    phone: '',
    address: city,
    description: '',
    logoUrl: '',
    accentColor: '',
    socialLinks: { instagram: '', facebook: '', whatsapp: '' },
    gallerySections: {},
    createdAt: new Date().toISOString(),
  };
}

// Surface AI-generated services from the theme's services section so the
// renderer's fallback (when section.items is empty) has data to display.
function previewServicesFromTheme(theme: Theme): Service[] {
  const servicesSection = theme.sections.find(s => s.kind === 'services');
  if (!servicesSection || servicesSection.kind !== 'services') return [];
  const items = Array.isArray(servicesSection.items) ? servicesSection.items : [];
  return items
    .filter(it => typeof it?.name === 'string' && it.name.trim().length > 0)
    .map((it, idx) => ({
      id: `preview-${idx}`,
      businessId: 'preview',
      name: String(it.name).trim(),
      description: typeof it.description === 'string' ? it.description : '',
      price: typeof it.price === 'number' ? it.price : 0,
      durationMinutes: typeof it.durationMinutes === 'number' ? it.durationMinutes : 30,
    }));
}
