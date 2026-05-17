'use client';

/**
 * Fixed top bar — Liki avatar, name, segmented progress, back, optional restart.
 * Restart-button visibility matches the legacy Wizard behavior (always rendered,
 * confirms before resetting).
 */

type Props = {
  current: number;
  total: number;
  onBack: () => void;
  onRestart: () => void;
  backDisabled: boolean;
  showRestart: boolean;
};

export function Topbar({ current, total, onBack, onRestart, backDisabled, showRestart }: Props) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <header className="li-topbar">
      <div className="li-topbar-left">
        <div className="li-tb-avatar" />
        <span className="li-tb-name">Liki</span>
      </div>
      <div className="li-progress-area">
        <div className="li-progress-meta">
          <span>Pyetja {current + 1} nga {total}</span>
          <span>{pct}%</span>
        </div>
        <div className="li-progress-track">
          <div className="li-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="li-topbar-right">
        {showRestart && (
          <button
            type="button"
            className="li-restart-btn"
            onClick={onRestart}
            aria-label="Fillo nga e para"
          >
            <span>Fillo nga e para</span>
          </button>
        )}
        <button
          type="button"
          className="li-back-btn"
          onClick={onBack}
          disabled={backDisabled}
          aria-label="Mbrapa"
        >
          ←
        </button>
      </div>
    </header>
  );
}
