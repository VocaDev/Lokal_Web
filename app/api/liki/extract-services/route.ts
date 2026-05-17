/**
 * Liki Phase 5 — extract structured services from free-text input.
 *
 * Called when the user clicks "Vazhdo" on the services screen. The client
 * shows a loading spinner while this runs. On any failure the client falls
 * back to the minimal split parser from mappings.tsx — so the wizard never
 * blocks on this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/api-auth';
import { runServicesExtractor, type ServicesExtractorResult } from '@/lib/ai/liki/services-extractor';

export const maxDuration = 15;

const FALLBACK: { services: null } = { services: null };

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(FALLBACK);
    }

    const supabase = await createClient();
    const userOrResponse = await requireUser(supabase);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const body = await request.json();
    const { servicesRaw, industryChip, industryText, language } = body ?? {};

    if (typeof servicesRaw !== 'string' || !servicesRaw.trim()) {
      // No input → return empty services array (not null — null means error)
      return NextResponse.json({ services: [] } satisfies ServicesExtractorResult);
    }

    const result = await runServicesExtractor({
      servicesRaw,
      industryChip: typeof industryChip === 'string' ? industryChip : undefined,
      industryText: typeof industryText === 'string' ? industryText : '',
      language: language === 'en' ? 'en' : 'sq',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[liki/extract-services]', error?.message || error);
    return NextResponse.json(FALLBACK);
  }
}
