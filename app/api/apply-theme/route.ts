import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBusinessOwner } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const {
      businessId,
      theme,
      siteLanguage,
      siteTone,
      uniquenessStatement,
      bookingMethod,
      wizardServices,
      instagramUrl,
      tiktokUrl,
    } = await request.json();
    if (!businessId || !theme) {
      return NextResponse.json({ error: 'businessId and theme required' }, { status: 400 });
    }

    const supabase = await createClient();

    const auth = await requireBusinessOwner(supabase, businessId);
    if (auth instanceof NextResponse) return auth;

    // Merge wizard-supplied social URLs into businesses.social_links.
    // Profile page is the canonical edit surface — we only set fields the
    // wizard passed (truthy strings), so existing values aren't clobbered.
    const trimmedInstagram = typeof instagramUrl === 'string' ? instagramUrl.trim() : '';
    const trimmedTiktok = typeof tiktokUrl === 'string' ? tiktokUrl.trim() : '';
    const wantsSocialMerge = trimmedInstagram.length > 0 || trimmedTiktok.length > 0;
    let mergedSocialLinks: Record<string, string> | null = null;
    if (wantsSocialMerge) {
      const { data: bizExisting } = await supabase
        .from('businesses')
        .select('social_links')
        .eq('id', businessId)
        .maybeSingle();
      const existing = (bizExisting?.social_links as Record<string, string> | null) ?? {};
      mergedSocialLinks = { ...existing };
      if (trimmedInstagram.length > 0) mergedSocialLinks.instagram = trimmedInstagram;
      if (trimmedTiktok.length > 0) mergedSocialLinks.tiktok = trimmedTiktok;
    }

    // AI-path sites get the literal '__ai__' template marker so existing
    // rendering code can detect them cleanly. Templates path is unchanged.
    const businessUpdatePayload: Record<string, any> = {
      template_id: '__ai__',
      website_creation_method: 'ai_generated',
      website_builder_completed: true,
    };
    if (mergedSocialLinks) businessUpdatePayload.social_links = mergedSocialLinks;
    const { data: bizUpdated, error: bizErr } = await supabase
      .from('businesses')
      .update(businessUpdatePayload)
      .eq('id', businessId)
      .select('subdomain')
      .maybeSingle();

    if (bizErr) throw new Error(`Business update: ${bizErr.message}`);
    const subdomain = bizUpdated?.subdomain ?? null;

    // Theme tokens still write to website_customization so the SSR theme
    // builder in app/[subdomain]/page.tsx can convert hex→HSL for any shared
    // chrome (buttons, badges) outside the AI section sandbox.
    const payload: Record<string, any> = {
      business_id: businessId,
      primary_color: theme.primaryColor,
      accent_color: theme.accentColor,
      bg_color: theme.bgColor,
      surface_color: theme.surfaceColor,
      text_color: theme.textColor,
      muted_text_color: theme.mutedTextColor,
      border_color: theme.borderColor,
      heading_font: theme.headingFont,
      body_font: theme.bodyFont,
      meta_description: theme.metaDescription,
      // The full sections payload — this is what DynamicSiteRenderer reads.
      ai_sections: Array.isArray(theme.sections) ? theme.sections : null,
      // Debug breadcrumb: which generation produced this site.
      ai_layout_seed: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Date.now().toString(),
      // Art-direction captions for the hero/story photo slots (migration 018).
      hero_photo_caption: typeof theme.artDirection?.heroPhotoCaption === 'string'
        ? theme.artDirection.heroPhotoCaption
        : null,
      story_photo_caption: typeof theme.artDirection?.storyPhotoCaption === 'string'
        ? theme.artDirection.storyPhotoCaption
        : null,
    };

    // Wizard v2 inputs (migration 014). Only included if provided.
    // hero_style / section_priority / density columns still exist in the
    // schema but are no longer written — Step 3 was replaced by per-section
    // layout pickers and the structured layout choices live inside
    // ai_sections (theme.sections[].layout).
    if (siteLanguage !== undefined) payload.site_language = siteLanguage;
    if (siteTone !== undefined) payload.site_tone = siteTone;
    if (uniquenessStatement !== undefined) payload.uniqueness_statement = uniquenessStatement;
    if (bookingMethod !== undefined) payload.booking_method = bookingMethod;

    let { error } = await supabase
      .from('website_customization')
      .upsert(payload, { onConflict: 'business_id' });

    // Fallback for migration 018 — strip photo caption columns if missing.
    if (error && /hero_photo_caption|story_photo_caption/i.test(error.message || '')) {
      console.warn('[apply-theme] Photo caption columns missing, retrying without them. Run docs/migrations/018_photo_captions.sql.');
      const { hero_photo_caption, story_photo_caption, ...withoutCaptions } = payload;
      const retry = await supabase
        .from('website_customization')
        .upsert(withoutCaptions, { onConflict: 'business_id' });
      error = retry.error;
    }

    // Fallback for migration 015 — strip ai_sections / ai_layout_seed if the
    // DB hasn't been migrated yet, then retry.
    if (error && /ai_sections|ai_layout_seed/i.test(error.message || '')) {
      console.warn('[apply-theme] AI section columns missing, retrying without them. Run docs/migrations/015_ai_sections_payload.sql.');
      const {
        ai_sections, ai_layout_seed,
        hero_photo_caption, story_photo_caption,
        ...withoutAiSections
      } = payload;
      const retry = await supabase
        .from('website_customization')
        .upsert(withoutAiSections, { onConflict: 'business_id' });
      error = retry.error;
    }

    // Fallback for migration 014 — strip wizard v2 columns if missing.
    if (error && /site_language|site_tone|uniqueness_statement|booking_method/i.test(error.message || '')) {
      console.warn('[apply-theme] Wizard v2 columns missing, retrying without them. Run docs/migrations/014_wizard_v2_columns.sql.');
      const {
        site_language, site_tone,
        uniqueness_statement, booking_method,
        ai_sections, ai_layout_seed,
        hero_photo_caption, story_photo_caption,
        ...withoutWizardV2
      } = payload;
      const retry = await supabase
        .from('website_customization')
        .upsert(withoutWizardV2, { onConflict: 'business_id' });
      error = retry.error;
    }

    // Fallback for migration 005 — strip rich content / new columns if missing.
    if (error && /column .* does not exist|Could not find|schema cache|meta_description/i.test(error.message || '')) {
      console.warn('[apply-theme] Rich content columns missing, falling back to core. Run docs/migrations/005_ai_rich_content_columns.sql.');
      const {
        meta_description,
        ai_sections, ai_layout_seed,
        hero_photo_caption, story_photo_caption,
        site_language, site_tone,
        uniqueness_statement, booking_method,
        ...core
      } = payload;
      const retry = await supabase
        .from('website_customization')
        .upsert(core, { onConflict: 'business_id' });
      error = retry.error;
    }

    if (error) throw new Error(`Customization: ${error.message}`);

    // Write AI-generated services to the services table.
    // Sources items from the first 'services' section in theme.sections.
    // Clears existing services first (in case of regeneration). Non-fatal if
    // it fails — owner can still add services manually via /dashboard/services.
    const servicesSection = Array.isArray(theme.sections)
      ? theme.sections.find((s: any) => s?.kind === 'services')
      : null;
    const sectionItems: any[] = Array.isArray(servicesSection?.items)
      ? servicesSection.items
      : [];

    if (sectionItems.length > 0) {
      const { error: delErr } = await supabase
        .from('services')
        .delete()
        .eq('business_id', businessId);
      if (delErr) {
        console.error('[apply-theme] Failed to clear existing services:', delErr);
      }

      // Overlay user-entered wizard values (name / price / duration) onto the
      // AI's items by index. The theme returned from /api/generate-variants
      // is already overlaid, but applying again here defends against stale
      // payloads or direct callers — user-typed prices must always win.
      const wizardArr: any[] = Array.isArray(wizardServices) ? wizardServices : [];
      const coerce = (v: any): number | undefined => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = typeof v === 'number' ? v : parseInt(String(v), 10);
        return Number.isFinite(n) ? n : undefined;
      };
      const hasBookableServiceMetadata =
        wizardArr.some((s: any) => coerce(s?.price) !== undefined || coerce(s?.duration ?? s?.durationMinutes) !== undefined) ||
        sectionItems.some((s: any) => typeof s?.price === 'number' || typeof s?.durationMinutes === 'number');

      const serviceRows = sectionItems
        .map((s: any, i: number) => {
          const userSvc = wizardArr[i];
          const name = (userSvc?.name && String(userSvc.name).trim().length > 0)
            ? String(userSvc.name).trim()
            : (typeof s?.name === 'string' ? s.name.trim() : '');
          if (!name) return null;
          const userPrice = coerce(userSvc?.price);
          const userDuration = coerce(userSvc?.duration ?? userSvc?.durationMinutes);
          return {
            business_id: businessId,
            name,
            description: typeof s?.description === 'string' ? s.description : '',
            price: userPrice ?? (typeof s?.price === 'number' ? s.price : 0),
            duration_minutes: userDuration ?? (typeof s?.durationMinutes === 'number' ? s.durationMinutes : 30),
          };
        })
        .filter((row: any): row is NonNullable<typeof row> => row !== null);

      if (hasBookableServiceMetadata && serviceRows.length > 0) {
        const { error: servicesError } = await supabase
          .from('services')
          .insert(serviceRows);
        if (servicesError) {
          console.error('[apply-theme] Failed to insert services (non-fatal):', servicesError);
        }
      }
    }

    return NextResponse.json({ success: true, subdomain });
  } catch (error: any) {
    console.error('[apply-theme]', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
