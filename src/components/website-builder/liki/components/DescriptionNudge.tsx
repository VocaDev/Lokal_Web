'use client';

import { DESCRIPTION_NUDGE } from '../mappings';

export function DescriptionNudge() {
  return (
    <div className="li-nudge" role="note">
      <span className="li-nudge-icon" aria-hidden>✨</span>
      <span>{DESCRIPTION_NUDGE}</span>
    </div>
  );
}
