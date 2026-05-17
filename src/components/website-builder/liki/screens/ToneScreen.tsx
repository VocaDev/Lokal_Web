'use client';

import { useState } from 'react';
import { ChatBubble } from '../components/ChatBubble';
import { CardPicker } from '../components/CardPicker';
import { TONE_OPTIONS, type ToneKey } from '../mappings';

const AUTO_ADVANCE_MS = 350;

type Props = {
  selected: ToneKey | '';
  onSelect: (value: ToneKey) => void;
  onNext: () => void;
  suggested?: ToneKey;
};

export function ToneScreen({ selected, onSelect, onNext, suggested }: Props) {
  const [pending, setPending] = useState(false);

  function handlePick(id: ToneKey) {
    if (pending) return;
    onSelect(id);
    setPending(true);
    setTimeout(() => onNext(), AUTO_ADVANCE_MS);
  }

  return (
    <section className="li-screen">
      <ChatBubble
        lineHtml="Si do të <strong>flasë</strong> faqja jote?"
        questionHtml="Cili <span class='accent'>ton</span> të përshtatet?"
      />
      <div className="li-connector" />
      <CardPicker
        options={TONE_OPTIONS}
        selected={selected}
        onSelect={handlePick}
        layout="cols-2x2"
        ariaLabel="Zgjedhja e tonit"
        suggested={suggested}
      />
    </section>
  );
}
