'use client';

/**
 * Drop-style transition that plays between the conversational phase and the
 * form phase. Liki "drops in" with the summary of the 5 chat answers and
 * gives the user one last chance to amend before moving on to the quick
 * form questions. Empty (skipped) answers render with an italic placeholder.
 */

import type { LikiState } from '../state';

type Props = {
  state: LikiState;
  onContinue: () => void;
  onEdit: () => void;
};

const ROWS: Array<{ label: string; key: 'businessName' | 'businessType' | 'city' | 'uniqueness' | 'description' }> = [
  { label: 'Biznesi',              key: 'businessName' },
  { label: 'Lloji',                key: 'businessType' },
  { label: 'Lokacioni',            key: 'city' },
  { label: 'Çfarë e bën ndryshe',  key: 'uniqueness' },
  { label: 'Përshkrimi',           key: 'description' },
];

export function DropTransition({ state, onContinue, onEdit }: Props) {
  return (
    <div className="li-transition" role="dialog" aria-label="Përmbledhje e bisedës">
      <div className="li-t-card">
        <div className="li-t-avatar" aria-hidden />
        <h1 className="li-t-title">Mrekulli! Të <em>kuptova</em>.</h1>
        <p className="li-t-sub">
          Ja çfarë mbajta mend nga biseda jonë. Tani le t&apos;i mbarojmë edhe pak gjëra praktike — premtoj, është më shpejt.
        </p>
        <div className="li-t-summary">
          {ROWS.map(({ label, key }) => {
            const v = state[key]?.trim();
            return (
              <div className="li-ts-row" key={key}>
                <div className="li-ts-label">{label}</div>
                <div className="li-ts-value">
                  {v ? truncate(v, 120) : <em>— e kalova —</em>}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <button type="button" className="li-btn-primary" onClick={onContinue}>
            Vazhdojmë →
          </button>
          <button type="button" className="li-btn-ghost" onClick={onEdit}>
            Prit, ndrysho diçka
          </button>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}
