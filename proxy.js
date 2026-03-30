import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  const { pathname } = request.nextUrl
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

  // ── LMS LEARNER ROUTES (/lms/*) ─────────────────────────────
  if (pathname.startsWith('/lms')) {
    if (pathname === '/lms/login') return response
    if (!user) return NextResponse.redirect(new URL('/lms/login', request.url))
    if (pathname === '/lms/change-password') return response
    return response
  }

  // Admin routes (/admin/lms) — no redirect, page handles its own auth
  return response
}

export const config = {
  matcher: ['/lms/:path*'],
}
