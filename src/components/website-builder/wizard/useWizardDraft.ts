'use client';

import { useEffect, useRef, useState } from 'react';

// Bumping this suffix invalidates older drafts cleanly when the wizard schema
// changes. Old keys are never read; the prompt just won't appear.
const STORAGE_KEY = 'lokalweb_wizard_draft_v1';
const SAVE_DEBOUNCE_MS = 300;

export type WizardDraftPayload = {
  state: unknown;
  step: number;
};

export function readDraft(): WizardDraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.step !== 'number') return null;
    return parsed as WizardDraftPayload;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// Debounced auto-save. The hook never reads — call readDraft() once at mount
// to decide whether to prompt the user. After the prompt is resolved, the
// caller flips `enabled` on so subsequent state changes start persisting.
export function useDraftAutoSave(payload: WizardDraftPayload, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch { /* quota / disabled storage — silent */ }
    }, SAVE_DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [payload, enabled]);
}

// Returns { hasDraft, decided, restore, discard } — the wizard mounts, calls
// this once, and renders a modal until `decided` is true.
export function useDraftPrompt() {
  const [hasDraft, setHasDraft] = useState(false);
  const [decided, setDecided] = useState(true);
  const [draft, setDraft] = useState<WizardDraftPayload | null>(null);

  useEffect(() => {
    const found = readDraft();
    if (found) {
      setHasDraft(true);
      setDecided(false);
      setDraft(found);
    }
  }, []);

  return {
    hasDraft,
    decided,
    draft,
    restore: () => { setDecided(true); },
    discard: () => { clearDraft(); setDecided(true); setDraft(null); },
  };
}
