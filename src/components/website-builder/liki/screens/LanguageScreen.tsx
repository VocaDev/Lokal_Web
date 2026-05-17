'use client';

import { useState } from 'react';
import { ChatBubble } from '../components/ChatBubble';
import { CardPicker } from '../components/CardPicker';
import { LANGUAGE_OPTIONS, type LangKey } from '../mappings';

const AUTO_ADVANCE_MS = 350;

type Props = {
  selected: LangKey | '';
  onSelect: (value: LangKey) => void;
  onNext: () => void;
  suggested?: LangKey;
};

export function LanguageScreen({ selected, onSelect, onNext, suggested }: Props) {
  const [pending, setPending] = useState(false);

  function handlePick(id: LangKey) {
    if (pending) return;
    onSelect(id);
    setPending(true);
    setTimeout(() => onNext(), AUTO_ADVANCE_MS);
  }

  return (
    <section className="li-screen">
      <ChatBubble
        lineHtml="Pak gjëra të shpejta tani. E para — gjuha."
        questionHtml="Në çfarë <span class='accent'>gjuhe</span> do ta shkruajmë faqen?"
      />
      <div className="li-connector" />
      <CardPicker
        options={LANGUAGE_OPTIONS}
        selected={selected}
        onSelect={handlePick}
        layout="cols-2"
        ariaLabel="Zgjedhja e gjuhës"
        suggested={suggested}
      />
    </section>
  );
}
