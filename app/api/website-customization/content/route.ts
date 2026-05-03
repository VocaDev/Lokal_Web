import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBusinessOwner } from '@/lib/api-auth';

// PATCH /api/website-customization/content?businessId=...
// Body: { hero?: { headline?, subheadline? }, story?: { body? } }
//
// Mutates only the named keys inside website_customization.ai_sections — the
// canonical source of hero/story copy for AI-generated sites. The denormalized
// hero_headline / about_copy columns are not touched (they are unused on the
// AI render path; the public site reads ai_sections via DynamicSiteRenderer).
//
// Empty / whitespace-only values are ignored so a blank field never wipes
// existing copy. Sections not present in ai_sections are skipped silently
// (caller may target a section the user's site doesn't include).

interface HeroPatch {
  headline?: string;
  subheadline?: string;
}

interface StoryPatch {
  body?: string;
}

interface ContentBody {
  hero?: HeroPatch;
  story?: StoryPatch;
}

const hasValue = (val: unknown): val is string =>
  typeof val === 'string' && val.trim().length > 0;

export async function PATCH(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  let body: ContentBody;
  try {
    body = (await request.json()) as ContentBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { hero, story } = body ?? {};
  if (!hero && !story) {
    return NextResponse.json({ error: 'No content fields provided' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const auth = await requireBusinessOwner(supabase, businessId);
    if (auth instanceof NextResponse) return auth;

    const { data: row, error: readErr } = await supabase
      .from('website_customization')
      .select('ai_sections')
      .eq('business_id', businessId)
      .maybeSingle();

    if (readErr) {
      console.error('PATCH /api/website-customization/content read error:', readErr);
      return NextResponse.json(
        { error: 'Failed to read customization' },
        { status: 500 },
      );
    }

    const current = row?.ai_sections;
    if (!Array.isArray(current) || current.length === 0) {
      return NextResponse.json(
        { error: 'No AI-generated content to edit. Generate your website first.' },
        { status: 400 },
      );
    }

    const next = JSON.parse(JSON.stringify(current)) as Array<Record<string, unknown>>;

    if (hero) {
      const idx = next.findIndex((s) => s?.kind === 'hero');
      if (idx >= 0) {
        if (hasValue(hero.headline)) next[idx].headline = hero.headline.trim();
        if (hasValue(hero.subheadline)) next[idx].subheadline = hero.subheadline.trim();
      }
    }

    if (story) {
      const idx = next.findIndex((s) => s?.kind === 'story');
      if (idx >= 0) {
        if (hasValue(story.body)) next[idx].body = story.body.trim();
      }
    }

    const { data: updated, error: writeErr } = await supabase
      .from('website_customization')
      .update({ ai_sections: next, updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .select('ai_sections')
      .single();

    if (writeErr) {
      console.error('PATCH /api/website-customization/content write error:', writeErr);
      return NextResponse.json(
        { error: writeErr.message || 'Failed to update content' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ai_sections: updated.ai_sections });
  } catch (err: unknown) {
    console.error('PATCH /api/website-customization/content error:', err);
    const message = err instanceof Error ? err.message : 'Failed to update content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
