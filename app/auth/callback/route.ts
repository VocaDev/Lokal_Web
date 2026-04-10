import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Logic for business-aware redirection
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: business } = await supabase
          .from('businesses')
          .select('website_builder_completed')
          .eq('owner_id', session.user.id)
          .maybeSingle()

        if (business) {
          if (!business.website_builder_completed) {
            return NextResponse.redirect(`${origin}/register/website-builder-choice`)
          }
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=verification_failed`)
}
