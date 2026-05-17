'use client';

/**
 * Small "Sugjeruar nga Liki" pill that floats over the pre-selected card
 * on language/tone/visual screens. Disappears when the user picks a
 * different option (the parent strips the prop).
 */

export function SuggestionBadge() {
  return (
    <span className="li-card-badge" aria-label="Sugjeruar nga Liki">
      <span aria-hidden>💡</span> Sugjeruar
    </span>
  );
}
