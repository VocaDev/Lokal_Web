import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NEW_COPY_COLUMNS = [
  'hero_headline',
  'hero_subheadline',
  'about_copy',
  'cta_primary',
  'cta_secondary',
] as const;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('[generate-website] GROQ_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      businessId,
      businessName,
      industry,
      tagline,
      preferredMood,
      sections,
    }: {
      businessId: string;
      businessName: string;
      industry: string;
      tagline?: string;
      preferredMood?: string;
      sections?: { testimonials?: boolean; team?: boolean; contact?: boolean };
    } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const showTestimonialsDefault = sections?.testimonials ?? true;
    const showTeamDefault = sections?.team ?? false;
    const showContactDefault = sections?.contact ?? true;

    const prompt = `You are a senior brand designer. Return ONLY valid JSON (no markdown, no prose) matching this exact schema:

{
  "templateId": "one of: modern | minimal | bold | elegant",
  "primaryColor": "#RRGGBB hex (industry + mood appropriate)",
  "accentColor": "#RRGGBB hex (complement to primary)",
  "bgColor": "#RRGGBB hex (page background, usually dark for modern/bold, light for minimal/elegant)",
  "surfaceColor": "#RRGGBB hex (card background, contrast to bg)",
  "textColor": "#RRGGBB hex (readable on bgColor)",
  "mutedTextColor": "#RRGGBB hex (secondary text on bgColor)",
  "borderColor": "rgba(R,G,B,0.12) string",
  "headingFont": "one of: dm-sans | playfair | inter | poppins | space-grotesk",
  "bodyFont": "one of: dm-sans | inter | poppins",
  "heroHeight": "one of: small | medium | large",
  "cardStyle": "one of: minimal | raised | bordered | glass",
  "heroHeadline": "short punchy hero headline (max 60 chars) in Albanian or English depending on ${industry}",
  "heroSubheadline": "supporting sentence (max 140 chars)",
  "aboutCopy": "2-3 sentence about-us paragraph for this business",
  "ctaPrimary": "primary CTA button label (e.g. 'Book Now' or 'Rezervo Tani')",
  "ctaSecondary": "secondary CTA button label",
  "showTestimonials": ${showTestimonialsDefault},
  "showTeam": ${showTeamDefault},
  "showContact": ${showContactDefault}
}

Business context:
- Business Name: ${businessName}
- Industry: ${industry}
- Tagline: ${tagline ?? ''}
- Mood: ${preferredMood ?? 'premium'}

Rules:
- Colors must fit the industry: barbershops/clinics tend dark + premium, restaurants warm tones, salons elegant pastels
- Mood "premium" → dark bg, gold/violet accents, Playfair headings
- Mood "playful" → bright accents, rounded cards, Poppins
- Mood "minimal" → white/off-white bg, thin borders, Inter
- Return ONLY the JSON object. No explanation. No backticks. No markdown.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[generate-website] Groq API error:', JSON.stringify(errorData));
      throw new Error(errorData.error?.message || `Groq API returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    let theme: Record<string, any>;
    try {
      theme = JSON.parse(raw);
    } catch {
      console.error('[generate-website] Invalid JSON from Groq:', raw);
      return NextResponse.json(
        { error: 'AI returned malformed theme. Please retry.' },
        { status: 502 }
      );
    }

    const supabase = await createClient();

    const { error: bizError } = await supabase
      .from('businesses')
      .update({
        template_id: theme.templateId,
        website_creation_method: 'ai_generated',
        custom_website_html: null,
      })
      .eq('id', businessId);

    if (bizError) {
      console.error('[generate-website] Failed to update business:', bizError);
      throw new Error('Failed to save template selection');
    }

    const fullPayload: Record<string, any> = {
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
    };

    let { error: customError } = await supabase
      .from('website_customization')
      .upsert(fullPayload, { onConflict: 'business_id' });

    if (customError) {
      const msg = customError.message || '';
      const looksLikeMissingColumn = /column .* does not exist|Could not find|schema cache|hero_headline|hero_subheadline|about_copy|cta_primary|cta_secondary/i.test(
        msg
      );
      if (looksLikeMissingColumn) {
        console.warn(
          '[generate-website] Copy columns missing on website_customization — falling back to base columns. Run docs/migrations/004_ai_copy_columns.sql to enable copy persistence.'
        );
        const basePayload = { ...fullPayload };
        for (const col of NEW_COPY_COLUMNS) delete basePayload[col];
        const retry = await supabase
          .from('website_customization')
          .upsert(basePayload, { onConflict: 'business_id' });
        customError = retry.error;
      }
    }

    if (customError) {
      console.error('[generate-website] Failed to save customization:', customError);
      throw new Error('Failed to save theme');
    }

    return NextResponse.json({ success: true, theme });
  } catch (error: any) {
    console.error('[generate-website] Caught error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
