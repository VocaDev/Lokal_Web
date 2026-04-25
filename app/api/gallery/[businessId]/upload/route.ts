import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessOwner } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  try {
    const supabase = await createClient();

    const auth = await requireBusinessOwner(supabase, businessId);
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sectionKey = formData.get('section_key') as string;

    if (!file || !sectionKey) {
      return NextResponse.json(
        { error: 'Missing file or section_key' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const filename = `${Date.now()}-${file.name}`;
    const path = `${businessId}/${sectionKey}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('business-gallery')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError);
      return NextResponse.json(
        { error: `Storage error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('business-gallery').getPublicUrl(path);

    // Update or insert gallery item
    // Note: We use upsert with a fallback in case unique constraint is missing
    const { data, error: dbError } = await supabase
      .from('gallery_items')
      .upsert(
        {
          business_id: businessId,
          section_key: sectionKey,
          image_url: publicUrl,
          alt_text: file.name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,section_key' }
      )
      .select()
      .single();

    if (dbError) {
      console.error('Database Upsert Error:', dbError);
      // Fallback: try simple insert if upsert with conflict fails
      if (dbError.code === '42703' || dbError.message.includes('index')) {
         const { data: insertData, error: insertError } = await supabase
          .from('gallery_items')
          .insert({
            business_id: businessId,
            section_key: sectionKey,
            image_url: publicUrl,
            alt_text: file.name,
          })
          .select()
          .single();
         
         if (!insertError) return NextResponse.json(insertData);
         console.error('Database Fallback Insert Error:', insertError);
      }
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Unhandled POST /api/gallery/upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
