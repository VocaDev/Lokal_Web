import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  
  try {
    const supabase = await createClient();
    
    // Check businesses
    const { data: businesses, error: bizError } = await supabase.from('businesses').select('count');
    
    // Check specific business
    let specificBiz = null;
    let specificBizError = null;
    if (businessId) {
        const { data, error } = await supabase.from('businesses').select('id, name').eq('id', businessId).maybeSingle();
        specificBiz = data;
        specificBizError = error?.message;
    }
    
    // Check website_customization
    const { data: custom, error: customError } = await supabase.from('website_customization').select('count');
    
    // Check gallery_items
    const { data: gallery, error: galleryError } = await supabase.from('gallery_items').select('count');
    
    // Check Storage Bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    const galleryBucket = buckets?.find(b => b.name === 'business-gallery');

    return NextResponse.json({
      working: true,
      businessId,
      env: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      tables: {
        businesses: { exists: !bizError, error: bizError?.message },
        specificBusiness: { exists: !!specificBiz, data: specificBiz, error: specificBizError },
        website_customization: { exists: !customError, error: customError?.message },
        gallery_items: { exists: !galleryError, error: galleryError?.message },
      },
      storage: {
        buckets: buckets?.map(b => b.name),
        galleryExists: !!galleryBucket,
        error: bucketError?.message
      }
    });
  } catch (err: any) {
    return NextResponse.json({ working: false, error: err.message }, { status: 500 });
  }
}
