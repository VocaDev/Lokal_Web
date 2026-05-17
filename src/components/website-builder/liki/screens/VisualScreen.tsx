'use client';

import { useState } from 'react';
import { ChatBubble } from '../components/ChatBubble';
import { CardPicker } from '../components/CardPicker';
import { VISUAL_OPTIONS, type VisualKey } from '../mappings';

const AUTO_ADVANCE_MS = 350;

type Props = {
  selected: VisualKey | '';
  onSelect: (value: VisualKey) => void;
  onNext: () => void;
  suggested?: VisualKey;
};

export function VisualScreen({ selected, onSelect, onNext, suggested }: Props) {
  const [pending, setPending] = useState(false);

  function handlePick(id: VisualKey) {
    if (pending) return;
    onSelect(id);
    setPending(true);
    setTimeout(() => onNext(), AUTO_ADVANCE_MS);
  }

  return (
    <section className="li-screen">
      <ChatBubble
        lineHtml="E fundit — pjesa vizuale. Çdo stil ka karakter të vetin."
        questionHtml="Cili <span class='accent'>stil vizual</span> të përshtatet?"
      />
      <div className="li-connector" />
      <CardPicker
        options={VISUAL_OPTIONS}
        selected={selected}
        onSelect={handlePick}
        layout="cols-3"
        ariaLabel="Zgjedhja e stilit vizual"
        suggested={suggested}
      />
    </section>
  );
}
