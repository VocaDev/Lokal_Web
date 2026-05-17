'use client';

/**
 * Liki — conversational wizard with AI assist (Phases 1-5).
 *
 * Flow:
 *   chat (5 screens)   → transition (drop) → form (4 screens) → summary
 *   summary            → generating → preview
 *
 * Phase 2: questions 4 and 5 hit the evaluator. Weak answers trigger one
 * follow-up; a second weak answer surfaces industry choices (Mjeti 2).
 * Phase 3: when the user reaches the transition, the suggestor runs in the
 * background and pre-fills language/tone/visual.
 * Phase 5: on the services screen, the extractor turns free text into a
 * structured services array. All AI calls degrade gracefully — Liki never
 * blocks the user on a failed or slow Haiku call.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetypes';
import type { WizardInput } from '@/lib/types/customization';

import { LikiStyles } from './styles';
import {
  CHAT_QUESTIONS,
  TONE_TO_INPUT,
  VISUAL_TO_ARCHETYPE,
  inferIndustryChip,
  parseServicesRaw,
  type LangKey,
  type ToneKey,
  type VisualKey,
} from './mappings';
import {
  CHAT_TOTAL,
  FORM_TOTAL,
  initialState,
  isLikiState,
  missingRequired,
  reducer,
  type LikiState,
  type Phase,
  type TextField,
} from './state';
import {
  clearDraft,
  useDraftAutoSave,
  useDraftPrompt,
} from './useLikiDraft';
import {
  useGenerationPipeline,
  type RunGenerationInput,
} from './useGenerationPipeline';
import { useLikiAssist } from './useLikiAssist';

import { Topbar } from './components/Topbar';
import { DropTransition } from './components/DropTransition';
import { GeneratingOverlay } from './components/GeneratingOverlay';
import { PreviewScreen } from './components/PreviewScreen';
import { DraftRestoreModal } from './components/DraftRestoreModal';

import { ChatScreen } from './screens/ChatScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { ToneScreen } from './screens/ToneScreen';
import { VisualScreen } from './screens/VisualScreen';
import { SummaryScreen } from './screens/SummaryScreen';

type Props = {
  businessId: string;
  subdomain: string;
  businessName: string;
  bookingEnabled: boolean;
};

const TOTAL_QUESTIONS = CHAT_TOTAL + FORM_TOTAL; // 9

// Cheap heuristic for the suggestor's `detectedLanguage` hint. Haiku will
// override if the description points the other way.
function detectLanguage(state: LikiState): 'sq' | 'en' | 'mixed' {
  const sample = `${state.description} ${state.uniqueness} ${state.businessType}`.toLowerCase();
  if (!sample.trim()) return 'sq';
  const sqMarkers = (sample.match(/\b(është|jam|kemi|bëj|me|në|për|një|me|të|dhe|ka|i mirë|kosov|shqip)\b/g) || []).length;
  const enMarkers = (sample.match(/\b(is|am|we|i|the|of|and|to|in|a|for|with|english|business)\b/g) || []).length;
  if (sqMarkers > enMarkers * 2) return 'sq';
  if (enMarkers > sqMarkers * 2) return 'en';
  return 'mixed';
}

function joinAnswer(primary: string, followup: string): string {
  const p = primary.trim();
  const f = followup.trim();
  if (!p && !f) return '';
  if (!f) return p;
  if (!p) return f;
  return `${p}\n\n${f}`;
}

export default function Liki({ businessId, subdomain, businessName, bookingEnabled }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(businessName));

  const { hasDraft, decided, draft: pendingDraft, restore, discard } = useDraftPrompt();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!decided || hydrated) return;
    if (pendingDraft && isLikiState(pendingDraft.state)) {
      dispatch({ type: 'HYDRATE', payload: pendingDraft.state });
    }
    setHydrated(true);
  }, [decided, hydrated, pendingDraft]);

  useDraftAutoSave({ state }, hydrated);

  const {
    activeStep,
    completedSteps,
    theme,
    brief,
    genError,
    applying,
    applyError,
    runGeneration,
    applyTheme,
  } = useGenerationPipeline({ businessId });

  const assist = useLikiAssist();

  // -----------------------------------------------------------------
  // Project Liki state → pipeline payload. Phase 2: uniqueness and
  // description carry the original + follow-up answer joined with a blank
  // line so brand-brief gets both data points. Phase 5: structured services
  // (Haiku) replace the placeholder parser when available.
  // -----------------------------------------------------------------
  const projectInput = useCallback((): RunGenerationInput => {
    const archetypeKey: ArchetypeKey | 'ai' = state.visual ? VISUAL_TO_ARCHETYPE[state.visual] : 'ai';
    const uniqueness = joinAnswer(state.uniqueness, state.uniquenessFollowup);
    const businessDescription = joinAnswer(state.description, state.descriptionFollowup);
    const services = (state.servicesStructured && state.servicesStructured.length > 0)
      ? state.servicesStructured
      : parseServicesRaw(state.servicesRaw);
    const input: WizardInput = {
      industry: state.businessType.trim(),
      industryChip: inferIndustryChip(state.businessType),
      city: state.city.trim(),
      uniqueness: uniqueness || undefined,
      businessDescription,
      services,
      bookingMethod: bookingEnabled ? 'appointments' : 'none',
      heroLayout: 'ai',
      storyLayout: 'ai',
      servicesLayout: 'ai',
      galleryLayout: 'ai',
      archetypeKey,
      brandPrimary: undefined,
      brandAccent: undefined,
      customFont: undefined,
      language: (state.language || 'sq') as WizardInput['language'],
      tone: state.tone ? TONE_TO_INPUT[state.tone] : 'friendly',
      instagramUrl: undefined,
      tiktokUrl: undefined,
      phoneNumber: undefined,
    };
    return {
      ...input,
      businessNameOverride: state.businessName.trim() || businessName,
      servicesRaw: state.servicesRaw.trim(),
    };
  }, [state, bookingEnabled, businessName]);

  // -----------------------------------------------------------------
  // Navigation (no AI)
  // -----------------------------------------------------------------
  const goNext = useCallback(() => {
    const { phase, step } = state;
    if (phase === 'chat') {
      if (step < CHAT_TOTAL - 1) {
        dispatch({ type: 'GOTO', phase: 'chat', step: step + 1 });
      } else {
        dispatch({ type: 'GOTO', phase: 'transition', step: 0 });
      }
    } else if (phase === 'form') {
      if (step < FORM_TOTAL - 1) {
        dispatch({ type: 'GOTO', phase: 'form', step: step + 1 });
      } else {
        dispatch({ type: 'GOTO', phase: 'summary', step: 0 });
      }
    }
  }, [state]);

  const goBack = useCallback(() => {
    const { phase, step } = state;
    if (phase === 'chat') {
      if (step > 0) dispatch({ type: 'GOTO', phase: 'chat', step: step - 1 });
    } else if (phase === 'transition') {
      dispatch({ type: 'GOTO', phase: 'chat', step: CHAT_TOTAL - 1 });
    } else if (phase === 'form') {
      if (step > 0) dispatch({ type: 'GOTO', phase: 'form', step: step - 1 });
      else dispatch({ type: 'GOTO', phase: 'transition', step: 0 });
    } else if (phase === 'summary') {
      dispatch({ type: 'GOTO', phase: 'form', step: FORM_TOTAL - 1 });
    }
  }, [state]);

  const handleEditFromSummary = useCallback((phase: Phase, step: number) => {
    dispatch({ type: 'GOTO', phase, step });
  }, []);

  // -----------------------------------------------------------------
  // Phase 2: chat submit with evaluator for Q4 (uniqueness) and Q5 (description).
  // For Q1-Q3 this is a plain advance.
  //
  // Flow on Q4/Q5:
  //   1st submit  → evaluate(answer) → weak+followup ⇒ stay, show FollowupBubble
  //                                  → good ⇒ advance
  //   2nd submit  → evaluate(answer, followupAnswer) → offer_choices ⇒ stay,
  //                                                    show ChoicesPicker
  //                                                  → otherwise ⇒ advance
  //   pick choice → fill followup with chosen text, advance
  // -----------------------------------------------------------------
  const handleChatNext = useCallback(async () => {
    if (state.phase !== 'chat') return goNext();
    const q = CHAT_QUESTIONS[state.step];
    if (q.key !== 'uniqueness' && q.key !== 'description') return goNext();
    const richKey: 'uniqueness' | 'description' = q.key;

    const followupActive =
      richKey === 'uniqueness'
        ? state.uniquenessFollowupQuestion !== ''
        : state.descriptionFollowupQuestion !== '';

    const original = richKey === 'uniqueness' ? state.uniqueness : state.description;
    const followup = richKey === 'uniqueness' ? state.uniquenessFollowup : state.descriptionFollowup;

    // Empty submissions skip the AI call entirely — they're treated as "skip".
    if (!followupActive && !original.trim()) return goNext();
    if (followupActive && !followup.trim()) {
      dispatch({ type: 'CLEAR_FOLLOWUP', field: richKey });
      return goNext();
    }

    dispatch({ type: 'SET_EVALUATING', value: true });
    const result = await assist.evaluate({
      question: richKey,
      answer: original,
      followupAnswer: followupActive ? followup : undefined,
      industryChip: inferIndustryChip(state.businessType),
      industryText: state.businessType,
      businessName: state.businessName,
      language: (state.language || 'sq') as 'sq' | 'en',
    });
    dispatch({ type: 'SET_EVALUATING', value: false });

    if (!followupActive) {
      // 1st submission.
      if (result.quality === 'weak' && result.followup) {
        dispatch({ type: 'SET_FOLLOWUP_QUESTION', field: richKey, text: result.followup });
        return;
      }
      // Good answer (or weak but no followup generated) — advance.
      return goNext();
    }

    // 2nd submission. Max 1 follow-up rule — always advance, but may surface
    // industry choices first if the user is clearly stuck on uniqueness.
    if (result.offer_choices && richKey === 'uniqueness' && result.choices.length > 0) {
      dispatch({ type: 'SET_CHOICES', choices: result.choices });
      return;
    }
    dispatch({ type: 'CLEAR_FOLLOWUP', field: richKey });
    goNext();
  }, [state, assist, goNext]);

  // -----------------------------------------------------------------
  // Phase 4: ChoicesPicker handlers
  // -----------------------------------------------------------------
  const handlePickChoice = useCallback((choice: string) => {
    // Treat the chosen text as the user's follow-up answer (replaces whatever
    // they typed). Keep state.uniqueness intact — projectInput concatenates
    // the original + this choice for the pipeline payload.
    dispatch({ type: 'FIELD', key: 'uniquenessFollowup', value: choice });
    dispatch({ type: 'CLEAR_CHOICES' });
    goNext();
  }, [goNext]);

  const handleCustomizeChoices = useCallback(() => {
    dispatch({ type: 'CLEAR_CHOICES' });
  }, []);

  // -----------------------------------------------------------------
  // Skip clears the active field, then advances. For Q4/Q5 with active
  // follow-up, "skip" wipes the follow-up text and advances regardless.
  // -----------------------------------------------------------------
  const handleSkip = useCallback(() => {
    if (state.phase === 'chat') {
      const q = CHAT_QUESTIONS[state.step];
      const followupActive =
        (q.key === 'uniqueness' && state.uniquenessFollowupQuestion !== '') ||
        (q.key === 'description' && state.descriptionFollowupQuestion !== '');
      if (followupActive) {
        dispatch({ type: 'CLEAR_FOLLOWUP', field: q.key as 'uniqueness' | 'description' });
        if (q.key === 'uniqueness') dispatch({ type: 'CLEAR_CHOICES' });
      } else {
        dispatch({ type: 'FIELD', key: q.key, value: '' });
      }
    } else if (state.phase === 'form' && state.step === 0) {
      dispatch({ type: 'FIELD', key: 'servicesRaw', value: '' });
      dispatch({ type: 'SET_SERVICES_STRUCTURED', services: undefined });
    }
    goNext();
  }, [state.phase, state.step, state.uniquenessFollowupQuestion, state.descriptionFollowupQuestion, goNext]);

  // -----------------------------------------------------------------
  // Phase 5: services screen "Vazhdo" → run extractor, then advance.
  // Empty input skips Haiku and advances immediately.
  // -----------------------------------------------------------------
  const handleServicesNext = useCallback(async () => {
    if (!state.servicesRaw.trim()) {
      dispatch({ type: 'SET_SERVICES_STRUCTURED', services: undefined });
      return goNext();
    }
    dispatch({ type: 'SET_EXTRACTING_SERVICES', value: true });
    const result = await assist.extractServices({
      servicesRaw: state.servicesRaw,
      industryChip: inferIndustryChip(state.businessType),
      industryText: state.businessType,
      language: (state.language || 'sq') as 'sq' | 'en',
    });
    dispatch({ type: 'SET_EXTRACTING_SERVICES', value: false });
    if (result.services && Array.isArray(result.services)) {
      dispatch({ type: 'SET_SERVICES_STRUCTURED', services: result.services });
    } else {
      // Fallback: null services → projectInput uses parseServicesRaw at submit.
      dispatch({ type: 'SET_SERVICES_STRUCTURED', services: undefined });
    }
    goNext();
  }, [state.servicesRaw, state.businessType, state.language, assist, goNext]);

  const handleRestart = useCallback(() => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('A je i sigurt që do të rifillosh? Të dhënat do të humbasin.');
      if (!ok) return;
    }
    clearDraft();
    dispatch({ type: 'RESET', businessName });
  }, [businessName]);

  // -----------------------------------------------------------------
  // Phase 3: fire suggestor in the background when the user reaches the
  // transition overlay. By the time they click "Vazhdojmë", the language /
  // tone / visual screens will have pre-fills if Haiku responded in time.
  // Cancels via the AbortController inside useLikiAssist on unmount.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'transition') return;
    if (state.suggestedLanguage && state.suggestedTone && state.suggestedVisual) return;

    let cancelled = false;
    (async () => {
      const uniqueness = joinAnswer(state.uniqueness, state.uniquenessFollowup);
      const description = joinAnswer(state.description, state.descriptionFollowup);
      const result = await assist.suggest({
        businessName: state.businessName,
        industryText: state.businessType,
        industryChip: inferIndustryChip(state.businessType),
        city: state.city,
        uniqueness,
        businessDescription: description,
        detectedLanguage: detectLanguage(state),
      });
      if (cancelled) return;
      dispatch({
        type: 'SET_SUGGESTIONS',
        language: result.language ?? undefined,
        tone: result.tone ?? undefined,
        visual: result.visual ?? undefined,
      });
    })();
    return () => { cancelled = true; };
    // Intentionally narrow deps — re-fires only when we enter transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // -----------------------------------------------------------------
  // Phase 3: auto-pre-select on entry to language/tone/visual screens when
  // the suggestion is available and nothing's selected yet. The badge stays
  // visible until the user clicks the same or a different card (which then
  // auto-advances per Phase 1 behavior).
  // -----------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'form') return;
    if (state.step === 1 && state.language === '' && state.suggestedLanguage) {
      dispatch({ type: 'SELECT_LANGUAGE', value: state.suggestedLanguage });
    } else if (state.step === 2 && state.tone === '' && state.suggestedTone) {
      dispatch({ type: 'SELECT_TONE', value: state.suggestedTone });
    } else if (state.step === 3 && state.visual === '' && state.suggestedVisual) {
      dispatch({ type: 'SELECT_VISUAL', value: state.suggestedVisual });
    }
  }, [
    state.phase,
    state.step,
    state.language,
    state.tone,
    state.visual,
    state.suggestedLanguage,
    state.suggestedTone,
    state.suggestedVisual,
  ]);

  // -----------------------------------------------------------------
  // Submit / regenerate / apply
  // -----------------------------------------------------------------
  const handleGenerate = useCallback(async () => {
    const input = projectInput();
    dispatch({ type: 'GOTO', phase: 'generating', step: 0 });
    try {
      await runGeneration(input);
      dispatch({ type: 'GOTO', phase: 'preview', step: 0 });
    } catch {
      // genError already set
    }
  }, [projectInput, runGeneration]);

  const handleRegenerate = useCallback(async () => {
    const input = projectInput();
    dispatch({ type: 'GOTO', phase: 'generating', step: 0 });
    try {
      await runGeneration(input, { reuseBrief: !!brief });
      dispatch({ type: 'GOTO', phase: 'preview', step: 0 });
    } catch { /* genError set */ }
  }, [projectInput, runGeneration, brief]);

  const handleApply = useCallback(async () => {
    if (!theme) return;
    try {
      const wizardServices = (state.servicesStructured && state.servicesStructured.length > 0)
        ? state.servicesStructured
        : parseServicesRaw(state.servicesRaw);
      await applyTheme({
        theme,
        language: (state.language || 'sq') as WizardInput['language'],
        tone: state.tone ? TONE_TO_INPUT[state.tone] : 'friendly',
        uniquenessStatement: joinAnswer(state.uniqueness, state.uniquenessFollowup) || undefined,
        bookingMethod: bookingEnabled ? 'appointments' : 'none',
        wizardServices,
        businessName: state.businessName.trim() || businessName,
      });
      clearDraft();
      window.location.href = '/dashboard';
    } catch { /* applyError surfaces in header */ }
  }, [theme, state, applyTheme, bookingEnabled, businessName]);

  const handleFieldChange = useCallback((key: TextField, value: string) => {
    dispatch({ type: 'FIELD', key, value });
  }, []);

  const handleSelectLanguage = useCallback((v: LangKey) => dispatch({ type: 'SELECT_LANGUAGE', value: v }), []);
  const handleSelectTone = useCallback((v: ToneKey) => dispatch({ type: 'SELECT_TONE', value: v }), []);
  const handleSelectVisual = useCallback((v: VisualKey) => dispatch({ type: 'SELECT_VISUAL', value: v }), []);

  // Escape: back. Enter handled per-input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (state.evaluating || state.extractingServices) return; // don't navigate during AI
      if (state.phase === 'chat' && state.step === 0) return;
      if (state.phase === 'generating' || state.phase === 'preview') return;
      e.preventDefault();
      goBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, state.step, state.evaluating, state.extractingServices, goBack]);

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  const showRestorePrompt = hasDraft && !decided;

  const topbarCurrent =
    state.phase === 'chat'    ? state.step
    : state.phase === 'form'   ? CHAT_TOTAL + state.step
    : state.phase === 'summary' ? TOTAL_QUESTIONS - 1
    : 0;

  const showTopbar =
    state.phase === 'chat' ||
    state.phase === 'form' ||
    state.phase === 'summary';

  const backDisabled =
    (state.phase === 'chat' && state.step === 0) ||
    state.evaluating ||
    state.extractingServices;

  return (
    <div className="lokalweb-liki">
      <LikiStyles />

      {showRestorePrompt && (
        <DraftRestoreModal onRestore={restore} onDiscard={discard} />
      )}

      {showTopbar && (
        <Topbar
          current={topbarCurrent}
          total={TOTAL_QUESTIONS}
          onBack={goBack}
          onRestart={handleRestart}
          backDisabled={backDisabled}
          showRestart
        />
      )}

      <main className="li-stage">
        {state.phase === 'chat' && (
          <ChatScreen
            key={`chat-${state.step}`}
            state={state}
            step={state.step}
            onFieldChange={handleFieldChange}
            onNext={handleChatNext}
            onSkip={handleSkip}
            onPickChoice={handlePickChoice}
            onCustomizeChoices={handleCustomizeChoices}
          />
        )}

        {state.phase === 'transition' && (
          <DropTransition
            state={state}
            onContinue={() => dispatch({ type: 'GOTO', phase: 'form', step: 0 })}
            onEdit={() => dispatch({ type: 'GOTO', phase: 'chat', step: 0 })}
          />
        )}

        {state.phase === 'form' && state.step === 0 && (
          <ServicesScreen
            key="form-0"
            value={state.servicesRaw}
            onChange={(v) => handleFieldChange('servicesRaw', v)}
            onNext={handleServicesNext}
            onSkip={handleSkip}
            extracting={state.extractingServices}
          />
        )}
        {state.phase === 'form' && state.step === 1 && (
          <LanguageScreen
            key="form-1"
            selected={state.language}
            onSelect={handleSelectLanguage}
            onNext={goNext}
            suggested={state.suggestedLanguage}
          />
        )}
        {state.phase === 'form' && state.step === 2 && (
          <ToneScreen
            key="form-2"
            selected={state.tone}
            onSelect={handleSelectTone}
            onNext={goNext}
            suggested={state.suggestedTone}
          />
        )}
        {state.phase === 'form' && state.step === 3 && (
          <VisualScreen
            key="form-3"
            selected={state.visual}
            onSelect={handleSelectVisual}
            onNext={goNext}
            suggested={state.suggestedVisual}
          />
        )}

        {state.phase === 'summary' && (
          <SummaryScreen
            state={state}
            missing={missingRequired(state)}
            onEdit={handleEditFromSummary}
            onGenerate={handleGenerate}
          />
        )}

        {state.phase === 'generating' && (
          <GeneratingOverlay
            activeStep={activeStep}
            completedSteps={completedSteps}
            language={(state.language || 'sq') as LangKey}
            error={genError}
            onRetry={handleGenerate}
          />
        )}

        {state.phase === 'preview' && theme && (
          <PreviewScreen
            theme={theme}
            subdomain={subdomain}
            businessName={state.businessName.trim() || businessName}
            city={state.city}
            applying={applying}
            applyError={applyError}
            onRegenerate={handleRegenerate}
            onApply={handleApply}
          />
        )}
      </main>
    </div>
  );
}
