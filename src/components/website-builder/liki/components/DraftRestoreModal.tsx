'use client';

type Props = {
  onRestore: () => void;
  onDiscard: () => void;
};

export function DraftRestoreModal({ onRestore, onDiscard }: Props) {
  return (
    <div className="li-modal-backdrop" role="dialog" aria-modal="true">
      <div className="li-modal">
        <div className="li-modal-avatar" aria-hidden />
        <h2 className="li-modal-title">Kemi gjetur një draft</h2>
        <p className="li-modal-body">
          Kishe filluar të ndërtoje faqen më parë. A do të vazhdojmë nga aty,
          apo të fillojmë nga e para?
        </p>
        <div className="li-modal-actions">
          <button type="button" className="li-btn-primary" onClick={onRestore}>
            Po, vazhdo
          </button>
          <button type="button" className="li-btn-ghost" onClick={onDiscard}>
            Jo, fillo nga e para
          </button>
        </div>
      </div>
    </div>
  );
}
