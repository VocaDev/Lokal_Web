'use client';

/**
 * Mjeti 2 — industry-specific options shown when Haiku flags the user as
 * stuck on the uniqueness question. The user can pick a phrased option (it
 * fills the input as their answer) or click "Diçka tjetër" to dismiss the
 * options and type their own. The "Diçka tjetër" affordance is appended
 * here so the data in industry-profiles.ts stays focused on real choices.
 */

type Props = {
  choices: string[];
  onPick: (choice: string) => void;
  onCustomize: () => void;
};

export function ChoicesPicker({ choices, onPick, onCustomize }: Props) {
  if (!choices.length) return null;
  return (
    <div className="li-choices" role="group" aria-label="Opsione për përgjigjen">
      <p className="li-choices-intro">
        Shumë biznese dallohen për një nga këto — cila të përshtatet?
      </p>
      <div className="li-choices-grid">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className="li-choice"
            onClick={() => onPick(choice)}
          >
            {choice}
          </button>
        ))}
        <button
          type="button"
          className="li-choice li-choice-custom"
          onClick={onCustomize}
        >
          Diçka tjetër <span aria-hidden>➜</span> shkruaj
        </button>
      </div>
    </div>
  );
}
