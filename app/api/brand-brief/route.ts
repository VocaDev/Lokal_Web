/**
 * Stage 1: Brand Brief Generator (wizard v2)
 * Returns a 5-field strategic brief from the wizard's lenient inputs.
 *
 * The pure runner lives at src/lib/ai/brand-brief.ts so we can call it from
 * scripts and so this file only exports route handlers (Next.js App Router
 * validates that route files only export GET/POST/etc. + config exports).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { emitProgress } from '@/lib/ai-progress';
import { runBrandBrief } from '@/lib/ai/brand-brief';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    const limited = await bumpAiUsage(supabase, userOrResponse.id);
    if (limited) return limited;

    const {
      businessName,
      industry,
      industryChip,
      city,
      uniqueness,
      businessDescription,
      services,
      bookingMethod,
      language,
      tone,
      generationId,
      businessId,
    } = await request.json();

    // Optional progress streaming. The wizard passes generationId+businessId
    // and subscribes via Realtime; older callers that omit them still work.
    const canEmit = typeof generationId === 'string' && typeof businessId === 'string';
    const userId = userOrResponse.id;
    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'analyzing_business', status: 'started',
      });
    }

    if (!businessName || !industry || !city) {
      return NextResponse.json(
        { error: 'businessName, industry, and city are required' },
        { status: 400 },
      );
    }

    const brief = await runBrandBrief({
      businessName, industry, industryChip, city, uniqueness, businessDescription,
      services, bookingMethod, language, tone,
    });
    console.log('[brand-brief]', JSON.stringify(brief, null, 2));

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'building_brief', status: 'completed',
      });
    }

    return NextResponse.json({ success: true, brief });
  } catch (error: any) {
    console.error('[brand-brief] Error:', error?.message || error);
    // Best-effort: surface the failure on the wizard's progress stream.
    try {
      const body = await request.clone().json().catch(() => ({} as any));
      if (typeof body.generationId === 'string' && typeof body.businessId === 'string') {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await emitProgress({
            supabase, userId: user.id,
            businessId: body.businessId,
            generationId: body.generationId,
            step: 'building_brief', status: 'error',
            message: error?.message || 'Brief generation failed',
          });
        }
      }
    } catch { /* swallowed */ }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
