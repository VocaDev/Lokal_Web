'use client';

/**
 * Input shell — text input or auto-growing textarea, both with the gradient
 * send button embedded inside the rounded border. Enter submits in both
 * cases; Shift+Enter inserts a newline in textareas.
 *
 * Auto-focus on mount/step-change matches the prototype's 280ms delay so the
 * caret appears after the screen-enter animation settles. Escape bubbles up
 * to the global key handler in Liki.tsx.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

type Props = {
  type: 'text' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  canSubmit?: boolean;
  ariaLabel?: string;
  showSpinner?: boolean;
};

export function InputShell({
  type,
  value,
  onChange,
  onSubmit,
  placeholder,
  canSubmit = true,
  ariaLabel,
  showSpinner = false,
}: Props) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const len = el.value.length;
          try { el.setSelectionRange(len, len); } catch { /* noop */ }
        }
      }
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (type !== 'textarea') return;
    const el = ref.current as HTMLTextAreaElement | null;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value, type]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="li-input-shell">
      {type === 'text' ? (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          className="li-text-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="off"
          aria-label={ariaLabel}
        />
      ) : (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="li-text-input"
          rows={1}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          aria-label={ariaLabel}
        />
      )}
      <button
        type="button"
        className="li-send-btn"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="Dërgo"
      >
        {showSpinner ? (
          <span className="li-send-spinner" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
