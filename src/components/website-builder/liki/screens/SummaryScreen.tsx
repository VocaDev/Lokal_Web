'use client';

/**
 * Final review screen — shows all 9 answers, each clickable to jump back to
 * the screen that owns it. Required-but-missing fields render in the
 * destructive colour and block the generate button. Optional empty fields
 * (uniqueness, services) render with an italic "— e kalova —" placeholder.
 */

import type { LikiState, Phase } from '../state';
import { REQUIRED_FIELDS } from '../state';
import {
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  VISUAL_OPTIONS,
  type LangKey,
  type ToneKey,
  type VisualKey,
} from '../mappings';
import { ChatBubble } from '../components/ChatBubble';

type Row = {
  key: keyof LikiState;
  label: string;
  phase: Phase;
  step: number;
};

const ROWS: Row[] = [
  { key: 'businessName',  label: 'Biznesi',               phase: 'chat', step: 0 },
  { key: 'businessType',  label: 'Lloji',                 phase: 'chat', step: 1 },
  { key: 'city',          label: 'Lokacioni',             phase: 'chat', step: 2 },
  { key: 'uniqueness',    label: 'Çfarë e bën ndryshe',   phase: 'chat', step: 3 },
  { key: 'description',   label: 'Përshkrimi',            phase: 'chat', step: 4 },
  { key: 'servicesRaw',   label: 'Shërbimet',             phase: 'form', step: 0 },
  { key: 'language',      label: 'Gjuha',                 phase: 'form', step: 1 },
  { key: 'tone',          label: 'Toni',                  phase: 'form', step: 2 },
  { key: 'visual',        label: 'Stili vizual',          phase: 'form', step: 3 },
];

const REQUIRED_SET = new Set<keyof LikiState>(REQUIRED_FIELDS);

type Props = {
  state: LikiState;
  missing: Array<keyof LikiState>;
  onEdit: (phase: Phase, step: number) => void;
  onGenerate: () => void;
};

export function SummaryScreen({ state, missing, onEdit, onGenerate }: Props) {
  const missingSet = new Set(missing);
  const canGenerate = missing.length === 0;

  return (
    <section className="li-screen">
      <ChatBubble
        lineHtml="Ja gjithçka që mbajta mend. Kliko mbi cilëndo për ta ndryshuar."
        questionHtml="Le ta <span class='accent'>kontrollojmë</span> bashkë."
      />
      <div className="li-connector" />

      <div className="li-t-summary" style={{ width: '100%', maxWidth: 600 }}>
        {ROWS.map((row) => {
          const rawValue = state[row.key];
          const value = typeof rawValue === 'string' ? rawValue.trim() : '';
          const isRequired = REQUIRED_SET.has(row.key);
          const isMissing = missingSet.has(row.key);
          const displayValue = formatValue(row.key, value);

          return (
            <button
              key={row.key}
              type="button"
              className={`li-ts-row li-editable${isMissing ? ' li-missing' : ''}`}
              onClick={() => onEdit(row.phase, row.step)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: 'inherit',
                font: 'inherit',
                color: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div className="li-ts-label">{row.label}</div>
              <div className="li-ts-value">
                {displayValue ?? (
                  isRequired
                    ? <em>— mungon —</em>
                    : <em>— e kalova —</em>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="li-actions" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="li-btn-primary"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          Gjenero faqen ✨
        </button>
      </div>
      {!canGenerate && (
        <p
          className="li-line"
          style={{ marginTop: 14, textAlign: 'center', maxWidth: 480 }}
        >
          Klik mbi rreshtat e theksuar për t&apos;i plotësuar.
        </p>
      )}
    </section>
  );
}

function formatValue(key: keyof LikiState, raw: string): string | null {
  if (!raw) return null;
  if (key === 'language') {
    const opt = LANGUAGE_OPTIONS.find((o) => o.id === (raw as LangKey));
    return opt ? `${opt.flag} ${opt.label}` : raw;
  }
  if (key === 'tone') {
    const opt = TONE_OPTIONS.find((o) => o.id === (raw as ToneKey));
    return opt ? opt.label : raw;
  }
  if (key === 'visual') {
    const opt = VISUAL_OPTIONS.find((o) => o.id === (raw as VisualKey));
    return opt ? opt.label : raw;
  }
  // Truncate long free-text values so the summary stays compact.
  if (raw.length > 140) return raw.slice(0, 139).trimEnd() + '…';
  return raw;
}
