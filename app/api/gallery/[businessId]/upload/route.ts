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

    // Sanitize the filename. Supabase Storage paths are technically
    // permissive, but unescaped parens / spaces / non-ASCII characters in
    // the resulting public URL break consumers (notably CSS url() values
    // and certain image proxies). We strip the original name down to a
    // safe slug + preserve the extension. The Date.now() prefix keeps
    // collisions impossible and traceability intact.
    const dotIdx = file.name.lastIndexOf('.');
    const rawExt = dotIdx >= 0 ? file.name.slice(dotIdx + 1) : '';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const rawBase = dotIdx >= 0 ? file.name.slice(0, dotIdx) : file.name;
    const slug =
      rawBase
        .normalize('NFKD')
        // Strip combining diacritical marks (ç → c, ë → e, ñ → n, …).
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'image';
    const filename = `${Date.now()}-${slug}.${ext}`;
    const path = `${businessId}/${sectionKey}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('business-gallery')
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

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

    // Mode-aware write — migration 016 dropped the unique
    // (business_id, section_key) constraint so upsert is no longer valid.
    // hero and story replace; services and gallery append.
    const SINGLE_IMAGE_SLOTS = new Set(['hero', 'story']);
    const isSingle = SINGLE_IMAGE_SLOTS.has(sectionKey);

    if (isSingle) {
      const { error: deleteErr } = await supabase
        .from('gallery_items')
        .delete()
        .eq('business_id', businessId)
        .eq('section_key', sectionKey);

      if (deleteErr) {
        console.error('[gallery upload] delete-before-replace failed:', deleteErr);
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }
    }

    const { data, error: insertErr } = await supabase
      .from('gallery_items')
      .insert({
        business_id: businessId,
        section_key: sectionKey,
        image_url: publicUrl,
        alt_text: file.name,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[gallery upload] insert failed:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
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
