import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'
import { isMainDomain } from '@/lib/utils'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  const hostname = request.headers.get('host') || '';

  if (isMainDomain(hostname)) {
    // 1. Auth Protection for Dashboard
    const path = request.nextUrl.pathname
    const isDashboard = path.startsWith('/dashboard')
    // Pages that an authenticated user has no reason to visit — bounce them
    // back to the dashboard. /login, /register (and any sub-route), and the
    // password-recovery pair.
    const isAuthPage =
      path === '/login' ||
      path === '/forgot-password' ||
      path === '/reset-password' ||
      path === '/register'

    if (isDashboard && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthPage && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse;
  }

  // Reaches here only when isMainDomain(hostname) was false, so this IS a
  // tenant subdomain. Extract the first DNS label and rewrite into [subdomain].
  const subdomain = hostname.split('.')[0];

  if (subdomain) {
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${url.pathname}`
    const rewriteResponse = NextResponse.rewrite(url)

    // Copy session cookies to rewrite response so auth survives the rewrite.
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
