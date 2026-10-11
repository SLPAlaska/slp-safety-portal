// SLP Safety Portal Help Desk: offline copy of /help only.
//
// Registered by app/help/page.js with scope '/help', so it controls the Help
// Desk page and nothing else: every other page of the portal (forms, SafeSubmit,
// sign-in, LMS) never passes through this worker.
//
// Strategy: network first, cached copy when there is no signal. The page and
// the script/style files it loads are cached as they are fetched, and on
// install the page is fetched once and its /_next/static files pre-cached.
const CACHE = 'slp-help-v1'
const PAGE = '/help'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    try {
      const res = await fetch(PAGE, { cache: 'no-store' })
      if (res.ok) {
        const html = await res.clone().text()
        await cache.put(PAGE, res)
        const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))]
        await Promise.all(assets.map((a) => cache.add(a).catch(() => {})))
      }
    } catch (e) { /* offline at install: cached on the next online visit */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('slp-help-') && k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  const isPage = req.mode === 'navigate' && url.pathname === PAGE
  const isAsset = url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)
  if (!isPage && !isAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    if (isAsset) {
      // Hashed build files never change: cache first.
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) cache.put(req, res.clone())
      return res
    }
    try {
      const res = await fetch(req)
      if (res.ok) cache.put(PAGE, res.clone())
      return res
    } catch (e) {
      const hit = await cache.match(PAGE)
      if (hit) return hit
      throw e
    }
  })())
})
