import { NextResponse } from 'next/server'

// All LMS auth protection is handled client-side by each page.
// The Supabase JS client uses localStorage for sessions which is
// not accessible server-side — proxy-level auth checks don't work with it.
export async function proxy(request) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/lms/:path*'],
}
