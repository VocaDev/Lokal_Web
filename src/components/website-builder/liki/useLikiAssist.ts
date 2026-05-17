'use client';

/**
 * Single hook for all three Liki Haiku endpoints. Each call has the same
 * shape: 8-second timeout, graceful fallback on any failure (network,
 * server error, abort), no exceptions thrown to the caller. Liki's flow
 * never blocks on AI — if Haiku is slow or down, we degrade quietly.
 */

import { useCallback } from 'react';

const TIMEOUT_MS = 8000;

export type EvaluateInput = {
  question: 'uniqueness' | 'description';
  answer: string;
  followupAnswer?: string;
  industryChip?: string;
  industryText: string;
  businessName: string;
  language: 'sq' | 'en';
};

export type EvaluateOutput = {
  quality: 'good' | 'weak';
  followup: string | null;
  offer_choices: boolean;
  choices: string[];
};

export type SuggestInput = {
  businessName: string;
  industryText: string;
  industryChip?: string;
  city: string;
  uniqueness: string;
  businessDescription: string;
  detectedLanguage: 'sq' | 'en' | 'mixed';
};

export type SuggestOutput = {
  language: 'sq' | 'en' | null;
  tone: 'miqesor' | 'profesional' | 'bisedor' | 'i-fuqishem' | null;
  visual: 'warm' | 'dark' | 'trust' | 'modern' | 'editorial' | 'family' | null;
};

export type ExtractServicesInput = {
  servicesRaw: string;
  industryChip?: string;
  industryText: string;
  language: 'sq' | 'en';
};

export type ExtractServicesOutput = {
  services: Array<{ name: string; price?: string; durationMinutes?: number }> | null;
};

const EVALUATE_FALLBACK: EvaluateOutput = { quality: 'good', followup: null, offer_choices: false, choices: [] };
const SUGGEST_FALLBACK: SuggestOutput = { language: null, tone: null, visual: null };
const EXTRACT_FALLBACK: ExtractServicesOutput = { services: null };

export function useLikiAssist() {
  const call = useCallback(async <T,>(endpoint: string, payload: unknown, fallback: T): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`/api/liki/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) return fallback;
      const json = await res.json();
      return (json && typeof json === 'object') ? (json as T) : fallback;
    } catch {
      return fallback;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  return {
    evaluate: (payload: EvaluateInput) => call<EvaluateOutput>('evaluate-answer', payload, EVALUATE_FALLBACK),
    suggest: (payload: SuggestInput) => call<SuggestOutput>('suggest', payload, SUGGEST_FALLBACK),
    extractServices: (payload: ExtractServicesInput) => call<ExtractServicesOutput>('extract-services', payload, EXTRACT_FALLBACK),
  };
}
