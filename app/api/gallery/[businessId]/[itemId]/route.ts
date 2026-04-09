import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  const { businessId, itemId } = await params;
  try {
    const supabase = await createClient();

    // Verify ownership indirectly by joining onto business or just check if it exists for this businessId
    const { data: item, error: itemError } = await supabase
      .from('gallery_items')
      .select('id, image_url')
      .eq('id', itemId)
      .eq('business_id', businessId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item not found for this business' },
        { status: 404 }
      );
    }

    // Optional: Also delete the file from storage
    if (item.image_url) {
        try {
            const urlPath = item.image_url.split('/business-gallery/')[1];
            if (urlPath) {
                await supabase.storage.from('business-gallery').remove([urlPath]);
            }
        } catch (storageErr) {
            console.error('Storage deletion failed:', storageErr);
            // Non-critical, continue with DB deletion
        }
    }

    const { error } = await supabase
      .from('gallery_items')
      .delete()
      .eq('id', itemId)
      .eq('business_id', businessId);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/gallery/[itemId] error:', err);
    return NextResponse.json(
      { error: 'Failed to delete gallery item' },
      { status: 500 }
    );
  }
}
