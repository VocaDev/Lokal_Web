'use client';

/**
 * Generic single-select card grid used by language/tone/visual screens.
 * `auto-advance` is owned by the parent screen so each can pick its own
 * delay or skip it entirely (e.g. if we ever want a "confirm" step).
 *
 * `suggested` (Phase 3): id Liki picked from the chat answers. When set AND
 * differs from `selected`, the matching card shows a SuggestionBadge. The
 * parent is responsible for auto-pre-selecting (if desired) before render.
 */

import { SuggestionBadge } from './SuggestionBadge';

type Option<T extends string> = {
  id: T;
  label: string;
  desc: string;
  preview?: string;
  flag?: string;
};

type Props<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  selected: T | '';
  onSelect: (id: T) => void;
  layout: 'cols-2' | 'cols-3' | 'cols-2x2';
  ariaLabel?: string;
  suggested?: T;
};

export function CardPicker<T extends string>({
  options,
  selected,
  onSelect,
  layout,
  ariaLabel,
  suggested,
}: Props<T>) {
  const layoutClass =
    layout === 'cols-2'   ? 'li-grid-2'
    : layout === 'cols-3' ? 'li-grid-3'
    : 'li-grid-4';

  return (
    <div
      className={`li-card-grid ${layoutClass}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isSel = selected === opt.id;
        const showBadge = suggested === opt.id && !isSel;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSel}
            className={`li-card${isSel ? ' li-selected' : ''}`}
            onClick={() => onSelect(opt.id)}
          >
            {showBadge && <SuggestionBadge />}
            {opt.preview && (
              <div
                className="li-card-preview"
                style={{ background: opt.preview }}
                aria-hidden
              />
            )}
            {opt.flag && (
              <div className="li-card-flag" aria-hidden>{opt.flag}</div>
            )}
            <div className="li-card-label">{opt.label}</div>
            <div className="li-card-desc">{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
