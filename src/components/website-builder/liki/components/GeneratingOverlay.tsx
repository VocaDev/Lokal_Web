'use client';

/**
 * The substep checklist Liki shows while brand-brief + generate-variants run.
 * Events arrive via Supabase realtime in useGenerationPipeline; this component
 * is purely presentational. On error, the user can retry — the pipeline
 * preserves any successful brand-brief so retry skips that step.
 */

import { SUBSTEPS, type LangKey } from '../mappings';
import type { ProgressStep } from '@/lib/ai-progress';

type Props = {
  activeStep: ProgressStep | null;
  completedSteps: Set<ProgressStep>;
  language: LangKey;
  error: string | null;
  onRetry: () => void;
};

export function GeneratingOverlay({
  activeStep,
  completedSteps,
  language,
  error,
  onRetry,
}: Props) {
  const titleSq = 'Po krijoj faqen tënde';
  const titleEn = 'Building your page';
  const subSq = 'Po lë gjurmë sipas tregimit tënd. Pak çaste.';
  const subEn = "I'm shaping the page from your story. Just a moment.";

  return (
    <section className="li-screen">
      <div className="li-gen">
        <div className="li-tab li-gen-tab">
          <span className="li-tab-dot" />
          <span className="li-tab-name">Liki</span>
        </div>
        <h2 className="li-gen-title">{language === 'sq' ? titleSq : titleEn}</h2>
        <p className="li-gen-sub">{language === 'sq' ? subSq : subEn}</p>
        <div className="li-gen-substeps">
          {SUBSTEPS.map((sub) => {
            const isDone = completedSteps.has(sub.step);
            const isActive = activeStep === sub.step && !isDone;
            const cls = `li-gen-row${isActive ? ' li-active' : ''}${isDone ? ' li-done' : ''}`;
            return (
              <div className={cls} key={sub.step}>
                <span className="li-gen-dot" aria-hidden />
                <span>{language === 'sq' ? sub.labelSq : sub.labelEn}</span>
              </div>
            );
          })}
        </div>
        {error && (
          <>
            <div className="li-gen-err" role="alert">{error}</div>
            <div className="li-gen-err-actions">
              <button type="button" className="li-btn-primary" onClick={onRetry}>
                ↻ Provo përsëri
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
