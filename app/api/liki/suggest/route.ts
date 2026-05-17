/**
 * Liki Phase 3 — suggest language + tone + visual from the chat answers.
 *
 * Triggered in the background when the user reaches the DropTransition. By
 * the time they click "Vazhdojmë", the form cards have pre-selected values
 * with a "Liki sugjeron" badge. If this request fails or times out, the
 * form just shows no pre-selection — the user picks manually.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/api-auth';
import { runSuggestor, type SuggestorResult } from '@/lib/ai/liki/suggestor';

export const maxDuration = 15;

const FALLBACK: SuggestorResult = { language: null, tone: null, visual: null };

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(FALLBACK);
    }

    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const body = await request.json();
    const {
      businessName,
      industryText,
      industryChip,
      city,
      uniqueness,
      businessDescription,
      detectedLanguage,
    } = body ?? {};

    if (typeof industryText !== 'string' || !industryText.trim()) {
      // Without an industry, suggestion is unreliable — return null so the
      // client falls back to manual picking.
      return NextResponse.json(FALLBACK);
    }

    const result = await runSuggestor({
      businessName: typeof businessName === 'string' ? businessName : '',
      industryText,
      industryChip: typeof industryChip === 'string' ? industryChip : undefined,
      city: typeof city === 'string' ? city : '',
      uniqueness: typeof uniqueness === 'string' ? uniqueness : '',
      businessDescription: typeof businessDescription === 'string' ? businessDescription : '',
      detectedLanguage: detectedLanguage === 'en' || detectedLanguage === 'mixed' ? detectedLanguage : 'sq',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[liki/suggest]', error?.message || error);
    return NextResponse.json(FALLBACK);
  }
}
