import { NextResponse } from 'next/server'
import { isPathEnabled } from './app/lib/modules'

// All LMS auth protection is handled client-side by each page.
// The Supabase JS client uses localStorage for sessions which is
// not accessible server-side — proxy-level auth checks don't work with it.
//
// The only thing this proxy decides is the module switches (config/modules.json,
// config/portal.json): a page or API route that belongs to a module switched off
// answers 404. With every module on (the default) every request passes through
// unchanged.
export async function proxy(request) {
  const path = request.nextUrl.pathname
  if (!isPathEnabled(path)) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse('Not found', { status: 404 })
  }
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|mp4|pdf|PNG|json|txt|xml|js|css|map|woff2?)$).*)',
  ],
}
