// Route tests for the LMS admin auth guard (SEC-B01, B02, B03, B04, B11).
// Usage: npm run check:lms-admin-auth
// Uses a mocked Supabase client (scripts/lms-admin-auth/mockSupabase.mjs): nothing here
// can reach any Supabase project, production or otherwise.
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register('./lms-admin-auth/loader.mjs', pathToFileURL(new URL('.', import.meta.url).pathname + '/'))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock'

const { SUPER_ADMIN_EMAILS } = await import('../app/lib/superAdmins.js')
const SUPER_EMAIL = SUPER_ADMIN_EMAILS[0]
const TARGET_ID = '00000000-0000-4000-8000-000000000001'

function reset() {
  globalThis.__mock = {
    users: { 'tok-super': { id: 'auth-super', email: SUPER_EMAIL }, 'tok-learner': { id: 'auth-learner', email: 'learner@example.invalid' } },
    calls: [],
    row(table) {
      if (table === 'lms_users') return { data: { id: TARGET_ID, auth_user_id: 'auth-target', full_name: 'Test Person', company_id: 'c1', role: 'learner', active: true }, error: null }
      return { data: [], error: null }
    },
  }
}
const req = (url, method, token, body) => new Request('http://localhost' + url, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
})

let fails = 0, passes = 0
const ok = (c, m) => { if (c) { passes++; console.log('PASS', m) } else { fails++; console.log('FAIL', m) } }

// Every guarded route and method: unauthenticated -> 401, signed-in non super admin -> 403.
const ROUTES = {
  'admin-reset-password': ['POST'], 'admin/company-matrix': ['GET'], companies: ['GET', 'POST', 'PATCH'],
  courses: ['PATCH'], 'create-course': ['POST'], slides: ['GET', 'DELETE', 'PATCH', 'PUT'],
  'quiz-questions': ['GET', 'POST', 'PATCH', 'DELETE'], 'upload-slide': ['POST'], 'upload-video': ['POST'],
  'generate-audio': ['POST'], 'ai-generate': ['POST'], 'ai-job-status': ['GET'], assignments: ['GET', 'POST', 'DELETE'],
  'required-courses': ['GET', 'POST', 'DELETE'],
  // company admins may also call these (scoped to their company); a learner still gets 403
  'courses#ca': ['GET'], 'individual-assignments': ['GET', 'POST', 'DELETE'], 'reactivate-user': ['POST'],
}
for (const [key, methods] of Object.entries(ROUTES)) {
  const route = key.replace('#ca', '')
  const mod = await import(`../app/api/lms/${route}/route.js`)
  for (const m of methods) {
    reset()
    const r1 = await mod[m](req(`/api/lms/${route}`, m, null, { user_id: TARGET_ID }))
    ok(r1.status === 401, `${m} /api/lms/${route} unauthenticated -> 401 (got ${r1.status})`)
    const r1b = await mod[m](req(`/api/lms/${route}`, m, 'tok-bogus', { user_id: TARGET_ID }))
    ok(r1b.status === 401, `${m} /api/lms/${route} invalid token -> 401 (got ${r1b.status})`)
    const r2 = await mod[m](req(`/api/lms/${route}`, m, 'tok-learner', { user_id: TARGET_ID }))
    ok(r2.status === 403, `${m} /api/lms/${route} signed-in non super admin -> 403 (got ${r2.status})`)
    ok(!globalThis.__mock.calls.some(c => c.op !== undefined && c.op !== 'select'), `${m} /api/lms/${route} refused callers caused no writes`)
  }
}

// admin-reset-password: success path and password rules.
const reset_ = await import('../app/api/lms/admin-reset-password/route.js')
reset()
const pw = 'Zq' + Math.random().toString(36).slice(2, 12)
const r3 = await reset_.POST(req('/api/lms/admin-reset-password', 'POST', 'tok-super', { user_id: TARGET_ID, password: pw }))
const body3 = await r3.text()
ok(r3.status === 200, `super admin reset -> 200 (got ${r3.status})`)
const upd = globalThis.__mock.calls.find(c => c.op === 'updateUserById')
ok(!!upd && upd.id === 'auth-target' && upd.attrs.password === pw, 'updateUserById called with the caller-supplied password')
ok(!body3.includes(pw) && !/password/i.test(body3), 'response body contains no password')
ok(globalThis.__mock.calls.some(c => c.op === 'update' && c.patch?.must_change_pw === true), 'must_change_pw set')
reset()
const r4 = await reset_.POST(req('/api/lms/admin-reset-password', 'POST', 'tok-super', { user_id: TARGET_ID }))
ok(r4.status === 400 && !globalThis.__mock.calls.some(c => c.op === 'updateUserById'), 'no password supplied -> 400, nothing changed')
reset()
const r5 = await reset_.POST(req('/api/lms/admin-reset-password', 'POST', 'tok-super', { user_id: TARGET_ID, password: 'short' }))
ok(r5.status === 400 && !globalThis.__mock.calls.some(c => c.op === 'updateUserById'), 'password under min length -> 400, nothing changed')

console.log(`\n${passes} passed, ${fails} failed`)
process.exit(fails ? 1 : 0)
