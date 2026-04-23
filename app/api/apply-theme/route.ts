import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { businessId, theme } = await request.json();
    if (!businessId || !theme) {
      return NextResponse.json({ error: 'businessId and theme required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: bizUpdated, error: bizErr } = await supabase
      .from('businesses')
      .update({
        template_id: theme.templateId,
        website_creation_method: 'ai_generated',
        website_builder_completed: true,
        custom_website_html: null,
      })
      .eq('id', businessId)
      .select('subdomain')
      .maybeSingle();

    if (bizErr) throw new Error(`Business update: ${bizErr.message}`);
    const subdomain = bizUpdated?.subdomain ?? null;

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
      hero_height: theme.heroHeight,
      card_style: theme.cardStyle,
      show_testimonials: theme.showTestimonials,
      show_team: theme.showTeam,
      show_contact: theme.showContact,
      hero_headline: theme.heroHeadline,
      hero_subheadline: theme.heroSubheadline,
      about_copy: theme.aboutCopy,
      cta_primary: theme.ctaPrimary,
      cta_secondary: theme.ctaSecondary,
      footer_tagline: theme.footerTagline,
      meta_description: theme.metaDescription,
      value_props: theme.valueProps,
      testimonials: theme.testimonials,
      faq: theme.faq,
    };

    let { error } = await supabase
      .from('website_customization')
      .upsert(payload, { onConflict: 'business_id' });

    if (error && /column .* does not exist|Could not find|schema cache|footer_tagline|meta_description|value_props|testimonials|faq/i.test(error.message || '')) {
      console.warn('[apply-theme] Rich content columns missing, falling back to core. Run docs/migrations/005_ai_rich_content_columns.sql.');
      const { footer_tagline, meta_description, value_props, testimonials, faq, ...core } = payload;
      const retry = await supabase
        .from('website_customization')
        .upsert(core, { onConflict: 'business_id' });
      error = retry.error;
    }

    if (error) throw new Error(`Customization: ${error.message}`);

    // 3. Write AI-generated services to the services table.
    // Clear existing services for this business (in case of regeneration),
    // then insert the new AI-generated rows. Non-fatal if it fails — owner
    // can still add services manually via /dashboard/services.
    if (Array.isArray(theme.services) && theme.services.length > 0) {
      const { error: delErr } = await supabase
        .from('services')
        .delete()
        .eq('business_id', businessId);
      if (delErr) {
        console.error('[apply-theme] Failed to clear existing services:', delErr);
      }

      const serviceRows = theme.services
        .filter((s: any) => s && typeof s.name === 'string' && s.name.trim().length > 0)
        .map((s: any) => ({
          business_id: businessId,
          name: String(s.name).trim(),
          description: typeof s.description === 'string' ? s.description : '',
          price: typeof s.price === 'number' ? s.price : 0,
          duration_minutes: typeof s.durationMinutes === 'number' ? s.durationMinutes : 30,
        }));

      if (serviceRows.length > 0) {
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
