import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  try {
    const supabase = await createClient();

    // Get or create default customization
    const { data, error } = await supabase
      .from('website_customization')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create default
      const { data: newData, error: insertError } = await supabase
        .from('website_customization')
        .insert({
          business_id: businessId,
          primary_color: '#4f8ef7',
          accent_color: '#8b5cf6',
          text_color: '#e8e8f0',
          muted_text_color: '#8888aa',
          bg_color: '#0a0a0f',
          surface_color: '#151522',
          border_color: 'rgba(120,120,255,0.12)',
          heading_font: 'dm-sans',
          body_font: 'dm-sans',
          hero_height: 'medium',
          card_style: 'minimal',
          show_testimonials: true,
          show_team: true,
          show_contact: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return NextResponse.json(newData);
    }

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('GET /api/customization error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customization' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Sanitize body to only include updatable fields
    const {
      primary_color,
      accent_color,
      text_color,
      muted_text_color,
      bg_color,
      surface_color,
      border_color,
      heading_font,
      body_font,
      hero_height,
      card_style,
      show_testimonials,
      show_team,
      show_contact,
    } = body;

    const updates = {
      primary_color,
      accent_color,
      text_color,
      muted_text_color,
      bg_color,
      surface_color,
      border_color,
      heading_font,
      body_font,
      hero_height,
      card_style,
      show_testimonials,
      show_team,
      show_contact,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updates).forEach(
      (key) => (updates as any)[key] === undefined && delete (updates as any)[key]
    );

    // Verify ownership
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (bizError || !business) throw new Error('Business not found');

    const { data, error } = await supabase
      .from('website_customization')
      .update(updates)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/customization error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update customization' },
      { status: 500 }
    );
  }
}
