'use client';

/**
 * Generation pipeline hook — wraps the brand-brief + generate-variants flow
 * and the Supabase realtime progress channel. Extracted from the legacy
 * Wizard.tsx (lines ~346-605) so Liki is the sole consumer.
 *
 * The pipeline runs in three stages:
 *   1. POST /api/brand-brief        → returns Brief (positioning, traits, voice...)
 *   2. POST /api/generate-variants  → returns AiSitePayload (theme + sections)
 *   3. POST /api/apply-theme        → persists to website_customization + businesses
 *
 * Supabase realtime sits on `ai_generation_events` filtered by generationId
 * and advances the substep UI in real time. A fallback timer steps forward
 * after FALLBACK_ADVANCE_MS in case events are dropped or delayed.
 *
 * `reuseBrief: true` on regen skips stage 1 (brief is preserved between runs).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AiSitePayload, WizardInput } from '@/lib/types/customization';
import type { ProgressStep, ProgressStatus } from '@/lib/ai-progress';
import { SUBSTEPS } from './mappings';

type Brief = {
  positioning: string;
  definingTraits: string[];
  targetCustomer: string;
  voice: string;
  culturalAnchor: string;
};

const FALLBACK_ADVANCE_MS = 8000;

export type RunGenerationInput = WizardInput & {
  businessNameOverride: string;
  servicesRaw: string;
};

export type ApplyInput = {
  theme: AiSitePayload;
  language: WizardInput['language'];
  tone: WizardInput['tone'];
  uniquenessStatement?: string;
  bookingMethod: WizardInput['bookingMethod'];
  wizardServices: Array<{ name: string; price?: string; durationMinutes?: number }>;
  businessName: string;
};

export function useGenerationPipeline({ businessId }: { businessId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [theme, setTheme] = useState<AiSitePayload | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ProgressStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ProgressStep>>(new Set());
  const [genError, setGenError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceFallback = useCallback((currentStep: ProgressStep | null) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (!currentStep) return;
    fallbackTimerRef.current = setTimeout(() => {
      const idx = SUBSTEPS.findIndex((s) => s.step === currentStep);
      if (idx < 0 || idx >= SUBSTEPS.length - 1) return;
      const nextStep = SUBSTEPS[idx + 1].step;
      setCompletedSteps((prev) => {
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
          const evt = payload.new as {
            step: ProgressStep;
            status: ProgressStatus;
            message: string | null;
          };
          if (evt.status === 'completed') {
            setCompletedSteps((prev) => {
              const out = new Set(prev);
              out.add(evt.step);
              return out;
            });
            const idx = SUBSTEPS.findIndex((s) => s.step === evt.step);
            if (idx >= 0 && idx < SUBSTEPS.length - 1) {
              const nextStep = SUBSTEPS[idx + 1].step;
              setActiveStep(nextStep);
              advanceFallback(nextStep);
            } else if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
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

  const runGeneration = useCallback(
    async (input: RunGenerationInput, opts: { reuseBrief?: boolean } = {}): Promise<AiSitePayload> => {
      setGenError(null);
      const newGenId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let currentBrief: Brief | null = opts.reuseBrief ? brief : null;

      if (currentBrief) {
        setCompletedSteps(new Set<ProgressStep>(['analyzing_business', 'building_brief']));
        setActiveStep('designing_theme');
      } else {
        setCompletedSteps(new Set());
        setActiveStep('analyzing_business');
      }
      advanceFallback(currentBrief ? 'designing_theme' : 'analyzing_business');
      setGenerationId(newGenId);

      try {
        if (!currentBrief) {
          const briefRes = await fetch('/api/brand-brief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: input.businessNameOverride,
              industry: input.industry,
              industryChip: input.industryChip,
              city: input.city,
              uniqueness: input.uniqueness,
              businessDescription: input.businessDescription,
              services: input.services.map((s) => ({
                name: s.name,
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
            businessName: input.businessNameOverride,
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
            bookingMethod: input.bookingMethod,
            language: input.language,
            tone: input.tone,
            // Liki passes the raw free-text the user typed into the services
            // textarea AND the minimal-parsed array. Phase 5 will replace the
            // parser with Haiku extraction; both fields are already accepted
            // by /api/generate-variants today.
            userProvidedServices: input.servicesRaw,
            wizardServices: input.services.map((s) => ({
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
        const t = themeData.theme as AiSitePayload;
        setTheme(t);
        setCompletedSteps(
          new Set<ProgressStep>([
            'analyzing_business',
            'building_brief',
            'designing_theme',
            'writing_copy',
            'finalizing',
          ]),
        );
        setActiveStep(null);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        return t;
      } catch (e: any) {
        setGenError(e?.message || 'Gjenerimi dështoi');
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        throw e;
      }
    },
    [advanceFallback, brief, businessId],
  );

  const applyTheme = useCallback(
    async (payload: ApplyInput): Promise<void> => {
      setApplying(true);
      setApplyError(null);
      try {
        const res = await fetch('/api/apply-theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            theme: payload.theme,
            siteLanguage: payload.language,
            siteTone: payload.tone,
            uniquenessStatement: payload.uniquenessStatement,
            bookingMethod: payload.bookingMethod,
            wizardServices: payload.wizardServices,
            businessName: payload.businessName,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Aplikimi dështoi');
        setApplying(false);
      } catch (e: any) {
        setApplyError(e?.message || 'Aplikimi dështoi');
        setApplying(false);
        throw e;
      }
    },
    [businessId],
  );

  return {
    activeStep,
    completedSteps,
    brief,
    theme,
    genError,
    applying,
    applyError,
    runGeneration,
    applyTheme,
  };
}
