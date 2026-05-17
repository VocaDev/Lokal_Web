'use client';

/**
 * Unified Liki bubble: avatar "tab" floating on top-left, warm line + question
 * inside one cohesive container. The line and question accept a small HTML
 * subset (<span class="accent">, <strong>) because the static copy in
 * mappings.tsx embeds gradient-coloured words inline. User-typed values
 * (e.g. businessName interpolated into the second question's line) are
 * escapeHtml()'d at the call site.
 *
 * `thinking` makes the floating dot pulse for the first ~900ms of each new
 * screen so the avatar feels alive when the question appears.
 */

import { useEffect, useState } from 'react';

type Props = {
  lineHtml: string;
  questionHtml: string;
};

export function ChatBubble({ lineHtml, questionHtml }: Props) {
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 900);
    return () => clearTimeout(t);
  }, [lineHtml, questionHtml]);

  return (
    <div className="li-bubble">
      <div className={`li-tab${thinking ? ' li-thinking' : ''}`}>
        <span className="li-tab-dot" />
        <span className="li-tab-name">Liki</span>
      </div>
      <p
        className="li-line"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: lineHtml }}
      />
      <h1
        className="li-question"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: questionHtml }}
      />
    </div>
  );
}
