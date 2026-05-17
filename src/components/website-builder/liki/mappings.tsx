/**
 * Static data + helpers for the Liki conversational wizard.
 *
 * Extracted verbatim from the legacy Wizard.tsx so the data pipeline contract
 * (industry chip enum, archetype keys, tone enum, generation substeps) stays
 * identical after the wizard swap. Phase 1 of Liki is UI-only: no AI calls,
 * no smart normalization beyond what already exists here.
 */

import type { ArchetypeKey } from '@/lib/archetypes';
import type { WizardInput } from '@/lib/types/customization';
import type { ProgressStep } from '@/lib/ai-progress';

export type VisualKey = 'warm' | 'dark' | 'trust' | 'modern' | 'editorial' | 'family';
export type ToneKey = 'miqesor' | 'profesional' | 'bisedor' | 'i-fuqishem';
export type LangKey = 'sq' | 'en';

// 1:1 mapping kept identical to the prototype's 6-card visual options. Two
// extra archetypes (`studioja`, `elegant-rafinuar`) remain valid downstream
// for the server's `'ai'` decider but are not surfaced as user-pickable cards.
export const VISUAL_TO_ARCHETYPE: Record<VisualKey, ArchetypeKey> = {
  warm: 'i-ngrohte',
  dark: 'erresi-karakter',
  trust: 'besim-qartesi',
  modern: 'gjalleri-moderne',
  editorial: 'leter-stil',
  family: 'familjar-mirprites',
};

export const TONE_TO_INPUT: Record<ToneKey, WizardInput['tone']> = {
  miqesor: 'friendly',
  profesional: 'professional',
  bisedor: 'casual',
  'i-fuqishem': 'bold',
};

export const SUBSTEPS: { step: ProgressStep; labelSq: string; labelEn: string }[] = [
  { step: 'analyzing_business', labelSq: 'Po analizojmë biznesin tënd', labelEn: 'Analyzing your business' },
  { step: 'building_brief',     labelSq: 'Po krijojmë strategjinë',     labelEn: 'Building the strategy' },
  { step: 'designing_theme',    labelSq: 'Po dizajnojmë temën',         labelEn: 'Designing the theme' },
  { step: 'writing_copy',       labelSq: 'Po shkruajmë përmbajtjen',    labelEn: 'Writing the content' },
  { step: 'finalizing',         labelSq: 'Po e mbledhim faqen',         labelEn: 'Finalizing the page' },
];

export const TYPE_SUGGESTIONS = [
  'Berber', 'Restorant', 'Klinikë dentare', 'Sallon bukurie',
  'Rrobaqepëse', 'Palestër', 'Dyqan',
];

export const VISUAL_OPTIONS: Array<{ id: VisualKey; label: string; desc: string; preview: string }> = [
  { id: 'warm',      label: 'I Ngrohtë',         desc: 'Tradicionale, familjare, drurë e krem',
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

export const TONE_OPTIONS: Array<{ id: ToneKey; label: string; desc: string }> = [
  { id: 'miqesor',     label: 'Miqësor',     desc: "I ngrohtë, i afërt, si t'i flasësh një shoku" },
  { id: 'profesional', label: 'Profesional', desc: 'Serioz, formal, fokusuar në kompetencë' },
  { id: 'bisedor',     label: 'Bisedor',     desc: "Casual, me regjistër kosovar (tash, n', çka)" },
  { id: 'i-fuqishem',  label: 'I fuqishëm',  desc: 'I drejtpërdrejtë, energjik, pa lulëzime' },
];

export const LANGUAGE_OPTIONS: Array<{ id: LangKey; label: string; desc: string; flag: string }> = [
  { id: 'sq', label: 'Shqip',   desc: 'Faqja shkruhet në shqip',    flag: '🇦🇱' },
  { id: 'en', label: 'English', desc: 'Page is written in English', flag: '🇬🇧' },
];

// Chat phase question content. `line`/`q` use a small HTML subset (<span
// class="accent">, <strong>) rendered via dangerouslySetInnerHTML in
// ChatBubble — the content here is hardcoded, user-typed values flow through
// `escapeHtml()` before substitution.
export type ChatKey = 'businessName' | 'businessType' | 'city' | 'uniqueness' | 'description';

export type ChatQuestion = {
  key: ChatKey;
  line: (s: { businessName: string }) => string;
  q: string;
  suggestion: string | null;
  placeholder: string;
  type: 'text' | 'textarea';
};

export const CHAT_QUESTIONS: ChatQuestion[] = [
  {
    key: 'businessName',
    line: () => "Përshëndetje! Unë jam <span class='accent'>Liki</span> 👋 Do ta ndërtojmë faqen tënde bashkë — pa nguti, pa terma të vështira.",
    q: "Si <span class='accent'>quhet</span> biznesi yt?",
    suggestion: null,
    placeholder: 'P.sh. Berberhana e Adem-it',
    type: 'text',
  },
  {
    key: 'businessType',
    line: (s) => `<strong>${escapeHtml(s.businessName?.trim() || 'Mirë')}</strong> — më pëlqen. Tash më ndihmo ta kuptoj pak më mirë.`,
    q: "Çfarë <span class='accent'>pune</span> bën?",
    suggestion: 'Vetëm shkruaj thjesht: berber, restorant, klinikë dentare, rrobaqepëse, dyqan...',
    placeholder: 'P.sh. berber',
    type: 'text',
  },
  {
    key: 'city',
    line: () => 'Shkëlqyeshëm. Klientët duhet të dinë ku të të gjejnë.',
    q: "Ku <span class='accent'>ndodhesh</span>?",
    suggestion: null,
    placeholder: 'P.sh. Prishtinë, te Shadërvani',
    type: 'text',
  },
  {
    key: 'uniqueness',
    line: () => 'Tani vjen pjesa që e dua më shumë. Mos shkruaj si reklamë — fol me mua sikur po ia tregon një shoku te kafja.',
    q: "Pse vijnë klientët <span class='accent'>pikërisht te ti</span>?",
    suggestion: 'Mendo: çfarë bën më mirë se të tjerët? Je më i shpejtë? I njeh me emër? Çmim më i mirë?',
    placeholder: 'P.sh. Punoj vetëm me termin, pa pritje. Çdo klient e ka kohën e vet.',
    type: 'textarea',
  },
  {
    key: 'description',
    line: () => "E fundit nga unë, pastaj kalojmë te pjesa e shpejtë. Imagjino dikë që s'e ka dëgjuar kurrë biznesin tënd.",
    q: "Si do t'ia <span class='accent'>përshkruaje</span>?",
    suggestion: '2–4 fjali mjaftojnë. Çfarë bën, kush vjen te ti, si i bën gjërat.',
    placeholder: "P.sh. Berber n'lagjen Lakrishte. Jam vetëm unë, pa staf, pa pritje.",
    type: 'textarea',
  },
];

// Shown inline under description input when <30 chars. Phase 2 will turn this
// threshold into a Haiku-trigger signal; Phase 1 just nudges, never blocks.
export const DESCRIPTION_NUDGE = "Edhe pak detaje do më ndihmonin t'i bëj drejtësi biznesit tënd";

export const DESCRIPTION_SOFT_THRESHOLD = 30;
export const WORD_COUNTER_GOOD_THRESHOLD = 15;

// =================================================================
// Helpers
// =================================================================

// Best-effort normalization of free-text industry → canonical chip enum the
// brand-brief prompt expects. Anything unrecognized falls through (server's
// normalizeGenerationIndustry handles the rest).
export function inferIndustryChip(typeText: string): string | undefined {
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

export function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

// Phase-1 placeholder. Splits raw user text on commas/newlines into discrete
// service entries with `name` only. Phase 5 replaces this with Haiku
// extraction that pulls names, prices, and durations out of free prose.
export function parseServicesRaw(text: string): Array<{ name: string }> {
  if (!text?.trim()) return [];
  return text
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 80)
    .slice(0, 50)
    .map(name => ({ name }));
}

export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, c => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
