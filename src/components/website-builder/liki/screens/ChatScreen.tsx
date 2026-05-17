'use client';

/**
 * One component, five configurations — reads CHAT_QUESTIONS[step] and renders
 * the bubble + input + word counter / nudge / suggestion / type chips for
 * whichever conversational question is active.
 *
 * Phase 2-4 additions:
 *   - When a follow-up is active for the current question (uniqueness or
 *     description), FollowupBubble shows below the connector and the input
 *     is rebound to the `*Followup` state field. The original answer stays
 *     in state for projectInput concatenation.
 *   - When `state.uniquenessChoices` is set on Q4, ChoicesPicker renders
 *     below the input. Picking sets the followup answer and advances.
 *   - The Send button shows a spinner when `state.evaluating` is true.
 */

import { useState } from 'react';
import {
  CHAT_QUESTIONS,
  DESCRIPTION_SOFT_THRESHOLD,
  type ChatKey,
  type ChatQuestion,
} from '../mappings';
import type { LikiState, TextField } from '../state';
import { ChatBubble } from '../components/ChatBubble';
import { InputShell } from '../components/InputShell';
import { WordCounter } from '../components/WordCounter';
import { DescriptionNudge } from '../components/DescriptionNudge';
import { ChipSuggestions } from '../components/ChipSuggestions';
import { FollowupBubble } from '../components/FollowupBubble';
import { ChoicesPicker } from '../components/ChoicesPicker';

type Props = {
  state: LikiState;
  step: number;
  onFieldChange: (key: TextField, value: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onPickChoice: (choice: string) => void;
  onCustomizeChoices: () => void;
};

const CHAT_TO_TEXT_FIELD: Record<ChatKey, TextField> = {
  businessName: 'businessName',
  businessType: 'businessType',
  city: 'city',
  uniqueness: 'uniqueness',
  description: 'description',
};

export function ChatScreen({
  state,
  step,
  onFieldChange,
  onNext,
  onSkip,
  onPickChoice,
  onCustomizeChoices,
}: Props) {
  const q: ChatQuestion = CHAT_QUESTIONS[step];

  const [suggestionUsed, setSuggestionUsed] = useState(false);

  // Phase 2: which field does the input bind to? When a follow-up is active
  // for this question, point at the *Followup field so the original answer
  // is preserved.
  const followupActive =
    (q.key === 'uniqueness' && state.uniquenessFollowupQuestion !== '') ||
    (q.key === 'description' && state.descriptionFollowupQuestion !== '');

  const activeField: TextField = followupActive
    ? (q.key === 'uniqueness' ? 'uniquenessFollowup' : 'descriptionFollowup')
    : CHAT_TO_TEXT_FIELD[q.key];

  const activeValue: string =
    followupActive
      ? (q.key === 'uniqueness' ? state.uniquenessFollowup : state.descriptionFollowup)
      : state[q.key];

  const followupText =
    q.key === 'uniqueness' ? state.uniquenessFollowupQuestion
    : q.key === 'description' ? state.descriptionFollowupQuestion
    : '';

  const lineHtml = q.line({ businessName: state.businessName });
  const questionHtml = q.q;

  const isDescription = q.key === 'description';
  // Soft nudge only on the original answer — follow-up answers are expected
  // to be brief and targeted.
  const showNudge =
    isDescription &&
    !followupActive &&
    activeValue.trim().length > 0 &&
    activeValue.trim().length < DESCRIPTION_SOFT_THRESHOLD;

  const showTypeChips = q.key === 'businessType';

  const showChoices =
    q.key === 'uniqueness' &&
    state.uniquenessChoices.length > 0;

  return (
    <section className="li-screen" key={step}>
      <ChatBubble lineHtml={lineHtml} questionHtml={questionHtml} />
      <div className="li-connector" />

      {followupActive && <FollowupBubble text={followupText} />}

      <div className="li-reply-zone">
        <InputShell
          // remount on followup-active flip so autofocus + value sync correctly
          key={followupActive ? `${q.key}-fu` : q.key}
          type={q.type}
          value={activeValue}
          onChange={(v) => onFieldChange(activeField, v)}
          onSubmit={onNext}
          placeholder={followupActive ? 'Shkruaj përgjigjen tënde…' : q.placeholder}
          ariaLabel={stripHtml(q.q)}
          canSubmit={!state.evaluating}
          showSpinner={state.evaluating}
        />

        {q.type === 'textarea' && <WordCounter text={activeValue} />}

        {showNudge && <DescriptionNudge />}

        {showChoices && (
          <ChoicesPicker
            choices={state.uniquenessChoices}
            onPick={onPickChoice}
            onCustomize={onCustomizeChoices}
          />
        )}

        {q.suggestion && !followupActive && (
          <div className="li-suggestion">
            <button
              type="button"
              className="li-suggestion-chip"
              data-used={suggestionUsed ? 'true' : 'false'}
              onClick={() => setSuggestionUsed(true)}
            >
              <span className="li-suggestion-bulb" aria-hidden>💡</span>
              <span>{q.suggestion}</span>
            </button>
          </div>
        )}

        {showTypeChips && (
          <ChipSuggestions
            onPick={(chip) => onFieldChange('businessType', chip)}
          />
        )}

        <div className="li-actions">
          <button type="button" className="li-mini-btn" onClick={onSkip}>
            Kalo këtë
          </button>
          <span className="li-kbd-hint">
            Shtyp <span className="li-kbd">Enter</span> kur je gati
          </span>
        </div>
      </div>
    </section>
  );
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}
