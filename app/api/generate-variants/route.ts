/**
 * Stage 2: Theme Generator (parametric AI renderer)
 * Single Anthropic call. Returns one theme whose core is a sections[] array of
 * parametric section descriptors (hero, services, story, gallery, footer).
 * DynamicSiteRenderer interprets those parameters into a unique layout.
 *
 * The pure runner (prompt-building + Anthropic call) lives at
 * src/lib/ai/theme.ts so we can call it from scripts and so this file only
 * exports route handlers (Next.js App Router validates that route files only
 * export GET/POST/etc. + config exports).
 *
 * This file does the production wrapping: auth + rate-limiting + photo-slot
 * lookup + post-processing + validation + retry + progress emit.
 *
 * Route URL preserved (`/api/generate-variants`); response shape:
 *   { success: true, theme: { ...themeTokens, sections: AiSection[] } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeIndustry } from '@/lib/industries';
import { createClient } from '@/lib/supabase/server';
import { requireUser, bumpAiUsage } from '@/lib/api-auth';
import { emitProgress } from '@/lib/ai-progress';
import { contrastRatio, ensureReadableTextColor, relativeLuminance, generatePaletteFromBrandColors } from '@/lib/utils';
import { ARCHETYPES, isArchetypeKey, type ArchetypeKey } from '@/lib/archetypes';
import { BANNED_PHRASES } from '@/lib/banned-phrases';
import { generateTheme, type GenerateThemeArgs } from '@/lib/ai/theme';

export const maxDuration = 120;

function normalizeGenerationIndustry(industry: string, businessDescription?: string): string {
  const haystack = `${industry} ${businessDescription ?? ''}`.toLowerCase();

  if (/course|kurs|education|learning|academy|akademi|school|shkoll|university|universit|faculty|fakultet|college|program/.test(haystack)) {
    return 'education';
  }
  if (/retail|shop|store|dyqan|boutique|product|produkt|handmade|e-?commerce/.test(haystack)) {
    return 'retail';
  }
  if (/freelance|freelancer|designer|dizajn|photographer|fotograf|copywriter|creative|kreativ/.test(haystack)) {
    return 'freelance';
  }
  if (/event|events|festival|concert|koncert|wedding|dasma|party|bilet|ticket/.test(haystack)) {
    return 'events';
  }

  return normalizeIndustry(industry);
}

// Recursively scan section text fields for banned phrases.
function collectSectionCopy(sections: any[]): string {
  if (!Array.isArray(sections)) return '';
  const TEXT_FIELDS = ['headline', 'subheadline', 'body', 'intro', 'attribution', 'caption', 'tagline', 'metadataLeft', 'metadataRight', 'ctaPrimary', 'ctaSecondary'];
  const ITEM_TEXT_FIELDS = ['name', 'description', 'quote', 'role', 'question', 'answer'];

  const parts: string[] = [];
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    for (const field of TEXT_FIELDS) {
      if (typeof section[field] === 'string') parts.push(section[field]);
    }
    if (Array.isArray(section.items)) {
      for (const item of section.items) {
        if (!item || typeof item !== 'object') continue;
        for (const field of ITEM_TEXT_FIELDS) {
          if (typeof item[field] === 'string') parts.push(item[field]);
        }
      }
    }
  }
  return parts.join(' ').toLowerCase();
}

// ----------------------------------------------------------------
// Post-processor — runs after the model returns. Forces deterministic shape.
// ----------------------------------------------------------------

interface WizardServiceInput {
  name?: string;
  price?: string | number;
  duration?: string | number;
  durationMinutes?: string | number;
  description?: string;
}

interface PostProcessCtx {
  // Per-section user picks. 'ai' = leave AI's choice; specific value = force it.
  heroLayout: string;
  storyLayout: string;
  servicesLayout: string;
  galleryLayout: string;
  userHasServicePhotos: boolean;
  userHasGalleryPhotos: boolean;
  userHasHeroPhoto: boolean;
  language: string;
  wizardServices: WizardServiceInput[];
  businessDescription: string;
  industry: string;
  businessName: string;
  uniqueness: string;
  city: string;
  // Visual archetype context — postProcess overlays palette/fonts onto the AI
  // theme so colors are ALWAYS from a validated source. Sonnet's color/font
  // outputs (if any) are discarded for archetype/custom; for 'ai' mode we
  // honor the archetypeChoice it emitted.
  archetypeKey: ArchetypeKey | 'custom' | 'ai';
  brandPrimary?: string;
  brandAccent?: string;
  customFont?: string;
}

function nonEmptyString(v: any): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : '';
}

// Coerce a wizard-supplied price/duration (which may be string or number)
// to an integer. Returns undefined when the input is missing or not numeric,
// so the caller can keep the AI's value rather than zeroing it.
function coerceInt(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

function academicDurationLabel(name: string): string {
  const lower = name.toLowerCase();
  if (/\bmaster\b|msc|m\.sc|\bma\b/.test(lower)) return '1-2 years';
  if (/\bbachelor\b|bsc|b\.sc|\bba\b/.test(lower)) return '3-4 years';
  return 'multi-year program';
}

function isPublicAcademicContext(ctx: PostProcessCtx): boolean {
  const haystack = [
    ctx.businessName,
    ctx.industry,
    ctx.businessDescription,
    ctx.uniqueness,
    ...ctx.wizardServices.map(s => s.name ?? ''),
  ].join(' ').toLowerCase();

  const hasAcademicSignal =
    /universit|university|college|faculty|fakultet|school|shkoll|academy|akademi|bachelor|master|degree|program/.test(haystack);
  const hasPublicFreeSignal =
    /public|publik|state|shtet|free|falas|tuition-free|pa pages|komunal|municipal/.test(haystack);

  return hasAcademicSignal && hasPublicFreeSignal;
}

function reorderSections(sections: any[]): any[] {
  // Fixed standard order: hero -> services -> story -> gallery -> footer.
  const hero = sections.find(s => s.kind === 'hero');
  const footer = sections.find(s => s.kind === 'footer');
  const services = sections.find(s => s.kind === 'services');
  const story = sections.find(s => s.kind === 'story');
  const gallery = sections.find(s => s.kind === 'gallery');

  const result: any[] = [];
  if (hero) result.push(hero);
  if (services) result.push(services);
  if (story) result.push(story);
  if (gallery) result.push(gallery);
  if (footer) result.push(footer);
  return result;
}

function postProcessTheme(theme: any, ctx: PostProcessCtx): any {
  // 0. Archetype palette + fonts overlay. Always run BEFORE contrast checks.
  let effectiveArchetypeKey: ArchetypeKey | 'custom' | 'ai' = ctx.archetypeKey;
  if (ctx.archetypeKey === 'ai') {
    const aiChoice = typeof theme?.archetypeChoice === 'string' ? theme.archetypeChoice : '';
    if (isArchetypeKey(aiChoice)) {
      effectiveArchetypeKey = aiChoice;
    } else {
      console.warn('[generate-variants] AI did not return a valid archetypeChoice, falling back:', aiChoice);
      effectiveArchetypeKey = 'besim-qartesi';
    }
  }

  if (effectiveArchetypeKey === 'custom' && ctx.brandPrimary && ctx.brandAccent) {
    const palette = generatePaletteFromBrandColors(ctx.brandPrimary, ctx.brandAccent);
    theme = {
      ...theme,
      ...palette,
      headingFont: ctx.customFont || 'dm-sans',
      bodyFont: ctx.customFont === 'playfair' ? 'inter' : (ctx.customFont || 'dm-sans'),
    };
  } else if (isArchetypeKey(effectiveArchetypeKey)) {
    const arch = ARCHETYPES[effectiveArchetypeKey];
    theme = {
      ...theme,
      ...arch.palette,
      headingFont: arch.headingFont,
      bodyFont: arch.bodyFont,
    };
  }
  if (theme && typeof theme === 'object' && 'archetypeChoice' in theme) {
    delete (theme as any).archetypeChoice;
  }

  let sections: any[] = (theme?.sections ?? []).filter(Boolean);
  const publicAcademic = isPublicAcademicContext(ctx);

  // 1. Strip section types we never render.
  sections = sections.filter(s => s?.kind !== 'testimonials' && s?.kind !== 'faq');

  // 2a. Force a gallery section if the user uploaded gallery photos but the
  //     AI didn't include one.
  const hasGallery = sections.some(s => s?.kind === 'gallery');
  if (ctx.userHasGalleryPhotos && !hasGallery) {
    const lockedGallery = ctx.galleryLayout && ctx.galleryLayout !== 'ai'
      ? ctx.galleryLayout
      : 'masonry';
    sections.push({
      kind: 'gallery',
      layout: lockedGallery,
      caption: undefined,
    });
  }

  // 2b. Strip the gallery section when the user has NOT uploaded any gallery
  //     photos. Empty placeholder boxes don't blend with most sites.
  if (!ctx.userHasGalleryPhotos) {
    sections = sections.filter(s => s?.kind !== 'gallery');
  }

  // 2c. Force hero imageStyle='photo' when the user uploaded a hero photo.
  if (ctx.userHasHeroPhoto) {
    sections = sections.map(s => (
      s?.kind === 'hero' ? { ...s, imageStyle: 'photo' } : s
    ));
  }

  // 3. Wizard's structured service inputs are authoritative for name / price /
  //    duration. Overlay the wizard values onto the AI items by index.
  if (ctx.wizardServices.length > 0) {
    sections = sections.map(s => {
      if (s?.kind !== 'services') return s;
      const aiItems: any[] = Array.isArray(s.items) ? s.items : [];
      const items = aiItems.map((aiSvc, i) => {
        const userSvc = ctx.wizardServices[i];
        if (!userSvc) return aiSvc;
        const overlaid = { ...aiSvc };
        if (userSvc.name && userSvc.name.trim().length > 0) {
          overlaid.name = userSvc.name.trim();
        }
        const userPrice = coerceInt(userSvc.price);
        if (userPrice !== undefined) {
          overlaid.price = userPrice;
        } else {
          delete overlaid.price;
        }
        const userDuration = coerceInt(userSvc.duration ?? userSvc.durationMinutes);
        if (userDuration !== undefined) {
          overlaid.durationMinutes = userDuration;
          delete overlaid.durationLabel;
        } else {
          delete overlaid.durationMinutes;
        }
        return overlaid;
      });
      const anyUserPrice = ctx.wizardServices.some(svc => coerceInt(svc.price) !== undefined);
      const anyUserDuration = ctx.wizardServices.some(svc => coerceInt(svc.duration ?? svc.durationMinutes) !== undefined);
      return { ...s, showPrices: anyUserPrice, showDuration: anyUserDuration, items };
    });
  }

  if (publicAcademic) {
    sections = sections.map(s => {
      if (s?.kind !== 'services') return s;
      const items = Array.isArray(s.items)
        ? s.items.map((item: any) => {
            const next = { ...item };
            delete next.price;
            delete next.durationMinutes;
            next.durationLabel = nonEmptyString(next.durationLabel) || academicDurationLabel(nonEmptyString(next.name));
            return next;
          })
        : s.items;
      return { ...s, showPrices: false, showDuration: true, items };
    });
  }

  // 4. WCAG AA contrast on the text/bg pair.
  if (theme.textColor && theme.bgColor) {
    const corrected = ensureReadableTextColor(theme.textColor, theme.bgColor);
    if (corrected !== theme.textColor) {
      console.warn('[generate-variants] textColor/bgColor contrast failed, correcting:', {
        original: theme.textColor,
        bg: theme.bgColor,
        corrected,
      });
      theme.textColor = corrected;
    }
  }
  if (theme.mutedTextColor && theme.bgColor) {
    const cr = contrastRatio(theme.mutedTextColor, theme.bgColor);
    if (cr < 3.0) {
      const before = theme.mutedTextColor;
      theme.mutedTextColor = relativeLuminance(theme.bgColor) > 0.5 ? '#5a5a5a' : '#a8a8a8';
      console.warn('[generate-variants] mutedTextColor contrast failed, correcting:', {
        original: before,
        bg: theme.bgColor,
        corrected: theme.mutedTextColor,
      });
    }
  }

  // 5. Hero must have non-empty content + at least one CTA.
  const fallbackCta = ctx.language === 'en' ? 'Get in touch' : 'Na kontaktoni';
  const fallbackHeadline = nonEmptyString(ctx.uniqueness) || ctx.businessName;
  const fallbackSubheadline = ctx.businessName + (ctx.city ? ` — ${ctx.city}` : '');
  sections = sections.map(s => {
    if (s?.kind !== 'hero') return s;
    const ctaCount = typeof s.ctaCount === 'number' ? s.ctaCount : 0;
    return {
      ...s,
      headline: nonEmptyString(s.headline) || fallbackHeadline,
      subheadline: nonEmptyString(s.subheadline) || fallbackSubheadline,
      ctaCount: ctaCount > 0 ? ctaCount : 1,
      ctaPrimary: nonEmptyString(s.ctaPrimary) || fallbackCta,
    };
  });

  // 6. Lock user-chosen layouts.
  sections = sections.map(s => {
    if (!s || typeof s.kind !== 'string') return s;
    if (s.kind === 'hero' && ctx.heroLayout && ctx.heroLayout !== 'ai') {
      return { ...s, layout: ctx.heroLayout };
    }
    if (s.kind === 'story' && ctx.storyLayout && ctx.storyLayout !== 'ai') {
      return { ...s, layout: ctx.storyLayout };
    }
    if (s.kind === 'services' && ctx.servicesLayout && ctx.servicesLayout !== 'ai') {
      return { ...s, layout: ctx.servicesLayout };
    }
    if (s.kind === 'gallery' && ctx.galleryLayout && ctx.galleryLayout !== 'ai') {
      return { ...s, layout: ctx.galleryLayout };
    }
    return s;
  });

  // 7. Final ordering — hero -> services -> story -> gallery -> footer.
  sections = reorderSections(sections);

  return { ...theme, sections };
}

// ----------------------------------------------------------------

function validateTheme(v: any): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allCopy = collectSectionCopy(v?.sections);

  for (const banned of BANNED_PHRASES) {
    if (allCopy.includes(banned.toLowerCase())) reasons.push(`Contains banned phrase: "${banned}"`);
  }

  return { valid: reasons.length === 0, reasons };
}

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

    const body = await request.json();
    const {
      brief, businessName, industry, city, uniqueness, businessDescription,
      heroLayout, storyLayout, servicesLayout, galleryLayout,
      archetypeKey,
      brandPrimary, brandAccent, customFont,
      bookingMethod,
      language, tone, userProvidedServices, wizardServices, regenSeed,
      generationId, businessId,
    } = body;

    // Whitelist bookingMethod — anything else (legacy callers, malformed
    // payloads) defaults to 'none' so we err on the side of "no booking CTA".
    const normalizedBookingMethod: 'appointments' | 'walkin' | 'both' | 'none' =
      bookingMethod === 'appointments' || bookingMethod === 'walkin' ||
      bookingMethod === 'both' || bookingMethod === 'none'
        ? bookingMethod
        : 'none';

    // Normalize archetypeKey: must be 'ai', 'custom', or a known archetype
    // key. Anything else (including legacy 'mood' values) defaults to 'ai'.
    const normalizedArchetypeKey: ArchetypeKey | 'custom' | 'ai' =
      archetypeKey === 'custom' ? 'custom'
      : isArchetypeKey(archetypeKey) ? archetypeKey
      : 'ai';

    if (!brief || !businessName || !industry) {
      return NextResponse.json({ error: 'brief, businessName, industry required' }, { status: 400 });
    }

    // Optional progress streaming. The wizard passes generationId+businessId
    // and subscribes via Realtime; older callers that omit them still work.
    const canEmit = typeof generationId === 'string' && typeof businessId === 'string';
    const userId = userOrResponse.id;

    const canonical = normalizeGenerationIndustry(industry, businessDescription);

    // Look up uploaded photo slots so the prompt can be photo-aware and the
    // post-processor can force a gallery section.
    let userHasGalleryPhotos = false;
    let userHasServicePhotos = false;
    let userHasHeroPhoto = false;
    if (typeof businessId === 'string' && businessId.length > 0) {
      const { data: galleryRows } = await supabase
        .from('gallery_items')
        .select('section_key')
        .eq('business_id', businessId);
      const rows = galleryRows ?? [];
      userHasGalleryPhotos = rows.some(r => r.section_key === 'gallery');
      userHasServicePhotos = rows.some(r => r.section_key === 'services');
      userHasHeroPhoto = rows.some(r => r.section_key === 'hero');
    }

    const args: GenerateThemeArgs = {
      brief,
      businessName,
      industry,
      city: city || '',
      uniqueness: typeof uniqueness === 'string' ? uniqueness : '',
      businessDescription: typeof businessDescription === 'string' ? businessDescription : '',
      heroLayout: typeof heroLayout === 'string' && heroLayout ? heroLayout : 'ai',
      storyLayout: typeof storyLayout === 'string' && storyLayout ? storyLayout : 'ai',
      servicesLayout: typeof servicesLayout === 'string' && servicesLayout ? servicesLayout : 'ai',
      galleryLayout: typeof galleryLayout === 'string' && galleryLayout ? galleryLayout : 'ai',
      archetypeKey: normalizedArchetypeKey,
      brandPrimary,
      brandAccent,
      customFont,
      bookingMethod: normalizedBookingMethod,
      language: language || 'sq',
      tone: tone || 'friendly',
      userProvidedServices: userProvidedServices || '',
      canonicalIndustry: canonical,
      userHasGalleryPhotos,
      userHasServicePhotos,
      regenSeed,
    };

    console.log('[generate-variants] Generating parametric theme', {
      canonical, archetypeKey: args.archetypeKey,
      layouts: {
        hero: args.heroLayout,
        story: args.storyLayout,
        services: args.servicesLayout,
        gallery: args.galleryLayout,
      },
    });

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'designing_theme', status: 'started',
      });
    }

    const postProcessCtx: PostProcessCtx = {
      heroLayout: args.heroLayout,
      storyLayout: args.storyLayout,
      servicesLayout: args.servicesLayout,
      galleryLayout: args.galleryLayout,
      userHasServicePhotos,
      userHasGalleryPhotos,
      userHasHeroPhoto,
      language: args.language,
      wizardServices: Array.isArray(wizardServices)
        ? (wizardServices as WizardServiceInput[])
        : [],
      businessDescription: args.businessDescription,
      industry: args.industry,
      businessName: args.businessName,
      uniqueness: args.uniqueness,
      city: args.city,
      archetypeKey: args.archetypeKey,
      brandPrimary: args.brandPrimary,
      brandAccent: args.brandAccent,
      customFont: args.customFont,
    };

    let theme = postProcessTheme(await generateTheme(args), postProcessCtx);

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'writing_copy', status: 'progress',
      });
    }

    const validation = validateTheme(theme);
    if (!validation.valid) {
      console.warn('[generate-variants] Theme failed validation, regenerating once:', validation.reasons);
      const retry = postProcessTheme(
        await generateTheme({ ...args, regenSeed: `retry-${Date.now()}` }),
        postProcessCtx,
      );
      const retryValidation = validateTheme(retry);
      if (retryValidation.valid) {
        theme = retry;
      } else {
        console.warn('[generate-variants] Retry also invalid, returning best-effort:', retryValidation.reasons);
        theme = retry;
      }
    }

    if (canEmit) {
      await emitProgress({
        supabase, userId, businessId, generationId,
        step: 'finalizing', status: 'completed',
      });
    }

    return NextResponse.json({ success: true, theme });
  } catch (error: any) {
    console.error('[generate-variants] Error:', error?.message || error);
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
            step: 'finalizing', status: 'error',
            message: error?.message || 'Theme generation failed',
          });
        }
      }
    } catch { /* swallowed */ }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
