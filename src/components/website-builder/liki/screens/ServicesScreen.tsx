'use client';

/**
 * Services screen — one big free-text textarea, no structured rows. Phase 1
 * passes the raw string to /api/generate-variants as `userProvidedServices`;
 * a minimal split parser in mappings.tsx fills the placeholder `wizardServices`
 * array. Phase 5 replaces the parser with Haiku extraction.
 *
 * Enter does NOT submit here (unlike the chat textareas) because services is
 * naturally multi-line — users list one per line. Submit is via the explicit
 * "Vazhdo" button.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { ChatBubble } from '../components/ChatBubble';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
  extracting?: boolean;
};

export function ServicesScreen({ value, onChange, onNext, onSkip, extracting = false }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 280);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(Math.max(el.scrollHeight, 120), 280) + 'px';
  }, [value]);

  return (
    <section className="li-screen">
      <ChatBubble
        lineHtml="Tani më thuaj çfarë ofron — shkruaj lirshëm, ashtu si ti i bën gjërat."
        questionHtml="Cilat <span class='accent'>shërbime</span> ofron?"
      />
      <div className="li-connector" />
      <div className="li-reply-zone">
        <div className="li-input-shell">
          <textarea
            ref={ref}
            className="li-text-input"
            rows={4}
            placeholder="P.sh.&#10;Prerje flokësh — 5€&#10;Larje + stilim&#10;Mjekër + krehje"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Cilat shërbime ofron?"
            style={{ minHeight: 120 }}
          />
        </div>
        <div className="li-reply-meta">
          <span>Një shërbim për rresht ose ndarë me presje</span>
          <span />
        </div>
        <div className="li-actions">
          <button type="button" className="li-mini-btn" onClick={onSkip} disabled={extracting}>
            Kalo këtë
          </button>
          <button
            type="button"
            className="li-btn-primary"
            style={{ marginLeft: 'auto', padding: '10px 22px', fontSize: 14 }}
            onClick={onNext}
            disabled={extracting}
          >
            {extracting ? 'Po nxjerr shërbimet…' : 'Vazhdo →'}
          </button>
        </div>
      </div>
    </section>
  );
}
