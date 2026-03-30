import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // Build a Supabase client that can read/write cookies in middleware
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

  // Refresh session — required to keep auth alive
  const { data: { user } } = await supabase.auth.getUser()

  // ── LMS ROUTES (/lms/*) ──────────────────────────────────────
  if (pathname.startsWith('/lms')) {
    // Public route — always allow
    if (pathname === '/lms/login') return response

    // Not logged in → send to LMS login
    if (!user) {
      return NextResponse.redirect(new URL('/lms/login', request.url))
    }

    // Logged in — check they have an lms_users row
    // (admin @slpalaska.com users should NOT access learner routes)
    if (user.email?.endsWith('@slpalaska.com')) {
      // Admin trying to hit learner routes — redirect to admin panel
      return NextResponse.redirect(new URL('/admin/lms', request.url))
    }

    // Allow change-password without lms_users check
    if (pathname === '/lms/change-password') return response

    return response
  }

  // ── ADMIN LMS ROUTES (/admin/lms/*) ──────────────────────────
  if (pathname.startsWith('/admin/lms')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Only @slpalaska.com addresses can access admin
    if (!user.email?.endsWith('@slpalaska.com')) {
      return NextResponse.redirect(new URL('/lms/dashboard', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/lms/:path*',
    '/admin/lms/:path*',
  ],
}
