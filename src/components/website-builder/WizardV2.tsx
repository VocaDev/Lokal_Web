'use client';

import { useState } from 'react';
import { cn, fontFamilyOf, publicSiteHref, publicSiteLabel } from '@/lib/utils';
import type { WizardInput } from '@/lib/types/customization';

type Brief = {
  positioning: string;
  definingTraits: string[];
  targetCustomer: string;
  voice: string;
  culturalAnchor: string;
};

type Theme = {
  variantName?: string;
  templateId?: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
  heroHeight?: string;
  cardStyle?: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutCopy: string;
  ctaPrimary: string;
  ctaSecondary?: string;
  footerTagline?: string;
  metaDescription?: string;
  valueProps?: Array<{ icon: string; title: string; description: string }>;
  testimonials?: Array<{ name: string; role: string; quote: string; rating: number }>;
  faq?: Array<{ question: string; answer: string }>;
  services?: Array<{ name: string; description: string; price: number; durationMinutes: number }>;
  showTestimonials?: boolean;
  showTeam?: boolean;
  showContact?: boolean;
  // honor wizard intent client-side; the AI may emit it back too
  heroStyle?: WizardInput['hero'];
};

type Props = {
  businessId: string;
  subdomain: string;
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

const HERO_OPTIONS: Array<{ id: WizardInput['hero']; label: string; sub: string }> = [
  { id: 'cinematic', label: 'Kinematik', sub: 'Foto e plotë' },
  { id: 'split', label: 'I ndarë', sub: 'Foto + tekst' },
  { id: 'centered', label: 'I qendërsuar', sub: 'Minimalist' },
  { id: 'editorial', label: 'Editorial', sub: 'Si revistë' },
];

const SECTION_PRIORITY_CHIPS: Array<{ label: string; value: WizardInput['sectionPriority'] }> = [
  { label: 'Shërbimet', value: 'services' },
  { label: 'Historia', value: 'story' },
  { label: 'Galeria', value: 'gallery' },
];

const DENSITY_CHIPS: Array<{ label: string; value: WizardInput['density'] }> = [
  { label: 'Hapësirë e gjerë', value: 'sparse' },
  { label: 'I dendur dhe i pasur', value: 'dense' },
];

// Mood swatches are intentional palette samples — the only place hex literals
// are allowed in this file. They are also the source of truth the AI prompt
// references via moodDirective() in app/api/generate-variants/route.ts.
const MOOD_OPTIONS: Array<{
  id: WizardInput['mood'];
  label: string;
  sub: string;
  swatches: string[];
  hatched?: boolean;
}> = [
  { id: 'warm',    label: 'I ngrohtë',    sub: 'Tradicionale, e tokës',  swatches: ['#8b6f47', '#d4af37', '#1a1512', '#3a2f24'] },
  { id: 'cool',    label: 'I qetë',       sub: 'Modern, profesional',     swatches: ['#3b82f6', '#06b6d4', '#0a0a0f', '#1e293b'] },
  { id: 'bold',    label: 'I guximshëm',  sub: 'Tërheqës, i fortë',       swatches: ['#ef4444', '#f59e0b', '#0a0a0f', '#2a1414'] },
  { id: 'elegant', label: 'Elegant',      sub: 'Premium, i rafinuar',     swatches: ['#d4af37', '#8b6f47', '#0d0a0a', '#1f1a14'] },
  { id: 'custom',  label: 'Ngjyrat e mia', sub: 'Zgjidhi vetë',            swatches: ['', '', '', ''], hatched: true },
];

const FONT_PERSONALITY_CHIPS: Array<{ label: string; value: WizardInput['fontPersonality'] }> = [
  { label: 'Editorial', value: 'editorial' },
  { label: 'Modern dhe i mprehtë', value: 'modern' },
  { label: 'I afërt dhe miqësor', value: 'friendly' },
  { label: 'I guximshëm', value: 'bold' },
  { label: 'Elegant tradicional', value: 'elegant' },
];

const LANGUAGE_CHIPS: Array<{ label: string; value: WizardInput['language'] }> = [
  { label: 'Shqip', value: 'sq' },
  { label: 'Anglisht', value: 'en' },
  { label: 'Të dyja', value: 'both' },
];

const TONE_CHIPS: Array<{ label: string; value: WizardInput['tone'] }> = [
  { label: 'Miqësor', value: 'friendly' },
  { label: 'Profesional', value: 'professional' },
  { label: 'I guximshëm', value: 'bold' },
];

const SUBSTEP_LABELS = [
  'Analizë e biznesit',
  'Strategji e markës',
  'Ndërtimi i temës',
  'Shkrimi i përmbajtjes',
  'Përpilimi përfundimtar',
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isHex = (v?: string) => !!v && HEX_RE.test(v.trim());

function defaultInput(): WizardInput {
  return {
    businessName: '',
    industry: '',
    industryChip: undefined,
    city: '',
    uniqueness: '',
    services: [
      { name: '', price: '', durationMinutes: undefined },
      { name: '', price: '', durationMinutes: undefined },
    ],
    bookingMethod: 'appointments',
    hero: 'cinematic',
    sectionPriority: 'services',
    density: 'dense',
    mood: 'warm',
    brandPrimary: undefined,
    brandAccent: undefined,
    fontPersonality: 'editorial',
    language: 'sq',
    tone: 'friendly',
  };
}

export default function WizardV2({ businessId, subdomain }: Props) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<WizardInput>(defaultInput);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const [activeSubstep, setActiveSubstep] = useState(0);
  const [doneSubsteps, setDoneSubsteps] = useState<number[]>([]);
  const [genMessage, setGenMessage] = useState('Po analizojmë biznesin tënd...');
  const [genError, setGenError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const update = (patch: Partial<WizardInput>) => setInput(prev => ({ ...prev, ...patch }));

  // -------- step validation --------
  const validateStep = (s: number): boolean => {
    if (s === 1) {
      return input.businessName.trim().length >= 2 &&
             input.industry.trim().length >= 2 &&
             input.city.trim().length >= 2;
    }
    if (s === 2) {
      const named = input.services.filter(x => x.name.trim().length > 0);
      return named.length >= 2;
    }
    if (s === 3) return !!input.hero && !!input.sectionPriority && !!input.density;
    if (s === 4) {
      if (!input.mood) return false;
      if (input.mood === 'custom') return isHex(input.brandPrimary) && isHex(input.brandAccent);
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
    setActiveSubstep(opts.reuseBrief ? 1 : 0);
    setDoneSubsteps(opts.reuseBrief ? [0] : []);
    setGenMessage(opts.reuseBrief ? 'Po rigjenerojmë temën...' : 'Po analizojmë biznesin tënd...');

    let currentBrief: Brief | null = opts.reuseBrief ?? null;

    try {
      // Step A — brand brief (skipped on regenerate)
      if (!currentBrief) {
        const briefRes = await fetch('/api/brand-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: input.businessName,
            industry: input.industry,
            industryChip: input.industryChip,
            city: input.city,
            uniqueness: input.uniqueness,
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
          }),
        });
        if (!briefRes.ok) {
          const err = await briefRes.json().catch(() => ({}));
          throw new Error(err.error || `Brief generation failed (${briefRes.status})`);
        }
        const briefData = await briefRes.json();
        currentBrief = briefData.brief as Brief;
        setBrief(currentBrief);
        setDoneSubsteps([0]);
        setActiveSubstep(1);
        setGenMessage('Po formojmë strategjinë e markës...');
      }

      // Cosmetic substep advancer — stops if API responds first.
      const t1 = setTimeout(() => {
        setActiveSubstep(prev => (prev < 2 ? 2 : prev));
        setDoneSubsteps(prev => prev.includes(1) ? prev : [...prev, 1]);
        setGenMessage('Po ndërtojmë temën...');
      }, 4000);
      const t2 = setTimeout(() => {
        setActiveSubstep(prev => (prev < 3 ? 3 : prev));
        setDoneSubsteps(prev => prev.includes(2) ? prev : [...prev, 2]);
        setGenMessage('Po shkruajmë përmbajtjen...');
      }, 8000);
      const t3 = setTimeout(() => {
        setActiveSubstep(prev => (prev < 4 ? 4 : prev));
        setDoneSubsteps(prev => prev.includes(3) ? prev : [...prev, 3]);
        setGenMessage('Po e përpilojmë...');
      }, 12000);

      const themeRes = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: currentBrief,
          businessName: input.businessName,
          industry: input.industry,
          city: input.city,
          hero: input.hero,
          sectionPriority: input.sectionPriority,
          density: input.density,
          mood: input.mood,
          brandPrimary: input.brandPrimary,
          brandAccent: input.brandAccent,
          fontPersonality: input.fontPersonality,
          language: input.language,
          tone: input.tone,
          userProvidedServices: input.services
            .map(s => s.name.trim())
            .filter(Boolean)
            .join(', '),
          regenSeed: opts.reuseBrief ? Date.now().toString() : undefined,
        }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      if (!themeRes.ok) {
        const err = await themeRes.json().catch(() => ({}));
        throw new Error(err.error || `Theme generation failed (${themeRes.status})`);
      }
      const themeData = await themeRes.json();
      const t = themeData.theme as Theme;
      // Honor the wizard's chosen hero in preview, regardless of what AI emits.
      t.heroStyle = input.hero;
      setTheme(t);
      setDoneSubsteps([0, 1, 2, 3, 4]);
      setActiveSubstep(5);
      setGenMessage('Gati!');
      setStep(7);
    } catch (e: any) {
      setGenError(e?.message || 'Gjenerimi dështoi');
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
          heroStyle: input.hero,
          sectionPriority: input.sectionPriority,
          density: input.density,
          uniquenessStatement: input.uniqueness,
          bookingMethod: input.bookingMethod,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Aplikimi dështoi');
      const target = body.subdomain || subdomain;
      window.location.href = publicSiteHref(target);
    } catch (e: any) {
      setApplyError(e?.message || 'Aplikimi dështoi');
      setApplying(false);
    }
  };

  // -------- chrome --------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="font-semibold tracking-tight">
            <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">LokalWeb</span>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Dil
          </a>
        </div>
      </header>

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
            <Step1 input={input} update={update} />
          </StepShell>
        )}
        {step === 2 && (
          <StepShell
            heading="Çfarë ofron?"
            subtitle="Shkruaj 2 ose 3 shërbime kryesore — kjo i tregon AI-së se çfarë ti bën. Të tjerat i shton më vonë në panelin e kontrollit."
          >
            <Step2 input={input} update={update} />
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
            <Step5 input={input} update={update} />
          </StepShell>
        )}

        {step === 6 && (
          <GenerationScreen
            activeSubstep={activeSubstep}
            doneSubsteps={doneSubsteps}
            message={genMessage}
            error={genError}
            onRetry={() => runGeneration()}
          />
        )}

        {step === 7 && theme && (
          <PreviewScreen
            theme={theme}
            subdomain={subdomain}
            businessName={input.businessName}
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
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FieldLabel>Emri i biznesit</FieldLabel>
        <TextInput
          value={input.businessName}
          onChange={(e) => update({ businessName: e.target.value })}
          placeholder="p.sh., Berberi Albi"
          maxLength={60}
        />
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
          placeholder="p.sh., Prishtinë, Sunny Hill"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel hint="Një fjali. Gjëja që sjell klientët mbrapa.">
          Çfarë e bën biznesin tënd ndryshe? <span className="text-muted-foreground font-normal">(opsionale)</span>
        </FieldLabel>
        <TextArea
          value={input.uniqueness ?? ''}
          onChange={(e) => update({ uniqueness: e.target.value })}
          placeholder="p.sh., Pa takim. Vetëm hyni dhe uleni në karrigen e parë të lirë."
        />
      </div>
    </div>
  );
}

// ---------- Step 2 ----------
function Step2({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  const updateService = (idx: number, patch: Partial<WizardInput['services'][number]>) => {
    const next = input.services.map((s, i) => i === idx ? { ...s, ...patch } : s);
    update({ services: next });
  };
  const addService = () => {
    if (input.services.length >= 6) return;
    update({ services: [...input.services, { name: '', price: '', durationMinutes: undefined }] });
  };
  const removeService = (idx: number) => {
    if (input.services.length <= 2) return;
    update({ services: input.services.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FieldLabel hint="çmimi dhe kohëzgjatja janë opsionale">Shërbimet kryesore</FieldLabel>

        <div className="space-y-2">
          {input.services.map((s, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_88px_40px] md:grid-cols-[1fr_100px_120px_40px] gap-2 items-center"
            >
              <TextInput
                value={s.name}
                onChange={(e) => updateService(idx, { name: e.target.value })}
                placeholder="Emri i shërbimit (p.sh. Qethje)"
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
                placeholder="Kohëzgjatja (min)"
              />
              <button
                type="button"
                onClick={() => removeService(idx)}
                disabled={input.services.length <= 2}
                className={cn(
                  'h-10 w-10 rounded-lg border border-border text-muted-foreground',
                  'hover:border-foreground/30 hover:text-foreground transition-colors',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
                aria-label="Hiq shërbimin"
              >
                ×
              </button>
            </div>
          ))}
        </div>

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
          + Shto një shërbim tjetër
        </button>

        <p className="text-[12px] text-muted-foreground">
          {input.services.length} shërbime · minimumi 2, maksimumi 6
        </p>
      </div>

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
    </div>
  );
}

// ---------- Step 3 ----------
function Step3({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <FieldLabel>Stili i hero-s</FieldLabel>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {HERO_OPTIONS.map(h => (
            <HeroCard
              key={h.id}
              option={h}
              active={input.hero === h.id}
              onClick={() => update({ hero: h.id })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel>Cila pjesë vjen e para?</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SECTION_PRIORITY_CHIPS.map(c => (
            <Chip
              key={c.value}
              active={input.sectionPriority === c.value}
              onClick={() => update({ sectionPriority: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel>Densiteti vizual</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DENSITY_CHIPS.map(c => (
            <Chip
              key={c.value}
              active={input.density === c.value}
              onClick={() => update({ density: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroCard({
  option, active, onClick,
}: {
  option: { id: WizardInput['hero']; label: string; sub: string };
  active: boolean;
  onClick: () => void;
}) {
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
      <div className="rounded-md overflow-hidden mb-2 bg-muted/50">
        <HeroThumb id={option.id} />
      </div>
      <div className="text-[13px] font-semibold text-foreground">{option.label}</div>
      <div className="text-[11px] text-muted-foreground">{option.sub}</div>
    </button>
  );
}

function HeroThumb({ id }: { id: WizardInput['hero'] }) {
  const fill = 'currentColor';
  const muted = 'currentColor';
  const accent = 'hsl(var(--primary))';

  if (id === 'cinematic') {
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

// ---------- Step 4 ----------
function Step4({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <FieldLabel>Vibe-i / atmosfera</FieldLabel>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {MOOD_OPTIONS.map(m => (
            <MoodCard
              key={m.id}
              mood={m}
              active={input.mood === m.id}
              onClick={() => update({ mood: m.id })}
            />
          ))}
        </div>

        {input.mood === 'custom' && (
          <div className="rounded-xl border border-border bg-card p-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-[13px] font-medium text-foreground mb-3">Ngjyrat e tua</div>
            <div className="grid grid-cols-2 gap-4">
              <CustomColorInput
                label="Primare"
                value={input.brandPrimary ?? '#8b6f47'}
                onChange={(v) => update({ brandPrimary: v })}
              />
              <CustomColorInput
                label="Aksent"
                value={input.brandAccent ?? '#d4af37'}
                onChange={(v) => update({ brandAccent: v })}
              />
            </div>
            {(input.mood === 'custom' && (!isHex(input.brandPrimary) || !isHex(input.brandAccent))) && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Të dyja ngjyrat duhet të jenë hex të vlefshme (#rrggbb).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <FieldLabel>Personaliteti i shkronjave</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {FONT_PERSONALITY_CHIPS.map(c => (
            <Chip
              key={c.value}
              active={input.fontPersonality === c.value}
              onClick={() => update({ fontPersonality: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoodCard({
  mood, active, onClick,
}: {
  mood: typeof MOOD_OPTIONS[number];
  active: boolean;
  onClick: () => void;
}) {
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
      <div className="flex gap-1.5 mb-3">
        {mood.swatches.map((sw, i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded-md border border-border/50"
            style={
              mood.hatched
                ? { background: 'repeating-linear-gradient(45deg, #444, #444 4px, #555 4px, #555 8px)' }
                : { background: sw }
            }
          />
        ))}
      </div>
      <div className="text-[13px] font-semibold text-foreground">{mood.label}</div>
      <div className="text-[11px] text-muted-foreground">{mood.sub}</div>
    </button>
  );
}

function CustomColorInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-[12px] text-muted-foreground w-16">{label}</span>
      <input
        type="color"
        value={isHex(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded border border-border bg-card cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#rrggbb"
        className={cn(
          'flex-1 bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono',
          'text-foreground focus:outline-none focus:border-primary',
        )}
      />
    </label>
  );
}

// ---------- Step 5 ----------
function Step5({
  input, update,
}: { input: WizardInput; update: (p: Partial<WizardInput>) => void }) {
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
        <div className="flex flex-wrap gap-2">
          {TONE_CHIPS.map(c => (
            <Chip
              key={c.value}
              active={input.tone === c.value}
              onClick={() => update({ tone: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <RecapCard input={input} />
    </div>
  );
}

function RecapCard({ input }: { input: WizardInput }) {
  const heroLabel = HERO_OPTIONS.find(h => h.id === input.hero)?.label ?? input.hero;
  const sectionLabel = SECTION_PRIORITY_CHIPS.find(c => c.value === input.sectionPriority)?.label ?? input.sectionPriority;
  const densityLabel = DENSITY_CHIPS.find(c => c.value === input.density)?.label ?? input.density;
  const moodLabel = MOOD_OPTIONS.find(m => m.id === input.mood)?.label ?? input.mood;
  const fontLabel = FONT_PERSONALITY_CHIPS.find(c => c.value === input.fontPersonality)?.label ?? input.fontPersonality;
  const bookingLabel = BOOKING_CHIPS.find(c => c.value === input.bookingMethod)?.label ?? input.bookingMethod;
  const namedServices = input.services.filter(s => s.name.trim()).length;

  const rows: Array<[string, string]> = [
    ['Biznesi', input.businessName || '—'],
    ['Lloji', input.industry || '—'],
    ['Vendndodhja', input.city || '—'],
    ['Shërbime', `${namedServices} shtuar · ${bookingLabel}`],
    ['Layout', `${heroLabel} · ${sectionLabel} · ${densityLabel}`],
    ['Atmosfera', `${moodLabel} · ${fontLabel}`],
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
  activeSubstep, doneSubsteps, message, error, onRetry,
}: {
  activeSubstep: number;
  doneSubsteps: number[];
  message: string;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-md w-full">
        {error ? (
          <>
            <div className="text-[15px] text-foreground font-semibold">Ndodhi një gabim</div>
            <div className="text-[13px] text-muted-foreground">{error}</div>
            <button
              type="button"
              onClick={onRetry}
              className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm"
            >
              Provo përsëri
            </button>
          </>
        ) : (
          <>
            <Spinner />
            <div className="space-y-2">
              <h2 className="text-[22px] font-semibold text-foreground">
                Po e ndërtojmë faqen tënde...
              </h2>
              <p className="text-[14px] text-muted-foreground">{message}</p>
            </div>

            <ul className="text-left space-y-2.5 mx-auto" style={{ maxWidth: 320 }}>
              {SUBSTEP_LABELS.map((label, idx) => {
                const isDone = doneSubsteps.includes(idx);
                const isActive = activeSubstep === idx && !isDone;
                return (
                  <li key={idx} className="flex items-center gap-3">
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
                      {label}
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
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

        <div className="bg-card border border-border rounded-2xl p-3">
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
          <div className="rounded-xl overflow-hidden border border-border">
            <PreviewSiteFromTheme
              theme={theme}
              subdomain={subdomain}
              businessName={businessName}
              city={city}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSiteFromTheme({
  theme, businessName, city,
}: {
  theme: Theme;
  subdomain: string;
  businessName: string;
  city: string;
}) {
  const headingFont = fontFamilyOf(theme.headingFont) ?? 'system-ui, sans-serif';
  const bodyFont = fontFamilyOf(theme.bodyFont) ?? 'system-ui, sans-serif';
  const heroStyle = theme.heroStyle ?? 'cinematic';

  const baseStyle: React.CSSProperties = {
    background: theme.bgColor,
    color: theme.textColor,
    fontFamily: bodyFont,
  };

  return (
    <div style={baseStyle}>
      {heroStyle === 'cinematic' && (
        <section
          className="px-8 py-20 md:py-28 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}80 0%, ${theme.bgColor} 50%, ${theme.accentColor}40 100%)`,
          }}
        >
          <div className="max-w-3xl">
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight mb-4"
              style={{ fontFamily: headingFont, color: theme.textColor }}
            >
              {theme.heroHeadline}
            </h1>
            <p
              className="text-base md:text-lg mb-7"
              style={{ color: theme.mutedTextColor }}
            >
              {theme.heroSubheadline}
            </p>
            <button
              className="px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ background: theme.primaryColor, color: theme.bgColor }}
            >
              {theme.ctaPrimary}
            </button>
          </div>
        </section>
      )}

      {heroStyle === 'split' && (
        <section className="grid md:grid-cols-2">
          <div
            className="px-8 py-16 md:py-24"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
              minHeight: 280,
            }}
          />
          <div
            className="px-8 py-16 md:py-24 flex flex-col justify-center"
            style={{ background: theme.surfaceColor }}
          >
            <h1
              className="text-2xl md:text-4xl font-bold leading-tight mb-3"
              style={{ fontFamily: headingFont, color: theme.textColor }}
            >
              {theme.heroHeadline}
            </h1>
            <p className="text-sm md:text-base mb-5" style={{ color: theme.mutedTextColor }}>
              {theme.heroSubheadline}
            </p>
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-semibold w-fit"
              style={{ background: theme.primaryColor, color: theme.bgColor }}
            >
              {theme.ctaPrimary}
            </button>
          </div>
        </section>
      )}

      {heroStyle === 'centered' && (
        <section className="px-8 py-24 md:py-32 text-center">
          <div className="max-w-2xl mx-auto">
            <div
              className="text-xs uppercase tracking-[0.3em] mb-6"
              style={{ color: theme.mutedTextColor }}
            >
              {city || businessName}
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight mb-5"
              style={{ fontFamily: headingFont, color: theme.textColor }}
            >
              {theme.heroHeadline}
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: theme.mutedTextColor }}>
              {theme.heroSubheadline}
            </p>
            <button
              className="px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ background: theme.primaryColor, color: theme.bgColor }}
            >
              {theme.ctaPrimary}
            </button>
          </div>
        </section>
      )}

      {heroStyle === 'editorial' && (
        <section className="px-8 py-16 md:py-24" style={{ background: theme.surfaceColor }}>
          <div
            className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] pb-4 mb-10 border-b"
            style={{ color: theme.mutedTextColor, borderColor: theme.borderColor }}
          >
            <span>№ 01 · {businessName || 'Issue'}</span>
            <span>{city || 'Kosovo'}</span>
          </div>
          <h1
            className="text-4xl md:text-6xl font-bold leading-[1.05] mb-7 max-w-4xl"
            style={{ fontFamily: headingFont, color: theme.textColor }}
          >
            {theme.heroHeadline}
          </h1>
          <p
            className="text-base md:text-lg max-w-2xl leading-relaxed"
            style={{ color: theme.mutedTextColor, fontFamily: bodyFont }}
          >
            {theme.heroSubheadline}
          </p>
        </section>
      )}

      {/* Services */}
      {theme.services && theme.services.length > 0 && (
        <section className="px-8 py-14" style={{ background: theme.bgColor }}>
          <div className="max-w-3xl">
            <h2
              className="text-2xl md:text-3xl font-bold mb-7"
              style={{ fontFamily: headingFont, color: theme.textColor }}
            >
              Shërbimet
            </h2>
            <div className="space-y-3">
              {theme.services.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-6 py-4 border-b"
                  style={{ borderColor: theme.borderColor }}
                >
                  <div>
                    <div className="text-base font-semibold" style={{ color: theme.textColor }}>
                      {s.name}
                    </div>
                    <div className="text-sm mt-1" style={{ color: theme.mutedTextColor }}>
                      {s.description}
                    </div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap" style={{ color: theme.primaryColor }}>
                    €{s.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {theme.aboutCopy && (
        <section className="px-8 py-14" style={{ background: theme.surfaceColor }}>
          <div className="max-w-3xl">
            <h2
              className="text-2xl md:text-3xl font-bold mb-5"
              style={{ fontFamily: headingFont, color: theme.textColor }}
            >
              Historia
            </h2>
            <p className="text-base leading-relaxed" style={{ color: theme.mutedTextColor }}>
              {theme.aboutCopy}
            </p>
          </div>
        </section>
      )}

      <footer
        className="px-8 py-8 border-t"
        style={{ borderColor: theme.borderColor, background: theme.bgColor }}
      >
        <div className="text-sm" style={{ color: theme.mutedTextColor }}>
          © {new Date().getFullYear()} {businessName || 'LokalWeb'}{city ? ` · ${city}` : ''}
        </div>
      </footer>
    </div>
  );
}
