'use client';

/**
 * Follow-up bubble shown when Haiku judges the user's answer as "weak" and
 * generates a more targeted question. Renders below the input, above the
 * action row. The user types the answer to the follow-up in the same input
 * (the parent screen appends it to a separate state field — original answer
 * isn't lost).
 */

type Props = {
  text: string;
};

export function FollowupBubble({ text }: Props) {
  return (
    <div className="li-followup" role="note">
      <span className="li-followup-icon" aria-hidden>💭</span>
      <span>{text}</span>
    </div>
  );
}
