'use client';

import { TYPE_SUGGESTIONS } from '../mappings';

type Props = {
  onPick: (chip: string) => void;
};

export function ChipSuggestions({ onPick }: Props) {
  return (
    <div className="li-chip-row" role="group" aria-label="Sugjerime për llojin e biznesit">
      {TYPE_SUGGESTIONS.map((chip) => (
        <button
          key={chip}
          type="button"
          className="li-type-chip"
          onClick={() => onPick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
