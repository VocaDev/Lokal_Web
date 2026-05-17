'use client';

import { useEffect, useRef, useState } from 'react';

// Bumping this suffix invalidates older drafts cleanly when the Liki state
// schema changes. Old keys are never read; the restore prompt just won't
// appear. Drafts from the legacy Wizard (`lokalweb_wizard_draft_v1`) are
// not migrated — they live under a different key and are abandoned.
const STORAGE_KEY = 'lokalweb_liki_draft_v1';
const SAVE_DEBOUNCE_MS = 300;

export type LikiDraftPayload = {
  state: unknown;
};

export function readDraft(): LikiDraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as LikiDraftPayload;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// Debounced auto-save. Never reads — the caller invokes readDraft() once at
// mount to decide whether to prompt. After the prompt is resolved, `enabled`
// flips on and subsequent state changes persist.
export function useDraftAutoSave(payload: LikiDraftPayload, enabled: boolean) {
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

export function useDraftPrompt() {
  const [hasDraft, setHasDraft] = useState(false);
  const [decided, setDecided] = useState(true);
  const [draft, setDraft] = useState<LikiDraftPayload | null>(null);

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
