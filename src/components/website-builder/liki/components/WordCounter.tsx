'use client';

import { countWords, WORD_COUNTER_GOOD_THRESHOLD } from '../mappings';

type Props = {
  text: string;
  hint?: string;
};

export function WordCounter({ text, hint }: Props) {
  const n = countWords(text);
  const good = n >= WORD_COUNTER_GOOD_THRESHOLD;
  return (
    <div className="li-reply-meta">
      <span>{hint ?? 'Sa më shumë detaje, aq më e mirë faqja'}</span>
      <span className={`li-word-count${good ? ' li-good' : ''}`}>{n} fjalë</span>
    </div>
  );
}
