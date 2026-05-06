'use client';

/**
 * One-question-per-screen wizard. Replaces the previous WizardV2.tsx 5-step
 * grouped flow. Visual design tracks docs/wizard-prototype.html. The data
 * pipeline (brand-brief → generate-variants → apply-theme) is unchanged.
 *
 * Rationale: collecting one answer per screen surfaces the AI prompt's actual
 * scope to the owner. The old grouped form let people skim and skip; the new
 * flow forces an explicit answer, which is what the AI prompts are tuned for.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, publicSiteLabel } from '@/lib/utils';
import type { WizardInput, AiSitePayload } from '@/lib/types/customization';
import type { Business, Service } from '@/lib/types';
import { DynamicSiteRenderer } from '@/components/templates/ai/DynamicSiteRenderer';
import type { ProgressStep, ProgressStatus } from '@/lib/ai-progress';
import { ARCHETYPES, type ArchetypeKey } from '@/lib/archetypes';
import { useDraftAutoSave, useDraftPrompt, clearDraft, type WizardDraftPayload } from './wizard/useWizardDraft';

// =================================================================
// Types & constants
// =================================================================

type Props = {
  businessId: string;
  subdomain: string;
  businessName: string;
  bookingEnabled: boolean;
};

type VisualKey = 'warm' | 'dark' | 'trust' | 'modern' | 'editorial' | 'family';
type ToneKey = 'miqesor' | 'profesional' | 'bisedor' | 'i-fuqishem';
type LangKey = 'sq' | 'en';

// Internal draft shape. At submit time it's projected into a `WizardInput`.
// Keeping the wizard's state in prototype-shaped fields (name/type/city/unique
// /desc) means the localStorage key (lokalweb_wizard_draft_v1) and the
// summary screen render line up 1:1 with the prototype's JS state.
type DraftState = {
  name: string;
  type: string;
  city: string;
  unique: string;
  desc: string;
  services: Array<{ name: string; price: string; duration: string }>;
  language: LangKey | '';
  tone: ToneKey | '';
  visual: VisualKey | '';
  layout: 'ai' | 'custom';
  heroLayout: WizardInput['heroLayout'];
  storyLayout: WizardInput['storyLayout'];
  servicesLayout: WizardInput['servicesLayout'];
  galleryLayout: WizardInput['galleryLayout'];
};

// Mapping from prototype's 6-card visual options to validated archetype keys.
// The other two archetypes (`studioja`, `elegant-rafinuar`) stay valid for the
// server's `'ai'` decider but aren't surfaced as cards.
const VISUAL_TO_ARCHETYPE: Record<VisualKey, ArchetypeKey> = {
  warm: 'i-ngrohte',
  dark: 'erresi-karakter',
  trust: 'besim-qartesi',
  modern: 'gjalleri-moderne',
  editorial: 'leter-stil',
  family: 'familjar-mirprites',
};

const TONE_TO_INPUT: Record<ToneKey, WizardInput['tone']> = {
  miqesor: 'friendly',
  profesional: 'professional',
  bisedor: 'casual',
  'i-fuqishem': 'bold',
};

const SCREEN_LABELS = [
  'Emri',
  'Lloji',
  'Lokacioni',
  'Çfarë e bën ndryshe',
  'Përshkrimi',
  'Shërbimet',
  'Gjuha',
  'Toni',
  'Stili vizual',
  'Layout',
  'Përmbledhje',
] as const;

const TOTAL_SCREENS = SCREEN_LABELS.length; // 11

// Required fields gating the final "Gjenero faqen" submit. Per-screen Vazhdo
// always enables on text screens (prototype-feel). Card screens hard-gate.
const SUBMIT_REQUIRED_FIELDS: Array<keyof DraftState> = [
  'name', 'type', 'city', 'desc', 'language', 'tone', 'visual',
];

// Generation substeps mirror /api/brand-brief + /api/generate-variants events.
const SUBSTEPS: { step: ProgressStep; labelSq: string; labelEn: string }[] = [
  { step: 'analyzing_business', labelSq: 'Po analizojmë biznesin tënd', labelEn: 'Analyzing your business' },
  { step: 'building_brief',     labelSq: 'Po krijojmë strategjinë',     labelEn: 'Building the strategy' },
  { step: 'designing_theme',    labelSq: 'Po dizajnojmë temën',         labelEn: 'Designing the theme' },
  { step: 'writing_copy',       labelSq: 'Po shkruajmë përmbajtjen',    labelEn: 'Writing the content' },
  { step: 'finalizing',         labelSq: 'Po e mbledhim faqen',         labelEn: 'Finalizing the page' },
];

const FALLBACK_ADVANCE_MS = 8000;
const SCREEN_EXIT_MS = 300;
const CARD_AUTOADVANCE_MS = 350;

type Brief = {
  positioning: string;
  definingTraits: string[];
  targetCustomer: string;
  voice: string;
  culturalAnchor: string;
};

type Theme = AiSitePayload;

// Per-section layout pickers reused inside the screen-10 advanced panel. Same
// id/labels as the previous wizard — DynamicSiteRenderer keys off these.
const HERO_LAYOUTS: Array<{ id: WizardInput['heroLayout']; label: string; sub: string }> = [
  { id: 'ai',        label: 'AI vendos',  sub: 'Le AI të zgjedhë' },
  { id: 'fullbleed', label: 'Kinematik', sub: 'Foto e plotë' },
  { id: 'split',     label: 'I ndarë',    sub: 'Foto + tekst' },
  { id: 'centered',  label: 'I qendërsuar', sub: 'Minimalist' },
  { id: 'editorial', label: 'Editorial',  sub: 'Si revistë' },
];
const STORY_LAYOUTS: Array<{ id: WizardInput['storyLayout']; label: string; sub: string }> = [
  { id: 'ai',             label: 'AI vendos',     sub: 'Le AI të zgjedhë' },
  { id: 'centered-quote', label: 'Citim qendror', sub: 'Një frazë e madhe' },
  { id: 'two-column',     label: 'Dy kolona',     sub: 'Foto + tekst' },
  { id: 'long-form',      label: 'Tekst i gjatë', sub: 'Foto sipër' },
  { id: 'pull-quote',     label: 'Citat i nxjerrë', sub: 'Citat + prozë' },
];
const SERVICES_LAYOUTS: Array<{ id: WizardInput['servicesLayout']; label: string; sub: string }> = [
  { id: 'ai',              label: 'AI vendos',       sub: 'Le AI të zgjedhë' },
  { id: 'list',            label: 'Listë',           sub: 'Sparse, type-first' },
  { id: 'grid-3',          label: 'Rrjet 3 kolona',  sub: 'Karta të vogla' },
  { id: 'editorial-rows',  label: 'Rreshta editorial', sub: 'Numrash + prozë' },
  { id: 'cards',           label: 'Karta',           sub: 'Foto + tekst' },
];
const GALLERY_LAYOUTS: Array<{ id: WizardInput['galleryLayout']; label: string; sub: string }> = [
  { id: 'ai',            label: 'AI vendos',        sub: 'Le AI të zgjedhë' },
  { id: 'masonry',       label: 'Masonry',          sub: 'Lartësi të ndryshme' },
  { id: 'grid-uniform',  label: 'Rrjet uniform',    sub: 'Të gjitha të barabarta' },
  { id: 'showcase',      label: 'Vetrina',          sub: 'Një e madhe + miniatura' },
  { id: 'strip',         label: 'Shirit',           sub: 'Horizontal, scroll' },
];

const TYPE_SUGGESTIONS = [
  'Berber', 'Restorant', 'Klinikë dentare', 'Sallon bukurie',
  'Rrobaqepëse', 'Palestër', 'Dyqan',
];

const VISUAL_OPTIONS: Array<{ id: VisualKey; label: string; desc: string; preview: string }> = [
  { id: 'warm',      label: 'I Ngrohtë',        desc: 'Tradicionale, familjare, drurë e krem',
    preview: 'linear-gradient(135deg, #b08858, #5a3a26 50%, #2e1d12)' },
  { id: 'dark',      label: 'Errësi & Karakter', desc: 'Moderne, urbane, kontrast i fortë',
    preview: 'linear-gradient(135deg, #1a1a2e, #0f0f1a 50%, #1e1e35)' },
  { id: 'trust',     label: 'Besim & Qartësi',   desc: 'Profesionale, klinike, blu e qetë',
    preview: 'linear-gradient(135deg, #4f8ef7, #1e3a8a)' },
  { id: 'modern',    label: 'Gjallëri',          desc: 'Energjike, e gjallë, e re',
    preview: 'linear-gradient(135deg, #f97316, #fbbf24 50%, #ec4899)' },
  { id: 'editorial', label: 'Letër & Stil',      desc: 'Si revistë, akademik, klasik',
    preview: 'linear-gradient(135deg, #f4ead4, #d4c4a4 50%, #8a7a52)' },
  { id: 'family',    label: 'Familjar',          desc: 'Mirëpritës, e thjeshtë, e ngrohtë',
    preview: 'linear-gradient(135deg, #fef3c7, #d97706 50%, #92400e)' },
];

const TONE_OPTIONS: Array<{ id: ToneKey; label: string; desc: string }> = [
  { id: 'miqesor',     label: 'Miqësor',     desc: "I ngrohtë, i afërt, si t'i flasësh një shoku" },
  { id: 'profesional', label: 'Profesional', desc: 'Serioz, formal, fokusuar në kompetencë' },
  { id: 'bisedor',     label: 'Bisedor',     desc: "Casual, me regjistër kosovar (tash, n', çka)" },
  { id: 'i-fuqishem',  label: 'I fuqishëm',  desc: 'I drejtpërdrejtë, energjik, pa lulëzime' },
];

// =================================================================
// Helpers
// =================================================================

function defaultDraft(initialName: string): DraftState {
  return {
    name: initialName ?? '',
    type: '',
    city: '',
    unique: '',
    desc: '',
    services: [{ name: '', price: '', duration: '' }],
    language: '',
    tone: '',
    visual: '',
    layout: 'ai',
    heroLayout: 'ai',
    storyLayout: 'ai',
    servicesLayout: 'ai',
    galleryLayout: 'ai',
  };
}

function isDraftState(v: unknown): v is DraftState {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === 'string'
    && typeof o.type === 'string'
    && typeof o.city === 'string'
    && Array.isArray(o.services);
}

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

// Match the chip suggestion's free-text label to the canonical industry id
// the brand-brief prompt expects. Anything unrecognized falls through (the
// server's normalizeGenerationIndustry handles the rest).
function inferIndustryChip(typeText: string): string | undefined {
  const t = typeText.trim().toLowerCase();
  if (!t) return undefined;
  if (t.startsWith('berber')) return 'barbershop';
  if (/restorant|kafene|kafe|piceri/.test(t)) return 'restaurant';
  if (/klinik|dentist|stomatolog|mjek/.test(t)) return 'clinic';
  if (/sallon|kozmet|estetik/.test(t)) return 'beauty_salon';
  if (/palest|fitness|gym/.test(t)) return 'gym';
  if (/rrobaqepe|atelie|terz/.test(t)) return 'rrobaqepese';
  if (/dyqan|boutique|shitore|market/.test(t)) return 'retail';
  if (/auto|servis/.test(t)) return 'auto';
  if (/lavazh/.test(t)) return 'lavazh';
  if (/fotograf|studio/.test(t)) return 'photography';
  if (/kurs|akademi|shkoll/.test(t)) return 'education';
  return undefined;
}

// =================================================================
// Main component
// =================================================================

export default function Wizard({ businessId, subdomain, businessName, bookingEnabled }: Props) {
  const { hasDraft, decided: draftDecided, draft: pendingDraft, restore, discard } = useDraftPrompt();

  const [draft, setDraft] = useState<DraftState>(() => defaultDraft(businessName));
  const [step, setStep] = useState(0); // 0..10 (11 screens)

  // After the user resolves the restore prompt, hydrate from the draft (if
  // restoring) or leave defaults (if discarding). `draftDecided` flips to
  // true in both branches; we only swap state when the user chose "restore".
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (draftDecided && !hydrated) {
      if (pendingDraft && isDraftState(pendingDraft.state)) {
        setDraft(pendingDraft.state);
        setStep(Math.max(0, Math.min(TOTAL_SCREENS - 1, pendingDraft.step)));
      }
      setHydrated(true);
    }
  }, [draftDecided, hydrated, pendingDraft]);

  // Persist after the first interaction post-hydration. Saving before the
  // user has decided about a previous draft would clobber it on mount.
  useDraftAutoSave({ state: draft, step }, hydrated);

  // Phase machine: 'wizard' (screens 0..10) → 'generating' → 'preview' on success.
  // Errors during generation surface inside the generating overlay with retry.
  const [phase, setPhase] = useState<'wizard' | 'generating' | 'preview'>('wizard');

  // Generation pipeline state — same shape as the previous wizard, just
  // surfaced inside the generating overlay UI.
  const [brief, setBrief] = useState<Brief | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ProgressStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ProgressStep>>(new Set());
  const [genError, setGenError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Screen exit animation: when the user advances or goes back, the current
  // screen plays a 300ms exit animation, THEN `step` updates and the next
  // screen plays its enter animation. `transition` holds the pending step.
  const [transition, setTransition] = useState<null | { to: number }>(null);

  const update = useCallback((patch: Partial<DraftState>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((to: number) => {
    if (to < 0 || to >= TOTAL_SCREENS) return;
    if (transition) return; // already animating
    setTransition({ to });
    setTimeout(() => {
      setStep(to);
      setTransition(null);
    }, SCREEN_EXIT_MS);
  }, [transition]);

  const next = useCallback(() => goTo(step + 1), [step, goTo]);
  const back = useCallback(() => goTo(step - 1), [step, goTo]);

  // Per-screen Vazhdo gating. Text screens (0..5) always allow forward;
  // card screens (6..8 = language/tone/visual) require a selection.
  const canAdvance = useMemo(() => {
    if (step === 6) return draft.language !== '';
    if (step === 7) return draft.tone !== '';
    if (step === 8) return draft.visual !== '';
    return true;
  }, [step, draft.language, draft.tone, draft.visual]);

  // Submit-time validation — only enabled on the summary screen. Empty
  // required fields disable the "Gjenero faqen" button and highlight the
  // missing rows in the summary grid.
  const missingFields = useMemo(() => {
    const out: Array<keyof DraftState> = [];
    for (const key of SUBMIT_REQUIRED_FIELDS) {
      const v = draft[key as keyof DraftState];
      if (typeof v === 'string' && v.trim() === '') out.push(key);
    }
    return out;
  }, [draft]);

  // Keyboard: Enter advances (text screens), Esc goes back. Textarea Enter
  // inserts a newline (per the prototype's `e.target.tagName !== 'TEXTAREA'`
  // check). We only intercept when the focus isn't on a textarea.
  useEffect(() => {
    if (phase !== 'wizard') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextarea = target && target.tagName === 'TEXTAREA';
      if (e.key === 'Enter' && !e.shiftKey && !isTextarea) {
        // On the summary screen Enter doesn't advance — the user must click
        // Generate explicitly so they can't accidentally submit.
        if (step === TOTAL_SCREENS - 1) return;
        if (canAdvance) { e.preventDefault(); next(); }
      } else if (e.key === 'Escape') {
        if (step > 0) { e.preventDefault(); back(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step, canAdvance, next, back]);

  // ----------------- Realtime progress (preserved from old wizard) -----------------
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceFallback = useCallback((currentStep: ProgressStep | null) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (!currentStep) return;
    fallbackTimerRef.current = setTimeout(() => {
      const idx = SUBSTEPS.findIndex(s => s.step === currentStep);
      if (idx < 0 || idx >= SUBSTEPS.length - 1) return;
      const nextStep = SUBSTEPS[idx + 1].step;
      setCompletedSteps(prev => {
        const out = new Set(prev);
        out.add(currentStep);
        return out;
      });
      setActiveStep(nextStep);
      advanceFallback(nextStep);
    }, FALLBACK_ADVANCE_MS);
  }, []);

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
  }, [generationId, advanceFallback]);

  // ----------------- Project draft → API payload -----------------
  // The wizard's lean DraftState becomes a full WizardInput at submit time.
  // Defaults flow from props (bookingEnabled → bookingMethod) and from the
  // visual→archetype mapping so all three downstream APIs see the same
  // contract the old wizard produced.
  const projectInput = useCallback((): WizardInput & { businessNameOverride: string } => {
    const archetypeKey = draft.visual ? VISUAL_TO_ARCHETYPE[draft.visual] : 'ai';
    return {
      industry: draft.type.trim(),
      industryChip: inferIndustryChip(draft.type),
      city: draft.city.trim(),
      uniqueness: draft.unique.trim() || undefined,
      businessDescription: draft.desc.trim(),
      services: draft.services
        .filter(s => s.name.trim())
        .map(s => ({
          name: s.name.trim(),
          price: s.price.trim() || undefined,
          durationMinutes: s.duration.trim() ? Number(s.duration.trim()) : undefined,
        }))
        .map(s => ({
          ...s,
          durationMinutes: Number.isFinite(s.durationMinutes) ? s.durationMinutes : undefined,
        })),
      bookingMethod: bookingEnabled ? 'appointments' : 'none',
      heroLayout:     draft.layout === 'custom' ? draft.heroLayout : 'ai',
      storyLayout:    draft.layout === 'custom' ? draft.storyLayout : 'ai',
      servicesLayout: draft.layout === 'custom' ? draft.servicesLayout : 'ai',
      galleryLayout:  draft.layout === 'custom' ? draft.galleryLayout : 'ai',
      archetypeKey,
      brandPrimary: undefined,
      brandAccent: undefined,
      customFont: undefined,
      language: draft.language || 'sq',
      tone: draft.tone ? TONE_TO_INPUT[draft.tone] : 'friendly',
      // Phone + socials are no longer collected in the wizard — owners set
      // them on /dashboard/profile. Sending undefined keeps apply-theme's
      // existing "skip if empty" merge behavior.
      instagramUrl: undefined,
      tiktokUrl: undefined,
      phoneNumber: undefined,
      // Not part of WizardInput — used only by submit handler to update the
      // businesses.name row when the user edited screen 1.
      businessNameOverride: draft.name.trim() || businessName,
    };
  }, [draft, bookingEnabled, businessName]);

  const runGeneration = useCallback(async (opts: { reuseBrief?: Brief } = {}) => {
    setPhase('generating');
    setGenError(null);

    const newGenId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (opts.reuseBrief) {
      setCompletedSteps(new Set<ProgressStep>(['analyzing_business', 'building_brief']));
      setActiveStep('designing_theme');
    } else {
      setCompletedSteps(new Set());
      setActiveStep('analyzing_business');
    }
    advanceFallback(opts.reuseBrief ? 'designing_theme' : 'analyzing_business');
    setGenerationId(newGenId);

    let currentBrief: Brief | null = opts.reuseBrief ?? null;
    const projected = projectInput();

    try {
      if (!currentBrief) {
        const briefRes = await fetch('/api/brand-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: projected.businessNameOverride,
            industry: projected.industry,
            industryChip: projected.industryChip,
            city: projected.city,
            uniqueness: projected.uniqueness,
            businessDescription: projected.businessDescription,
            services: projected.services.map(s => ({
              name: s.name,
              price: s.price,
              durationMinutes: s.durationMinutes,
            })),
            bookingMethod: projected.bookingMethod,
            language: projected.language,
            tone: projected.tone,
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
          businessName: projected.businessNameOverride,
          industry: projected.industry,
          city: projected.city,
          uniqueness: projected.uniqueness,
          businessDescription: projected.businessDescription,
          heroLayout: projected.heroLayout,
          storyLayout: projected.storyLayout,
          servicesLayout: projected.servicesLayout,
          galleryLayout: projected.galleryLayout,
          archetypeKey: projected.archetypeKey,
          brandPrimary: projected.brandPrimary,
          brandAccent: projected.brandAccent,
          customFont: projected.customFont,
          bookingMethod: projected.bookingMethod,
          language: projected.language,
          tone: projected.tone,
          userProvidedServices: projected.services
            .map(s => {
              const parts = [s.name];
              if (s.price && String(s.price).trim()) parts.push(`€${String(s.price).trim()}`);
              if (s.durationMinutes !== undefined) parts.push(`${s.durationMinutes}min`);
              return parts.join(' / ');
            })
            .join('\n'),
          wizardServices: projected.services.map(s => ({
            name: s.name,
            price: s.price,
            durationMinutes: s.durationMinutes,
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
      setCompletedSteps(new Set<ProgressStep>([
        'analyzing_business', 'building_brief', 'designing_theme', 'writing_copy', 'finalizing',
      ]));
      setActiveStep(null);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      setPhase('preview');
    } catch (e: any) {
      setGenError(e?.message || 'Gjenerimi dështoi');
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    }
  }, [advanceFallback, businessId, projectInput]);

  const handleApply = useCallback(async () => {
    if (!theme) return;
    setApplying(true);
    setApplyError(null);
    try {
      const projected = projectInput();
      const res = await fetch('/api/apply-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          theme,
          siteLanguage: projected.language,
          siteTone: projected.tone,
          uniquenessStatement: projected.uniqueness,
          bookingMethod: projected.bookingMethod,
          wizardServices: projected.services.map(s => ({
            name: s.name,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
          // Persist edited business name (screen 1) back to the businesses row.
          // Empty / unchanged values are filtered server-side.
          businessName: projected.businessNameOverride,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Aplikimi dështoi');
      // Successful submit clears the saved draft so a fresh visit starts clean.
      clearDraft();
      window.location.href = '/dashboard';
    } catch (e: any) {
      setApplyError(e?.message || 'Aplikimi dështoi');
      setApplying(false);
    }
  }, [theme, businessId, projectInput]);

  // Edit-from-summary: jumping back from the summary preserves all answers
  // because state is the source of truth; only `step` changes.
  const editScreen = useCallback((screenIdx: number) => goTo(screenIdx), [goTo]);

  // Restart confirms then resets to defaults at screen 0.
  const handleRestart = useCallback(() => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('A je i sigurt që do të rifillosh? Të dhënat do të humbasin.');
      if (!ok) return;
    }
    clearDraft();
    setDraft(defaultDraft(businessName));
    setStep(0);
  }, [businessName]);

  // ----------------- Render -----------------
  const progressPct = Math.round(((step + 1) / TOTAL_SCREENS) * 100);

  // Restore prompt blocks render until the user picks "Po, vazhdo" or "Jo, fillo nga e para".
  const showRestorePrompt = hasDraft && !draftDecided;

  return (
    <div className="lokalweb-wizard">
      <WizardStyles />

      {showRestorePrompt && (
        <DraftRestoreModal onRestore={restore} onDiscard={discard} />
      )}

      {phase === 'wizard' && (
        <Topbar
          step={step}
          progressPct={progressPct}
          onBack={back}
          backDisabled={step === 0 || !!transition}
        />
      )}

      <main className="wz-stage">
        {phase === 'wizard' && (
          <ScreenSwitch
            step={step}
            transition={transition}
            draft={draft}
            update={update}
            next={next}
            canAdvance={canAdvance}
            missingFields={missingFields}
            onSubmit={() => runGeneration()}
            onEditScreen={editScreen}
            onRestart={handleRestart}
            businessName={businessName}
          />
        )}

        {phase === 'generating' && (
          <GeneratingOverlay
            activeStep={activeStep}
            completedSteps={completedSteps}
            language={draft.language || 'sq'}
            error={genError}
            onRetry={() => runGeneration()}
          />
        )}

        {phase === 'preview' && theme && (
          <PreviewScreen
            theme={theme}
            subdomain={subdomain}
            businessName={draft.name.trim() || businessName}
            city={draft.city}
            applying={applying}
            applyError={applyError}
            onRegenerate={() => runGeneration({ reuseBrief: brief ?? undefined })}
            onApply={handleApply}
          />
        )}
      </main>
    </div>
  );
}

// =================================================================
// Top bar — logo, progress, back
// =================================================================

function Topbar({ step, progressPct, onBack, backDisabled }: {
  step: number;
  progressPct: number;
  onBack: () => void;
  backDisabled: boolean;
}) {
  return (
    <header className="wz-topbar">
      <div className="wz-logo">LokalWeb</div>
      <div className="wz-progress-area">
        <div className="wz-progress-meta">
          <span>Pyetja {step + 1} nga {TOTAL_SCREENS}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="wz-progress-track">
          <div className="wz-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <button
        type="button"
        className="wz-topbar-back"
        onClick={onBack}
        disabled={backDisabled}
        aria-label="Kthehu mbrapa"
      >
        ←
      </button>
    </header>
  );
}

// =================================================================
// Screen switch — renders the active screen with enter/exit animations
// =================================================================

function ScreenSwitch(props: {
  step: number;
  transition: { to: number } | null;
  draft: DraftState;
  update: (p: Partial<DraftState>) => void;
  next: () => void;
  canAdvance: boolean;
  missingFields: Array<keyof DraftState>;
  onSubmit: () => void;
  onEditScreen: (s: number) => void;
  onRestart: () => void;
  businessName: string;
}) {
  const { step, transition, draft, update, next, canAdvance, missingFields, onSubmit, onEditScreen, onRestart, businessName } = props;
  const exiting = !!transition;
  // `key={step}` on the inner wrapper forces a re-mount on step change so
  // the entry animation re-fires (same pattern the prototype uses).
  return (
    <div className={cn('wz-screen-host', exiting && 'wz-exiting')}>
      <div className="wz-screen" key={step}>
        {step === 0 && <ScreenName draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 1 && <ScreenType draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 2 && <ScreenCity draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 3 && <ScreenUnique draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 4 && <ScreenDesc draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 5 && <ScreenServices draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 6 && <ScreenLanguage draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 7 && <ScreenTone draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 8 && <ScreenVisual draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 9 && <ScreenLayout draft={draft} update={update} next={next} canAdvance={canAdvance} />}
        {step === 10 && (
          <ScreenSummary
            draft={draft}
            missingFields={missingFields}
            onEditScreen={onEditScreen}
            onSubmit={onSubmit}
            onRestart={onRestart}
            businessName={businessName}
          />
        )}
      </div>
    </div>
  );
}

// =================================================================
// Reusable screen pieces
// =================================================================

function StepTag({ n, label }: { n: number; label: string }) {
  return (
    <div className="wz-step-tag">
      {label ?? `Hapi ${n}`}
    </div>
  );
}

function Question({ children }: { children: React.ReactNode }) {
  return <h1 className="wz-question">{children}</h1>;
}

function QuestionSub({ children }: { children: React.ReactNode }) {
  return <p className="wz-question-sub">{children}</p>;
}

function ContinueButton({ onClick, disabled, label = 'Vazhdo' }: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button type="button" className="wz-btn wz-btn-primary" onClick={onClick} disabled={disabled}>
      <span>{label}</span> →
    </button>
  );
}

function KeyboardHint({ keyName = 'Enter', text = 'për të vazhduar' }: { keyName?: string; text?: string }) {
  return (
    <div className="wz-keyboard-hint">
      Shtyp <span className="wz-kbd">{keyName}</span> {text}
    </div>
  );
}

type ScreenProps = {
  draft: DraftState;
  update: (p: Partial<DraftState>) => void;
  next: () => void;
  canAdvance: boolean;
};

// ----------------- Screen 1: Business name -----------------

function ScreenName({ draft, update, next, canAdvance }: ScreenProps) {
  const inputRef = useAutoFocus<HTMLInputElement>();
  return (
    <>
      <StepTag n={1} label="Hapi 1" />
      <Question>Si <em>quhet</em> biznesi yt?</Question>
      <QuestionSub>Ky është emri që klientët do ta shohin në krye të faqes. Mund ta ndryshosh më vonë.</QuestionSub>
      <div className="wz-input-area">
        <input
          ref={inputRef}
          type="text"
          className="wz-text-input"
          placeholder="P.sh. Berberhana e Adem-it"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
        <KeyboardHint />
      </div>
    </>
  );
}

// ----------------- Screen 2: Business type -----------------

function ScreenType({ draft, update, next, canAdvance }: ScreenProps) {
  const inputRef = useAutoFocus<HTMLInputElement>();
  return (
    <>
      <StepTag n={2} label="Hapi 2" />
      <Question>Çfarë <em>lloji</em> biznesi keni?</Question>
      <QuestionSub>Përshkruaje me fjalët e tua. Sistemi e kupton.</QuestionSub>
      <div className="wz-input-area">
        <input
          ref={inputRef}
          type="text"
          className="wz-text-input"
          placeholder="P.sh. berber, restorant, klinikë dentare..."
          value={draft.type}
          onChange={(e) => update({ type: e.target.value })}
          autoComplete="off"
        />
        <div className="wz-suggestions">
          {TYPE_SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              className="wz-suggestion"
              onClick={() => {
                update({ type: s });
                inputRef.current?.focus();
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 3: City -----------------

function ScreenCity({ draft, update, next, canAdvance }: ScreenProps) {
  const inputRef = useAutoFocus<HTMLInputElement>();
  return (
    <>
      <StepTag n={3} label="Hapi 3" />
      <Question>Ku <em>ndodhet</em> biznesi?</Question>
      <QuestionSub>Qyteti dhe lagjja, nëse e di. Kjo ndihmon klientët të të gjejnë.</QuestionSub>
      <div className="wz-input-area">
        <input
          ref={inputRef}
          type="text"
          className="wz-text-input"
          placeholder="P.sh. Prishtinë, te Shadërvani"
          value={draft.city}
          onChange={(e) => update({ city: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 4: Uniqueness -----------------

function ScreenUnique({ draft, update, next, canAdvance }: ScreenProps) {
  const ref = useAutoFocus<HTMLTextAreaElement>();
  const wc = countWords(draft.unique);
  return (
    <>
      <StepTag n={4} label="Hapi 4" />
      <Question>Çfarë e bën <em>ndryshe</em> biznesin tënd?</Question>
      <QuestionSub>
        Mendoje këtë: pse klientët vijnë te ti dhe jo te dikush tjetër? Shkruaj me fjalët e tua.
      </QuestionSub>
      <div className="wz-input-area">
        <textarea
          ref={ref}
          className="wz-text-input"
          placeholder="P.sh. Punoj vetëm me termin, jo me walk-in. Çdo qethje 30 minuta — pa ngut. Klientët më shkruajnë në WhatsApp natën, e gjej termin për të nesërmen."
          value={draft.unique}
          onChange={(e) => update({ unique: e.target.value })}
        />
        <div className="wz-input-helper">
          <span>Sa më shumë detaje, aq më e mirë faqja</span>
          <span className={cn('wz-word-count', wc >= 15 ? 'wz-good' : 'wz-weak')}>
            {wc} {wc === 1 ? 'fjalë' : 'fjalë'}
          </span>
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 5: Description -----------------

function ScreenDesc({ draft, update, next, canAdvance }: ScreenProps) {
  const ref = useAutoFocus<HTMLTextAreaElement>();
  const wc = countWords(draft.desc);
  return (
    <>
      <StepTag n={5} label="Hapi 5" />
      <Question>Përshkruaje <em>shkurt</em> biznesin.</Question>
      <QuestionSub>2–4 fjali që tregojnë çfarë bën, kush vjen tek ti, dhe si punon.</QuestionSub>
      <div className="wz-input-area">
        <textarea
          ref={ref}
          className="wz-text-input"
          placeholder="P.sh. Berber n'lagjen Lakrishte. Jam vetëm unë — pa staf, pa pritje. Klientët më njohin me emër. Punoj me termin që ta kesh kohën që meriton, jo me ngut."
          value={draft.desc}
          onChange={(e) => update({ desc: e.target.value })}
        />
        <div className="wz-input-helper">
          <span>2–4 fjali është mirë</span>
          <span className={cn('wz-word-count', wc >= 15 ? 'wz-good' : 'wz-weak')}>
            {wc} {wc === 1 ? 'fjalë' : 'fjalë'}
          </span>
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 6: Services -----------------

function ScreenServices({ draft, update, next, canAdvance }: ScreenProps) {
  const updateRow = (idx: number, patch: Partial<DraftState['services'][number]>) => {
    const services = draft.services.map((s, i) => i === idx ? { ...s, ...patch } : s);
    update({ services });
  };
  const addRow = () => {
    if (draft.services.length >= 8) return;
    update({ services: [...draft.services, { name: '', price: '', duration: '' }] });
  };
  const removeRow = (idx: number) => {
    if (draft.services.length <= 1) return;
    update({ services: draft.services.filter((_, i) => i !== idx) });
  };
  return (
    <>
      <StepTag n={6} label="Hapi 6" />
      <Question>Cilat <em>shërbime</em> ofron?</Question>
      <QuestionSub>
        Shto secilin shërbim që ofron, me çmimin dhe kohëzgjatjen mesatare. Mund t'i editosh më vonë.
      </QuestionSub>
      <div className="wz-input-area">
        <div className="wz-services-list">
          {draft.services.map((svc, idx) => (
            <div className="wz-service-row" key={idx}>
              <input
                type="text"
                className="wz-text-input"
                placeholder="Emri i shërbimit"
                value={svc.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
              />
              <input
                type="text"
                className="wz-text-input"
                placeholder="€"
                value={svc.price}
                onChange={(e) => updateRow(idx, { price: e.target.value })}
              />
              <input
                type="text"
                className="wz-text-input"
                inputMode="numeric"
                placeholder="min"
                value={svc.duration}
                onChange={(e) => updateRow(idx, { duration: e.target.value })}
              />
              <button
                type="button"
                className="wz-remove-btn"
                onClick={() => removeRow(idx)}
                disabled={draft.services.length <= 1}
                aria-label="Hiq këtë shërbim"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="wz-add-service-btn"
          onClick={addRow}
          disabled={draft.services.length >= 8}
        >
          + Shto një shërbim
        </button>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 7: Language -----------------

function ScreenLanguage({ draft, update, next, canAdvance }: ScreenProps) {
  const pick = (v: LangKey) => {
    update({ language: v });
    setTimeout(() => next(), CARD_AUTOADVANCE_MS);
  };
  return (
    <>
      <StepTag n={7} label="Hapi 7" />
      <Question>Në cilën <em>gjuhë</em> do të jetë faqja?</Question>
      <QuestionSub>Mund të zgjedhësh vetëm një tani. Shtimi i gjuhëve të tjera vjen në të ardhmen.</QuestionSub>
      <div className="wz-input-area">
        <div className="wz-card-grid">
          <CardOption
            selected={draft.language === 'sq'}
            onClick={() => pick('sq')}
            label="Shqip"
            desc="Albanian — për tregun kosovar dhe shqiptar"
          />
          <CardOption
            selected={draft.language === 'en'}
            onClick={() => pick('en')}
            label="English"
            desc="Për turistë ose klientë ndërkombëtarë"
          />
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 8: Tone -----------------

function ScreenTone({ draft, update, next, canAdvance }: ScreenProps) {
  const pick = (v: ToneKey) => {
    update({ tone: v });
    setTimeout(() => next(), CARD_AUTOADVANCE_MS);
  };
  return (
    <>
      <StepTag n={8} label="Hapi 8" />
      <Question>Si do të <em>flasë</em> faqja jote?</Question>
      <QuestionSub>Toni i komunikimit. Zgjidh atë që të përshtatet biznesit tënd më shumë.</QuestionSub>
      <div className="wz-input-area">
        <div className="wz-card-grid">
          {TONE_OPTIONS.map(t => (
            <CardOption
              key={t.id}
              selected={draft.tone === t.id}
              onClick={() => pick(t.id)}
              label={t.label}
              desc={t.desc}
            />
          ))}
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 9: Visual style -----------------

function ScreenVisual({ draft, update, next, canAdvance }: ScreenProps) {
  const pick = (v: VisualKey) => {
    update({ visual: v });
    setTimeout(() => next(), CARD_AUTOADVANCE_MS);
  };
  return (
    <>
      <StepTag n={9} label="Hapi 9" />
      <Question>Cili <em>stil vizual</em> të pëlqen?</Question>
      <QuestionSub>Paleta e ngjyrave dhe ndjesia e përgjithshme e faqes.</QuestionSub>
      <div className="wz-input-area">
        <div className="wz-card-grid wz-three-col">
          {VISUAL_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={cn('wz-option-card wz-with-preview', draft.visual === opt.id && 'wz-selected')}
              onClick={() => pick(opt.id)}
            >
              <div className="wz-preview" style={{ background: opt.preview }} />
              <div className="wz-card-label">{opt.label}</div>
              <div className="wz-card-desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

// ----------------- Screen 10: Layout -----------------

function ScreenLayout({ draft, update, next, canAdvance }: ScreenProps) {
  const [advancedOpen, setAdvancedOpen] = useState(draft.layout === 'custom');

  const setLayout = (mode: 'ai' | 'custom') => update({ layout: mode });

  return (
    <>
      <StepTag n={10} label="Hapi 10" />
      <Question><em>Layout</em> — si do organizohet faqja?</Question>
      <QuestionSub>Më e thjeshta është të lësh AI-n të vendosë. Por mund të zgjedhësh vetë nëse do.</QuestionSub>

      <div className="wz-input-area">
        <button
          type="button"
          className={cn('wz-layout-default-card', draft.layout === 'ai' && 'wz-selected')}
          onClick={() => setLayout('ai')}
        >
          <div className="wz-layout-default-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="wz-layout-default-title">AI do të vendosë layout-in më të mirë</div>
          <div className="wz-layout-default-desc">
            Bazuar në llojin e biznesit tënd, përmbajtjen, dhe stilin vizual që zgjodhe. Rekomanduar për shumicën.
          </div>
        </button>

        <button
          type="button"
          className={cn('wz-advanced-toggle', advancedOpen && 'wz-open')}
          onClick={() => {
            setAdvancedOpen(o => !o);
            if (!advancedOpen) setLayout('custom');
          }}
        >
          <span>Po preferoj të zgjedh vetë (e avancuar)</span>
          <span className="wz-chevron">›</span>
        </button>

        {advancedOpen && (
          <div className="wz-advanced-panel">
            <p className="wz-advanced-hint">
              Zgjedh layout-in për secilin seksion. Lërë &quot;AI vendos&quot; për ato që nuk i ke ide të fortë.
            </p>
            <LayoutPicker
              title="Hero"
              options={HERO_LAYOUTS}
              selected={draft.heroLayout}
              onPick={(v) => update({ heroLayout: v as WizardInput['heroLayout'] })}
            />
            <LayoutPicker
              title="Historia"
              options={STORY_LAYOUTS}
              selected={draft.storyLayout}
              onPick={(v) => update({ storyLayout: v as WizardInput['storyLayout'] })}
            />
            <LayoutPicker
              title="Shërbimet"
              options={SERVICES_LAYOUTS}
              selected={draft.servicesLayout}
              onPick={(v) => update({ servicesLayout: v as WizardInput['servicesLayout'] })}
            />
            <LayoutPicker
              title="Galeria"
              options={GALLERY_LAYOUTS}
              selected={draft.galleryLayout}
              onPick={(v) => update({ galleryLayout: v as WizardInput['galleryLayout'] })}
            />
          </div>
        )}
      </div>

      <div className="wz-actions">
        <ContinueButton onClick={next} disabled={!canAdvance} />
      </div>
    </>
  );
}

function LayoutPicker({ title, options, selected, onPick }: {
  title: string;
  options: Array<{ id: string; label: string; sub: string }>;
  selected: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="wz-layout-picker">
      <div className="wz-layout-picker-title">{title}</div>
      <div className="wz-layout-picker-row">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            className={cn('wz-layout-pill', selected === o.id && 'wz-selected')}
            onClick={() => onPick(o.id)}
          >
            <span className="wz-layout-pill-label">{o.label}</span>
            <span className="wz-layout-pill-sub">{o.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------- Screen 11: Summary -----------------

function ScreenSummary({ draft, missingFields, onEditScreen, onSubmit, onRestart, businessName }: {
  draft: DraftState;
  missingFields: Array<keyof DraftState>;
  onEditScreen: (s: number) => void;
  onSubmit: () => void;
  onRestart: () => void;
  businessName: string;
}) {
  const visualLabel = draft.visual ? VISUAL_OPTIONS.find(o => o.id === draft.visual)?.label ?? '' : '';
  const toneLabel = draft.tone ? TONE_OPTIONS.find(o => o.id === draft.tone)?.label ?? '' : '';
  const langLabel = draft.language === 'sq' ? 'Shqip' : draft.language === 'en' ? 'English' : '';
  const servicesLabel = draft.services
    .filter(s => s.name.trim())
    .map(s => {
      const parts = [s.name.trim()];
      if (s.price.trim()) parts.push(`${s.price.trim()}€`);
      if (s.duration.trim()) parts.push(`${s.duration.trim()} min`);
      return parts.join(' — ');
    })
    .join('\n');

  type Row = { label: string; value: string; screen: number; key: keyof DraftState };
  const rows: Row[] = [
    { label: 'Emri',                  value: draft.name || (businessName || ''), screen: 0, key: 'name' },
    { label: 'Lloji',                 value: draft.type, screen: 1, key: 'type' },
    { label: 'Lokacioni',             value: draft.city, screen: 2, key: 'city' },
    { label: 'Çfarë e bën ndryshe',   value: draft.unique, screen: 3, key: 'unique' },
    { label: 'Përshkrimi',            value: draft.desc, screen: 4, key: 'desc' },
    { label: 'Shërbimet',             value: servicesLabel, screen: 5, key: 'services' },
    { label: 'Gjuha',                 value: langLabel, screen: 6, key: 'language' },
    { label: 'Toni',                  value: toneLabel, screen: 7, key: 'tone' },
    { label: 'Stili vizual',          value: visualLabel, screen: 8, key: 'visual' },
    { label: 'Layout',                value: draft.layout === 'ai' ? 'AI do të vendosë' : 'I personalizuar', screen: 9, key: 'layout' },
  ];

  const missingSet = new Set(missingFields as string[]);
  const cantSubmit = missingFields.length > 0;

  return (
    <>
      <StepTag n={11} label="Përmbledhje" />
      <Question>Le ta <em>kontrollojmë</em> së bashku.</Question>
      <QuestionSub>
        Para se të gjenerojmë faqen, sigurohu që gjithçka është siç duhet. Mund t'i editosh të gjitha.
      </QuestionSub>

      <div className="wz-summary-grid">
        {rows.map(r => {
          const isMissing = missingSet.has(r.key as string);
          const empty = !r.value;
          return (
            <button
              key={r.key as string}
              type="button"
              className="wz-summary-row"
              onClick={() => onEditScreen(r.screen)}
              data-missing={isMissing ? 'true' : 'false'}
            >
              <div className="wz-summary-label">{r.label}</div>
              <div className={cn('wz-summary-value', empty && 'wz-empty', isMissing && 'wz-missing')}>
                {r.value
                  ? r.value.split('\n').map((line, i) => <div key={i}>{line}</div>)
                  : (isMissing ? '— mungon —' : '— pa përgjigje —')}
              </div>
              <span className="wz-edit-btn" aria-label="Edito">✎</span>
            </button>
          );
        })}
      </div>

      {cantSubmit && (
        <p className="wz-submit-error">
          Plotëso fushat me &ldquo;mungon&rdquo; para se të gjenerosh faqen.
        </p>
      )}

      <div className="wz-actions">
        <button
          type="button"
          className="wz-btn wz-btn-primary"
          onClick={onSubmit}
          disabled={cantSubmit}
        >
          <span>✨ Gjenero faqen</span>
        </button>
        <button type="button" className="wz-btn wz-btn-ghost" onClick={onRestart}>
          Fillo nga e para
        </button>
      </div>
    </>
  );
}

// =================================================================
// Card option (used by language/tone)
// =================================================================

function CardOption({ selected, onClick, label, desc }: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      className={cn('wz-option-card', selected && 'wz-selected')}
      onClick={onClick}
    >
      <div className="wz-card-label">{label}</div>
      <div className="wz-card-desc">{desc}</div>
    </button>
  );
}

// =================================================================
// Restore prompt
// =================================================================

function DraftRestoreModal({ onRestore, onDiscard }: { onRestore: () => void; onDiscard: () => void }) {
  return (
    <div className="wz-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="wz-modal-title">
      <div className="wz-modal">
        <div className="wz-modal-icon" aria-hidden="true">↩</div>
        <h2 id="wz-modal-title" className="wz-modal-title">
          Kemi gjetur një draft të mëparshëm.
        </h2>
        <p className="wz-modal-body">
          A doni të vazhdoni nga aty u ndalët?
        </p>
        <div className="wz-modal-actions">
          <button type="button" className="wz-btn wz-btn-primary" onClick={onRestore}>
            <span>Po, vazhdo</span>
          </button>
          <button type="button" className="wz-btn wz-btn-ghost" onClick={onDiscard}>
            Jo, fillo nga e para
          </button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Generating overlay (preserves the realtime + 5-substep UX)
// =================================================================

function GeneratingOverlay({ activeStep, completedSteps, language, error, onRetry }: {
  activeStep: ProgressStep | null;
  completedSteps: Set<ProgressStep>;
  language: WizardInput['language'];
  error: string | null;
  onRetry: () => void;
}) {
  const labelOf = (s: { labelSq: string; labelEn: string }) =>
    language === 'en' ? s.labelEn : s.labelSq;
  const activeLabel = activeStep
    ? labelOf(SUBSTEPS.find(s => s.step === activeStep) ?? SUBSTEPS[0])
    : labelOf(SUBSTEPS[0]);
  const buildingHeading = language === 'en' ? 'Building your website…' : 'Po e ndërtojmë faqen tënde…';
  const errorHeading = language === 'en' ? 'Something went wrong' : 'Ndodhi një gabim';
  const retryLabel = language === 'en' ? 'Try again' : 'Provo përsëri';
  return (
    <div className="wz-generating-overlay">
      {error ? (
        <>
          <div className="wz-gen-title" style={{ fontSize: 28 }}>{errorHeading}</div>
          <div className="wz-gen-step">{error}</div>
          <button type="button" className="wz-btn wz-btn-primary" onClick={onRetry}>
            <span>{retryLabel}</span>
          </button>
        </>
      ) : (
        <>
          <div className="wz-gen-spinner" />
          <div>
            <div className="wz-gen-title">{buildingHeading}</div>
            <div className="wz-gen-step">{activeLabel}…</div>
          </div>
          <ul className="wz-gen-list">
            {SUBSTEPS.map(s => {
              const isDone = completedSteps.has(s.step);
              const isActive = activeStep === s.step && !isDone;
              return (
                <li key={s.step} className="wz-gen-item">
                  <span className={cn('wz-gen-dot', isDone && 'wz-done', isActive && 'wz-active')} />
                  <span className={cn('wz-gen-label', isDone && 'wz-done', isActive && 'wz-active')}>
                    {labelOf(s)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// =================================================================
// Preview screen — sits between generation success and apply
// =================================================================

function PreviewScreen({ theme, subdomain, businessName, city, applying, applyError, onRegenerate, onApply }: {
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
    <div className="wz-preview-host">
      <div className="wz-preview-header">
        <h1 className="wz-preview-title">Faqja jote është gati</h1>
        <div className="wz-preview-actions">
          <button
            type="button"
            className="wz-btn wz-btn-ghost"
            onClick={onRegenerate}
            disabled={applying}
          >
            ↻ Rigjenero
          </button>
          <button
            type="button"
            className="wz-btn wz-btn-primary"
            onClick={onApply}
            disabled={applying}
          >
            {applying && <span className="wz-applying-spinner" aria-hidden="true" />}
            <span>Përdor këtë →</span>
          </button>
        </div>
      </div>

      {applyError && <div className="wz-preview-error">{applyError}</div>}

      <div className="wz-preview-frame">
        <div className="wz-preview-urlbar">
          <span className="wz-preview-dot" />
          <span className="wz-preview-dot" />
          <span className="wz-preview-dot" />
          <div className="wz-preview-url">{publicSiteLabel(subdomain)}</div>
        </div>
        <div className="wz-preview-viewport">
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
  );
}

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

// =================================================================
// Hooks
// =================================================================

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    // Delay matches the prototype's screenEnter animation tail so the focus
    // ring doesn't fight the transform settling.
    const t = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);
  return ref;
}

// =================================================================
// Inline styles — wizard-scoped, mirrors docs/wizard-prototype.html
// =================================================================

function WizardStyles() {
  // Scoped under .lokalweb-wizard so wizard tokens never leak into the rest of
  // the dashboard (which uses shadcn's --background/--foreground tokens).
  return (
    <style jsx global>{`
      .lokalweb-wizard {
        --lw-blue: #4f8ef7;
        --lw-violet: #8b5cf6;
        --lw-gradient: linear-gradient(135deg, #4f8ef7, #8b5cf6);

        --lw-bg: #0a0a0f;
        --lw-bg-2: #0f0f1a;
        --lw-bg-3: #151522;
        --lw-surface: #151522;
        --lw-surface-2: #1e1e35;

        --lw-border: rgba(120, 120, 255, 0.12);
        --lw-border-2: rgba(120, 120, 255, 0.22);
        --lw-border-strong: rgba(120, 120, 255, 0.35);

        --lw-blue-tint: rgba(79, 142, 247, 0.15);
        --lw-violet-tint: rgba(139, 92, 246, 0.15);

        --lw-text: #e8e8f0;
        --lw-muted: #8888aa;
        --lw-muted-2: #5a5a7a;

        --lw-success-text: #4ade80;

        --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

        position: fixed;
        inset: 0;
        background: var(--lw-bg);
        color: var(--lw-text);
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        overflow-x: hidden;
        overflow-y: auto;
        z-index: 50;
        -webkit-font-smoothing: antialiased;
      }

      .lokalweb-wizard::before {
        content: '';
        position: fixed;
        inset: 0;
        background-image:
          radial-gradient(ellipse 600px 400px at 20% 10%, rgba(79, 142, 247, 0.08), transparent 60%),
          radial-gradient(ellipse 500px 600px at 90% 80%, rgba(139, 92, 246, 0.06), transparent 60%);
        pointer-events: none;
        z-index: 0;
      }

      .lokalweb-wizard::after {
        content: '';
        position: fixed;
        inset: 0;
        background-image: radial-gradient(rgba(120, 120, 255, 0.06) 1px, transparent 1px);
        background-size: 32px 32px;
        pointer-events: none;
        z-index: 0;
        mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
      }

      /* Topbar */
      .lokalweb-wizard .wz-topbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(10, 10, 15, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--lw-border);
        padding: 18px 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }
      .lokalweb-wizard .wz-logo {
        font-family: 'Instrument Serif', serif;
        font-size: 24px;
        font-weight: 400;
        font-style: italic;
        background: var(--lw-gradient);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.02em;
      }
      .lokalweb-wizard .wz-progress-area {
        flex: 1;
        max-width: 480px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .lokalweb-wizard .wz-progress-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 500;
        color: var(--lw-muted-2);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-family: 'DM Mono', monospace;
      }
      .lokalweb-wizard .wz-progress-meta span:last-child { color: var(--lw-muted); }
      .lokalweb-wizard .wz-progress-track {
        height: 3px;
        background: var(--lw-surface-2);
        border-radius: 999px;
        overflow: hidden;
        position: relative;
      }
      .lokalweb-wizard .wz-progress-fill {
        height: 100%;
        background: var(--lw-gradient);
        border-radius: 999px;
        transition: width 0.6s var(--ease-out);
        position: relative;
      }
      .lokalweb-wizard .wz-progress-fill::after {
        content: '';
        position: absolute;
        right: 0;
        top: 50%;
        transform: translate(50%, -50%);
        width: 8px; height: 8px;
        border-radius: 50%;
        background: var(--lw-violet);
        box-shadow: 0 0 12px var(--lw-violet);
      }
      .lokalweb-wizard .wz-topbar-back {
        background: transparent;
        border: 1px solid var(--lw-border-2);
        color: var(--lw-muted);
        width: 38px; height: 38px;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s var(--ease-out);
        font-size: 16px;
      }
      .lokalweb-wizard .wz-topbar-back:hover:not(:disabled) {
        background: var(--lw-surface-2);
        color: var(--lw-text);
        border-color: var(--lw-border-strong);
      }
      .lokalweb-wizard .wz-topbar-back:disabled { opacity: 0.3; cursor: not-allowed; }

      /* Stage */
      .lokalweb-wizard .wz-stage {
        position: relative;
        z-index: 1;
        min-height: calc(100vh - 70px);
        padding: 60px 32px 100px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .lokalweb-wizard .wz-screen-host {
        width: 100%;
        max-width: 640px;
      }
      .lokalweb-wizard .wz-screen {
        width: 100%;
        animation: wz-screen-enter 0.6s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-screen-host.wz-exiting .wz-screen {
        animation: wz-screen-exit 0.3s var(--ease-out) both;
      }
      @keyframes wz-screen-enter {
        0% { opacity: 0; transform: translateY(24px) scale(0.99); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes wz-screen-exit {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-12px) scale(0.99); }
      }

      .lokalweb-wizard .wz-step-tag {
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        font-weight: 500;
        color: var(--lw-muted-2);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: wz-fade-in-up 0.7s 0.05s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-step-tag::before {
        content: '';
        width: 24px;
        height: 1px;
        background: var(--lw-border-strong);
      }

      .lokalweb-wizard .wz-question {
        font-family: 'Instrument Serif', serif;
        font-size: clamp(36px, 5.5vw, 56px);
        font-weight: 400;
        line-height: 1.05;
        letter-spacing: -0.02em;
        color: var(--lw-text);
        margin-bottom: 14px;
        animation: wz-fade-in-up 0.7s 0.1s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-question em {
        font-style: italic;
        background: var(--lw-gradient);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .lokalweb-wizard .wz-question-sub {
        font-size: 16px;
        color: var(--lw-muted);
        margin-bottom: 40px;
        line-height: 1.6;
        max-width: 560px;
        animation: wz-fade-in-up 0.7s 0.15s var(--ease-out) both;
      }

      @keyframes wz-fade-in-up {
        0% { opacity: 0; transform: translateY(16px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      /* Inputs */
      .lokalweb-wizard .wz-input-area {
        margin-bottom: 32px;
        animation: wz-fade-in-up 0.7s 0.2s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-text-input {
        width: 100%;
        background: var(--lw-surface);
        border: 1.5px solid var(--lw-border-2);
        border-radius: 14px;
        padding: 18px 20px;
        font-family: 'DM Sans', sans-serif;
        font-size: 18px;
        color: var(--lw-text);
        outline: none;
        transition: all 0.25s var(--ease-out);
      }
      .lokalweb-wizard .wz-text-input::placeholder { color: var(--lw-muted-2); }
      .lokalweb-wizard .wz-text-input:hover:not(:disabled) { border-color: var(--lw-border-strong); }
      .lokalweb-wizard .wz-text-input:focus {
        border-color: var(--lw-blue);
        background: var(--lw-surface-2);
        box-shadow: 0 0 0 4px var(--lw-blue-tint);
      }
      .lokalweb-wizard textarea.wz-text-input {
        min-height: 140px;
        resize: vertical;
        line-height: 1.5;
        font-family: 'DM Sans', sans-serif;
      }
      .lokalweb-wizard .wz-input-helper {
        font-size: 13px;
        color: var(--lw-muted-2);
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        font-family: 'DM Mono', monospace;
      }
      .lokalweb-wizard .wz-word-count { transition: color 0.3s ease; }
      .lokalweb-wizard .wz-word-count.wz-weak { color: var(--lw-muted-2); }
      .lokalweb-wizard .wz-word-count.wz-good { color: var(--lw-success-text); }

      .lokalweb-wizard .wz-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .lokalweb-wizard .wz-suggestion {
        background: var(--lw-surface);
        border: 1px solid var(--lw-border);
        color: var(--lw-muted);
        font-size: 13px;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s var(--ease-out);
        font-family: 'DM Sans', sans-serif;
      }
      .lokalweb-wizard .wz-suggestion:hover {
        background: var(--lw-blue-tint);
        border-color: var(--lw-border-strong);
        color: var(--lw-text);
        transform: translateY(-1px);
      }

      /* Card grid */
      .lokalweb-wizard .wz-card-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .lokalweb-wizard .wz-card-grid.wz-three-col { grid-template-columns: repeat(3, 1fr); }

      .lokalweb-wizard .wz-option-card {
        background: var(--lw-surface);
        border: 1.5px solid var(--lw-border);
        border-radius: 14px;
        padding: 22px 20px;
        cursor: pointer;
        transition: all 0.25s var(--ease-out);
        text-align: left;
        position: relative;
        overflow: hidden;
        color: var(--lw-text);
        font-family: inherit;
      }
      .lokalweb-wizard .wz-option-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(79,142,247,0.04), rgba(139,92,246,0.04));
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .lokalweb-wizard .wz-option-card:hover {
        border-color: var(--lw-border-strong);
        transform: translateY(-2px);
      }
      .lokalweb-wizard .wz-option-card:hover::before { opacity: 1; }
      .lokalweb-wizard .wz-option-card.wz-selected {
        border-color: var(--lw-blue);
        background: var(--lw-blue-tint);
      }
      .lokalweb-wizard .wz-option-card.wz-selected::before { opacity: 1; }
      .lokalweb-wizard .wz-option-card .wz-card-label {
        font-family: 'Instrument Serif', serif;
        font-size: 22px;
        font-weight: 400;
        margin-bottom: 6px;
        color: var(--lw-text);
        letter-spacing: -0.01em;
      }
      .lokalweb-wizard .wz-option-card .wz-card-desc {
        font-size: 13px;
        color: var(--lw-muted);
        line-height: 1.4;
      }
      .lokalweb-wizard .wz-option-card.wz-with-preview .wz-preview {
        height: 56px;
        margin-bottom: 14px;
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }

      /* Services editor */
      .lokalweb-wizard .wz-services-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }
      .lokalweb-wizard .wz-service-row {
        background: var(--lw-surface);
        border: 1px solid var(--lw-border);
        border-radius: 14px;
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr 90px 90px 36px;
        gap: 10px;
        align-items: center;
        animation: wz-fade-in-up 0.4s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-service-row .wz-text-input {
        padding: 10px 12px;
        font-size: 14px;
        border-radius: 8px;
      }
      .lokalweb-wizard .wz-remove-btn {
        background: transparent;
        border: 1px solid var(--lw-border);
        color: var(--lw-muted-2);
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 18px;
        line-height: 1;
      }
      .lokalweb-wizard .wz-remove-btn:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
      }
      .lokalweb-wizard .wz-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .lokalweb-wizard .wz-add-service-btn {
        background: transparent;
        border: 1.5px dashed var(--lw-border-2);
        color: var(--lw-muted);
        padding: 14px;
        border-radius: 14px;
        width: 100%;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .lokalweb-wizard .wz-add-service-btn:hover:not(:disabled) {
        background: var(--lw-surface);
        border-color: var(--lw-blue);
        color: var(--lw-blue);
      }
      .lokalweb-wizard .wz-add-service-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      /* Layout step */
      .lokalweb-wizard .wz-layout-default-card {
        background: var(--lw-surface);
        border: 2px solid var(--lw-border);
        border-radius: 16px;
        padding: 28px 24px;
        margin-bottom: 16px;
        position: relative;
        overflow: hidden;
        width: 100%;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        color: var(--lw-text);
        transition: all 0.25s var(--ease-out);
      }
      .lokalweb-wizard .wz-layout-default-card.wz-selected { border-color: var(--lw-blue); }
      .lokalweb-wizard .wz-layout-default-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(79,142,247,0.08), rgba(139,92,246,0.06));
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .lokalweb-wizard .wz-layout-default-card.wz-selected::before { opacity: 1; }
      .lokalweb-wizard .wz-layout-default-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: var(--lw-gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        position: relative;
        z-index: 1;
      }
      .lokalweb-wizard .wz-layout-default-icon svg {
        width: 22px;
        height: 22px;
        color: white;
      }
      .lokalweb-wizard .wz-layout-default-title {
        font-family: 'Instrument Serif', serif;
        font-size: 24px;
        font-weight: 400;
        margin-bottom: 6px;
        position: relative; z-index: 1;
        letter-spacing: -0.01em;
      }
      .lokalweb-wizard .wz-layout-default-desc {
        color: var(--lw-muted);
        font-size: 14px;
        line-height: 1.5;
        position: relative; z-index: 1;
      }

      .lokalweb-wizard .wz-advanced-toggle {
        background: transparent;
        border: 1px solid var(--lw-border);
        color: var(--lw-muted);
        padding: 12px 16px;
        border-radius: 10px;
        width: 100%;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .lokalweb-wizard .wz-advanced-toggle:hover {
        border-color: var(--lw-border-strong);
        color: var(--lw-text);
      }
      .lokalweb-wizard .wz-advanced-toggle .wz-chevron {
        transition: transform 0.3s ease;
        font-family: 'DM Mono', monospace;
      }
      .lokalweb-wizard .wz-advanced-toggle.wz-open .wz-chevron { transform: rotate(90deg); }

      .lokalweb-wizard .wz-advanced-panel {
        margin-top: 14px;
        background: var(--lw-bg-2);
        border: 1px solid var(--lw-border);
        border-radius: 12px;
        padding: 16px;
        font-size: 13px;
        color: var(--lw-muted);
        animation: wz-fade-in-up 0.3s var(--ease-out);
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .lokalweb-wizard .wz-advanced-hint { color: var(--lw-muted); margin: 0 0 4px; }
      .lokalweb-wizard .wz-layout-picker { display: flex; flex-direction: column; gap: 8px; }
      .lokalweb-wizard .wz-layout-picker-title {
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--lw-muted-2);
      }
      .lokalweb-wizard .wz-layout-picker-row {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .lokalweb-wizard .wz-layout-pill {
        flex: 0 0 auto;
        background: var(--lw-surface);
        border: 1px solid var(--lw-border);
        color: var(--lw-muted);
        padding: 8px 12px;
        border-radius: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 110px;
      }
      .lokalweb-wizard .wz-layout-pill:hover {
        border-color: var(--lw-border-strong);
        color: var(--lw-text);
      }
      .lokalweb-wizard .wz-layout-pill.wz-selected {
        border-color: var(--lw-blue);
        background: var(--lw-blue-tint);
        color: var(--lw-text);
      }
      .lokalweb-wizard .wz-layout-pill-label { font-weight: 600; }
      .lokalweb-wizard .wz-layout-pill-sub { font-size: 11px; color: var(--lw-muted-2); }

      /* Action buttons */
      .lokalweb-wizard .wz-actions {
        margin-top: 32px;
        display: flex;
        gap: 12px;
        align-items: center;
        animation: wz-fade-in-up 0.7s 0.3s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-btn {
        padding: 14px 28px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        transition: all 0.2s var(--ease-out);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .lokalweb-wizard .wz-btn-primary {
        background: var(--lw-gradient);
        color: white;
        position: relative;
        overflow: hidden;
      }
      .lokalweb-wizard .wz-btn-primary::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #5a98f8, #9466f7);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .lokalweb-wizard .wz-btn-primary span { position: relative; z-index: 1; }
      .lokalweb-wizard .wz-btn-primary:hover:not(:disabled)::before { opacity: 1; }
      .lokalweb-wizard .wz-btn-primary:active:not(:disabled) { transform: scale(0.97); }
      .lokalweb-wizard .wz-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
      .lokalweb-wizard .wz-btn-primary:disabled:hover::before { opacity: 0; }
      .lokalweb-wizard .wz-btn-ghost {
        background: transparent;
        color: var(--lw-muted);
        border: 1px solid transparent;
      }
      .lokalweb-wizard .wz-btn-ghost:hover:not(:disabled) {
        color: var(--lw-text);
        background: var(--lw-surface);
      }
      .lokalweb-wizard .wz-keyboard-hint {
        margin-left: auto;
        font-size: 12px;
        color: var(--lw-muted-2);
        font-family: 'DM Mono', monospace;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lokalweb-wizard .wz-kbd {
        background: var(--lw-surface-2);
        border: 1px solid var(--lw-border);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 11px;
        color: var(--lw-muted);
      }

      /* Summary */
      .lokalweb-wizard .wz-summary-grid {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
        background: var(--lw-surface);
        border: 1px solid var(--lw-border);
        border-radius: 16px;
        padding: 8px;
        animation: wz-fade-in-up 0.7s 0.2s var(--ease-out) both;
      }
      .lokalweb-wizard .wz-summary-row {
        display: grid;
        grid-template-columns: 200px 1fr 32px;
        gap: 16px;
        align-items: start;
        padding: 14px 18px;
        border-radius: 10px;
        transition: background 0.2s ease;
        background: transparent;
        border: 1px solid transparent;
        text-align: left;
        font-family: inherit;
        cursor: pointer;
        color: inherit;
      }
      .lokalweb-wizard .wz-summary-row:hover { background: var(--lw-bg-2); }
      .lokalweb-wizard .wz-summary-row[data-missing="true"] { border-color: rgba(251, 113, 133, 0.25); }
      .lokalweb-wizard .wz-summary-label {
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        color: var(--lw-muted-2);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding-top: 3px;
      }
      .lokalweb-wizard .wz-summary-value {
        font-size: 15px;
        color: var(--lw-text);
        line-height: 1.5;
        word-wrap: break-word;
      }
      .lokalweb-wizard .wz-summary-value.wz-empty {
        color: var(--lw-muted-2);
        font-style: italic;
      }
      .lokalweb-wizard .wz-summary-value.wz-missing {
        color: #f87171;
        font-style: italic;
      }
      .lokalweb-wizard .wz-edit-btn {
        color: var(--lw-muted-2);
        width: 28px;
        height: 28px;
        border-radius: 6px;
        font-size: 13px;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .lokalweb-wizard .wz-summary-row:hover .wz-edit-btn { color: var(--lw-blue); }
      .lokalweb-wizard .wz-submit-error {
        color: #f87171;
        font-size: 13px;
        margin-bottom: 8px;
        font-family: 'DM Mono', monospace;
      }

      /* Modal */
      .lokalweb-wizard .wz-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 300;
        background: rgba(10, 10, 15, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        animation: wz-fade-in-up 0.4s var(--ease-out);
      }
      .lokalweb-wizard .wz-modal {
        background: var(--lw-surface);
        border: 1px solid var(--lw-border-2);
        border-radius: 18px;
        padding: 32px;
        max-width: 440px;
        width: 100%;
        box-shadow: 0 24px 48px -12px rgba(0,0,0,0.5);
      }
      .lokalweb-wizard .wz-modal-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--lw-blue-tint);
        color: var(--lw-blue);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        margin-bottom: 20px;
      }
      .lokalweb-wizard .wz-modal-title {
        font-family: 'Instrument Serif', serif;
        font-size: 28px;
        font-weight: 400;
        line-height: 1.15;
        letter-spacing: -0.01em;
        margin-bottom: 10px;
      }
      .lokalweb-wizard .wz-modal-body {
        color: var(--lw-muted);
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 24px;
      }
      .lokalweb-wizard .wz-modal-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      /* Generating overlay */
      .lokalweb-wizard .wz-generating-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 15, 0.92);
        backdrop-filter: blur(20px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 32px;
        text-align: center;
        padding: 40px;
        animation: wz-fade-in-up 0.5s var(--ease-out);
      }
      .lokalweb-wizard .wz-gen-spinner {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, transparent 0%, var(--lw-blue) 30%, var(--lw-violet) 60%, transparent 100%);
        animation: wz-spin 1.5s linear infinite;
        position: relative;
      }
      .lokalweb-wizard .wz-gen-spinner::after {
        content: '';
        position: absolute;
        inset: 6px;
        background: var(--lw-bg);
        border-radius: 50%;
      }
      @keyframes wz-spin { to { transform: rotate(360deg); } }
      .lokalweb-wizard .wz-gen-title {
        font-family: 'Instrument Serif', serif;
        font-size: 36px;
        color: var(--lw-text);
      }
      .lokalweb-wizard .wz-gen-step {
        font-size: 14px;
        color: var(--lw-muted);
        font-family: 'DM Mono', monospace;
        min-height: 24px;
        margin-top: 8px;
      }
      .lokalweb-wizard .wz-gen-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        text-align: left;
      }
      .lokalweb-wizard .wz-gen-item { display: flex; align-items: center; gap: 12px; }
      .lokalweb-wizard .wz-gen-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: transparent;
        border: 1.5px solid var(--lw-border-strong);
        flex-shrink: 0;
      }
      .lokalweb-wizard .wz-gen-dot.wz-done {
        background: var(--lw-success-text);
        border-color: var(--lw-success-text);
      }
      .lokalweb-wizard .wz-gen-dot.wz-active {
        background: var(--lw-blue-tint);
        border-color: var(--lw-blue);
        box-shadow: 0 0 0 4px var(--lw-blue-tint);
      }
      .lokalweb-wizard .wz-gen-label { color: var(--lw-muted); font-size: 14px; }
      .lokalweb-wizard .wz-gen-label.wz-done { color: var(--lw-muted-2); }
      .lokalweb-wizard .wz-gen-label.wz-active { color: var(--lw-text); font-weight: 500; }

      /* Preview screen */
      .lokalweb-wizard .wz-preview-host {
        position: relative;
        z-index: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px 24px 60px;
        width: 100%;
      }
      .lokalweb-wizard .wz-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .lokalweb-wizard .wz-preview-title {
        font-family: 'Instrument Serif', serif;
        font-size: clamp(28px, 4vw, 40px);
        font-weight: 400;
        letter-spacing: -0.02em;
      }
      .lokalweb-wizard .wz-preview-actions { display: flex; gap: 10px; }
      .lokalweb-wizard .wz-preview-error {
        color: #f87171;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .lokalweb-wizard .wz-preview-frame {
        background: var(--lw-surface);
        border: 1px solid var(--lw-border);
        border-radius: 18px;
        padding: 12px;
      }
      .lokalweb-wizard .wz-preview-urlbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px 14px;
      }
      .lokalweb-wizard .wz-preview-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--lw-muted-2);
        opacity: 0.5;
      }
      .lokalweb-wizard .wz-preview-url {
        flex: 1;
        margin-left: 12px;
        background: var(--lw-bg-2);
        border: 1px solid var(--lw-border);
        border-radius: 8px;
        padding: 6px 12px;
        color: var(--lw-muted);
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lokalweb-wizard .wz-preview-viewport {
        position: relative;
        max-height: min(70vh, 760px);
        overflow-y: auto;
        overscroll-behavior: contain;
        border-radius: 12px;
        border: 1px solid var(--lw-border);
        isolation: isolate;
        background: white;
      }
      .lokalweb-wizard .wz-applying-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: white;
        animation: wz-spin 0.8s linear infinite;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .lokalweb-wizard .wz-topbar { padding: 14px 16px; gap: 12px; }
        .lokalweb-wizard .wz-progress-area { max-width: none; }
        .lokalweb-wizard .wz-stage { padding: 40px 20px 100px; }
        .lokalweb-wizard .wz-question { font-size: 36px; }
        .lokalweb-wizard .wz-card-grid { grid-template-columns: 1fr; }
        .lokalweb-wizard .wz-card-grid.wz-three-col { grid-template-columns: 1fr; }
        .lokalweb-wizard .wz-summary-row {
          grid-template-columns: 1fr;
          gap: 4px;
          padding: 12px 14px;
        }
        .lokalweb-wizard .wz-edit-btn { justify-self: end; margin-top: -28px; }
        .lokalweb-wizard .wz-service-row {
          grid-template-columns: 1fr 70px 70px 32px;
          gap: 8px;
        }
        .lokalweb-wizard .wz-keyboard-hint { display: none; }
      }
    `}</style>
  );
}
