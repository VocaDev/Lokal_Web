"use client";

import { useEffect, useState } from 'react';

export type Brief = {
  positioning: string;
  definingTraits: string[];
  targetCustomer: string;
  voice: string;
  culturalAnchor: string;
} | null;

export type LoaderStage = 'thinking' | 'brief-revealing' | 'designing';

const THINKING_MESSAGES = [
  'Analyzing your business...',
  'Understanding your industry...',
  'Thinking about your positioning...',
];

const DESIGNING_MESSAGES = [
  'Designing your refined variant...',
  'Designing your distinctive variant...',
  'Quality-checking the output...',
];

function useTypewriter(text: string, speed = 20) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return shown;
}

type Props = { stage: LoaderStage; brief: Brief };

export default function GenerationLoader({ stage, brief }: Props) {
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [designingIdx, setDesigningIdx] = useState(0);
  const [briefStep, setBriefStep] = useState(0);

  useEffect(() => {
    if (stage !== 'thinking') return;
    const i = setInterval(() => setThinkingIdx((p) => (p + 1) % THINKING_MESSAGES.length), 1400);
    return () => clearInterval(i);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'designing') return;
    const i = setInterval(() => setDesigningIdx((p) => (p + 1) % DESIGNING_MESSAGES.length), 1400);
    return () => clearInterval(i);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'brief-revealing' || !brief) return;
    setBriefStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    [1, 2, 3, 4, 5].forEach((step, idx) => {
      timers.push(setTimeout(() => setBriefStep(step), 700 * (idx + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, [stage, brief]);

  const typedPositioning = useTypewriter(
    stage === 'brief-revealing' && briefStep >= 1 ? brief?.positioning || '' : ''
  );
  const typedCustomer = useTypewriter(
    stage === 'brief-revealing' && briefStep >= 3 ? brief?.targetCustomer || '' : ''
  );
  const typedAnchor = useTypewriter(
    stage === 'brief-revealing' && briefStep >= 5 ? brief?.culturalAnchor || '' : ''
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full space-y-10 py-16">
        <div className="text-center">
          <div className="relative inline-block w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-[#1e1e35] border-t-blue-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-[#1e1e35] border-r-violet-500 animate-spin [animation-duration:2s] [animation-direction:reverse]" />
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 opacity-20 blur-3xl" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mt-6 bg-gradient-to-br from-blue-400 to-violet-500 bg-clip-text text-transparent transition-all duration-500">
            {stage === 'thinking' && THINKING_MESSAGES[thinkingIdx]}
            {stage === 'brief-revealing' && "Here's what I understand about your business"}
            {stage === 'designing' && DESIGNING_MESSAGES[designingIdx]}
          </h2>
        </div>

        {brief && stage !== 'thinking' && (
          <div className="bg-[#151522] border border-[rgba(120,120,255,0.22)] rounded-xl p-6 space-y-5 animate-in fade-in duration-700">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xs font-semibold tracking-wider uppercase">Brand Brief</span>
              <div className="flex-1 h-px bg-[rgba(120,120,255,0.12)]" />
            </div>

            {briefStep >= 1 && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Positioning</div>
                <div className="text-[#e8e8f0] text-sm">
                  {typedPositioning}
                  <span className="inline-block w-1 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {briefStep >= 2 && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Defining Traits</div>
                <div className="flex flex-wrap gap-2">
                  {brief.definingTraits.map((t, i) => (
                    <span
                      key={i}
                      className="bg-blue-400/15 text-blue-400 rounded-full px-3 py-1 text-xs font-semibold animate-in fade-in zoom-in duration-300"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {briefStep >= 3 && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Target Customer</div>
                <div className="text-[#8888aa] text-sm">{typedCustomer}</div>
              </div>
            )}

            {briefStep >= 4 && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Voice</div>
                <div className="text-[#8888aa] text-sm">{brief.voice}</div>
              </div>
            )}

            {briefStep >= 5 && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="text-[#5a5a7a] text-xs uppercase tracking-wider mb-1">Cultural Anchor</div>
                <div className="text-[#8888aa] text-sm italic">&ldquo;{typedAnchor}&rdquo;</div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[#5a5a7a] text-xs">
          Two-stage AI: strategy first, then design. Just a few seconds.
        </p>
      </div>
    </div>
  );
}
