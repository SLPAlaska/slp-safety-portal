import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // Always allow these routes without any checks
  if (
    pathname === '/lms/login' ||
    pathname === '/lms/change-password' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next({ request })
  }

  // Protect learner routes
  if (pathname.startsWith('/lms/')) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/lms/login', request.url))
    }

    return response
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/lms/:path*'],
}
