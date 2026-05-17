/**
 * Liki Phase 2 — evaluate an answer and (optionally) generate a follow-up.
 *
 * Called from the client on submit of the uniqueness/description questions.
 * Returns quality + optional follow-up + offer_choices flag. Errors fall back
 * to a "good" verdict (graceful — the wizard never blocks on AI).
 *
 * No per-user rate limit yet (Liki budget is 4-7 calls per user). Add a
 * `liki_assist` quota table later if cost monitoring suggests it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/api-auth';
import { runEvaluator, type EvaluatorResult } from '@/lib/ai/liki/evaluator';
import { getIndustryProfile } from '@/lib/liki/industry-profiles';

export const maxDuration = 15;

const FALLBACK: EvaluatorResult & { choices: string[] } = {
  quality: 'good',
  followup: null,
  offer_choices: false,
  choices: [],
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      // Without an API key, accept anything — Liki should still work in dev.
      return NextResponse.json(FALLBACK);
    }

    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const body = await request.json();
    const {
      question,
      answer,
      followupAnswer,
      industryChip,
      industryText,
      businessName,
      language,
    } = body ?? {};

    if (question !== 'uniqueness' && question !== 'description') {
      return NextResponse.json({ error: 'invalid question' }, { status: 400 });
    }
    if (typeof answer !== 'string') {
      return NextResponse.json({ error: 'answer required' }, { status: 400 });
    }

    // Empty answers shouldn't reach Haiku — client already filters, but be safe.
    if (!answer.trim()) {
      const profile = getIndustryProfile(industryChip);
      return NextResponse.json({
        quality: 'weak',
        followup: null,
        offer_choices: question === 'uniqueness' && !!followupAnswer,
        choices: question === 'uniqueness' ? profile.uniquenessChoices : [],
      });
    }

    const result = await runEvaluator({
      question,
      answer,
      followupAnswer: typeof followupAnswer === 'string' && followupAnswer.trim() ? followupAnswer : undefined,
      industryChip: typeof industryChip === 'string' ? industryChip : undefined,
      industryText: typeof industryText === 'string' ? industryText : '',
      businessName: typeof businessName === 'string' ? businessName : '',
      language: language === 'en' ? 'en' : 'sq',
    });

    // Attach industry-specific choices when the evaluator signals the user is
    // stuck. Choices come from the static profile map, not from Haiku.
    const choices = result.offer_choices && question === 'uniqueness'
      ? getIndustryProfile(industryChip).uniquenessChoices
      : [];

    return NextResponse.json({ ...result, choices });
  } catch (error: any) {
    console.error('[liki/evaluate-answer]', error?.message || error);
    return NextResponse.json(FALLBACK);
  }
}
