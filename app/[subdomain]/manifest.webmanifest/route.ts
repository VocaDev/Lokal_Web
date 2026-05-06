import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Per-tenant Web App Manifest. Each subdomain gets its own — when a customer
// installs `barbershop.lokalweb.com` to their home screen, the icon and label
// say "Edi's Barbershop", not "LokalWeb".
//
// Falls back to the apex manifest fields when the business hasn't uploaded a
// logo. Icons must resolve to absolute URLs the OS can fetch from outside the
// app context (Supabase Storage URLs are public-read, so they work).
export async function GET(_req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, accent_color, logo_url')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Use the uploaded logo as the install icon when present. Otherwise fall
  // back to the LokalWeb defaults — better than no icon at all.
  const icons = business.logo_url
    ? [
        { src: business.logo_url, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: business.logo_url, sizes: '192x192', type: 'image/png', purpose: 'any' },
      ]
    : [
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ];

  const manifest = {
    name: business.name,
    short_name: business.name.length > 12 ? business.name.slice(0, 12) : business.name,
    description: business.description ?? `Book online with ${business.name}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: business.accent_color ?? '#4f8ef7',
    icons,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
