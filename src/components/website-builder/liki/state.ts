/**
 * Liki state machine. Single reducer + LikiState shape used by Liki.tsx and
 * persisted to localStorage by useLikiDraft.ts.
 *
 * Phase machine:
 *   'chat'       → 5 conversational screens (step 0..4)
 *   'transition' → drop overlay with summary of chat answers
 *   'form'       → 4 form-style screens (step 0..3): services, language, tone, visual
 *   'summary'    → review all 9 answers, click any to edit
 *   'generating' → brand-brief → generate-variants pipeline runs
 *   'preview'    → existing PreviewScreen UX (reused unchanged from Wizard.tsx)
 *
 * Phase 2-5 state additions (no schema bump — drafts written before these
 * fields existed simply read `undefined` for them, which the reducer handles
 * via spreads from initialState).
 */

import type { VisualKey, ToneKey, LangKey } from './mappings';

export type Phase = 'chat' | 'transition' | 'form' | 'summary' | 'generating' | 'preview';

export type StructuredService = { name: string; price?: string; durationMinutes?: number };

export type LikiState = {
  phase: Phase;
  step: number;            // chat: 0..4, form: 0..3 (services/language/tone/visual). Other phases: ignored.
  businessName: string;
  businessType: string;
  city: string;
  uniqueness: string;
  description: string;
  servicesRaw: string;
  language: LangKey | '';
  tone: ToneKey | '';
  visual: VisualKey | '';

  // Phase 2 — follow-up flow for the two rich questions. When
  // `*FollowupQuestion` is set, the screen renders FollowupBubble and the
  // input is bound to `*Followup` (a separate string so the original answer
  // is preserved for projectInput concatenation).
  uniquenessFollowupQuestion: string;
  uniquenessFollowup: string;
  descriptionFollowupQuestion: string;
  descriptionFollowup: string;
  // Phase 4 — when the evaluator returns offer_choices=true after a 2nd weak
  // attempt on uniqueness, the API returns industry-specific options that
  // get parked here until the user picks one or dismisses them.
  uniquenessChoices: string[];
  // Loading state for the Send button on Q4/Q5 while the evaluator runs.
  evaluating: boolean;

  // Phase 3 — suggestor results, fetched in the background during transition.
  // Stay `undefined` if the call fails or hasn't returned yet; CardPicker
  // shows no badge in that case and the user picks manually.
  suggestedLanguage?: LangKey;
  suggestedTone?: ToneKey;
  suggestedVisual?: VisualKey;

  // Phase 5 — Haiku-extracted services replace the placeholder parser when
  // available. `null` (or empty) means use the parseServicesRaw fallback.
  servicesStructured?: StructuredService[];
  extractingServices: boolean;
};

export type TextField =
  | 'businessName'
  | 'businessType'
  | 'city'
  | 'uniqueness'
  | 'description'
  | 'servicesRaw'
  | 'uniquenessFollowup'
  | 'descriptionFollowup';

export type Action =
  | { type: 'FIELD'; key: TextField; value: string }
  | { type: 'SELECT_LANGUAGE'; value: LangKey }
  | { type: 'SELECT_TONE'; value: ToneKey }
  | { type: 'SELECT_VISUAL'; value: VisualKey }
  | { type: 'GOTO'; phase: Phase; step?: number }
  | { type: 'HYDRATE'; payload: LikiState }
  | { type: 'RESET'; businessName: string }
  // Phase 2
  | { type: 'SET_EVALUATING'; value: boolean }
  | { type: 'SET_FOLLOWUP_QUESTION'; field: 'uniqueness' | 'description'; text: string }
  | { type: 'CLEAR_FOLLOWUP'; field: 'uniqueness' | 'description' }
  // Phase 4
  | { type: 'SET_CHOICES'; choices: string[] }
  | { type: 'CLEAR_CHOICES' }
  // Phase 3
  | { type: 'SET_SUGGESTIONS'; language: LangKey | undefined; tone: ToneKey | undefined; visual: VisualKey | undefined }
  // Phase 5
  | { type: 'SET_SERVICES_STRUCTURED'; services: StructuredService[] | undefined }
  | { type: 'SET_EXTRACTING_SERVICES'; value: boolean };

export const CHAT_TOTAL = 5;
export const FORM_TOTAL = 4;

export function initialState(businessName: string): LikiState {
  return {
    phase: 'chat',
    step: 0,
    businessName: businessName ?? '',
    businessType: '',
    city: '',
    uniqueness: '',
    description: '',
    servicesRaw: '',
    language: '',
    tone: '',
    visual: '',
    uniquenessFollowupQuestion: '',
    uniquenessFollowup: '',
    descriptionFollowupQuestion: '',
    descriptionFollowup: '',
    uniquenessChoices: [],
    evaluating: false,
    suggestedLanguage: undefined,
    suggestedTone: undefined,
    suggestedVisual: undefined,
    servicesStructured: undefined,
    extractingServices: false,
  };
}

export function reducer(state: LikiState, action: Action): LikiState {
  switch (action.type) {
    case 'FIELD':
      return { ...state, [action.key]: action.value };
    case 'SELECT_LANGUAGE':
      return { ...state, language: action.value };
    case 'SELECT_TONE':
      return { ...state, tone: action.value };
    case 'SELECT_VISUAL':
      return { ...state, visual: action.value };
    case 'GOTO':
      return { ...state, phase: action.phase, step: action.step ?? 0 };
    case 'HYDRATE':
      // Merge incoming draft with initial state — old drafts won't have the
      // Phase 2-5 fields, so the spread keeps their defaults.
      return { ...initialState(state.businessName), ...action.payload };
    case 'RESET':
      return initialState(action.businessName);
    case 'SET_EVALUATING':
      return { ...state, evaluating: action.value };
    case 'SET_FOLLOWUP_QUESTION':
      return action.field === 'uniqueness'
        ? { ...state, uniquenessFollowupQuestion: action.text, uniquenessFollowup: '' }
        : { ...state, descriptionFollowupQuestion: action.text, descriptionFollowup: '' };
    case 'CLEAR_FOLLOWUP':
      return action.field === 'uniqueness'
        ? { ...state, uniquenessFollowupQuestion: '', uniquenessFollowup: '' }
        : { ...state, descriptionFollowupQuestion: '', descriptionFollowup: '' };
    case 'SET_CHOICES':
      return { ...state, uniquenessChoices: action.choices };
    case 'CLEAR_CHOICES':
      return { ...state, uniquenessChoices: [] };
    case 'SET_SUGGESTIONS':
      return {
        ...state,
        suggestedLanguage: action.language,
        suggestedTone: action.tone,
        suggestedVisual: action.visual,
      };
    case 'SET_SERVICES_STRUCTURED':
      return { ...state, servicesStructured: action.services };
    case 'SET_EXTRACTING_SERVICES':
      return { ...state, extractingServices: action.value };
    default:
      return state;
  }
}

export function isLikiState(v: unknown): v is LikiState {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.phase === 'string'
    && typeof o.step === 'number'
    && typeof o.businessName === 'string'
    && typeof o.businessType === 'string'
    && typeof o.city === 'string'
    && typeof o.uniqueness === 'string'
    && typeof o.description === 'string'
    && typeof o.servicesRaw === 'string'
    && (o.language === '' || o.language === 'sq' || o.language === 'en')
    && typeof o.tone === 'string'
    && typeof o.visual === 'string';
  // Phase 2-5 fields are not validated here — older drafts that lack them
  // get defaults via the HYDRATE merge in the reducer.
}

// Required fields the user must fill before "Gjenero faqen" enables.
// Mirrors SUBMIT_REQUIRED_FIELDS from the legacy Wizard.tsx for parity.
export const REQUIRED_FIELDS: Array<keyof LikiState> = [
  'businessName',
  'businessType',
  'city',
  'description',
  'language',
  'tone',
  'visual',
];

export function missingRequired(state: LikiState): Array<keyof LikiState> {
  const out: Array<keyof LikiState> = [];
  for (const key of REQUIRED_FIELDS) {
    const v = state[key];
    if (typeof v === 'string' && v.trim() === '') out.push(key);
  }
  return out;
}
