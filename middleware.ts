import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  const isLocalhost = hostname.includes('localhost')
  const isMainDomain = subdomain === 'www' || subdomain === 'lokalweb' || isLocalhost

  if (!isMainDomain) {
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
