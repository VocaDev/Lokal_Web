import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  const hostname = request.headers.get('host') || '';

  const isMainDomain =
    hostname === 'lokal-web-one.vercel.app' ||
    hostname.startsWith('localhost:') ||
    hostname === 'localhost' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('127.0.0.1');

  if (isMainDomain) {
    // 1. Auth Protection for Dashboard
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register'

    if (isDashboard && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthPage && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    return supabaseResponse;
  }

  // Extract subdomain from *.vercel.app or *.lokalweb.com
  const subdomain = hostname.split('.')[0];

  // 2. Subdomain Routing
  if (!isMainDomain && subdomain) {
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${url.pathname}`
    const rewriteResponse = NextResponse.rewrite(url)
    
    // Copy session cookies to rewrite response
    supabaseResponse.cookies.getAll().forEach(c => {
      rewriteResponse.cookies.set(c.name, c.value, c)
    })
    
    return rewriteResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
