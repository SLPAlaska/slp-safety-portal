// Test-only ESM resolve hook: maps '@/x' to app/x and swaps the Supabase client
// for an in-memory mock so these checks can never reach a real project.
import { pathToFileURL } from 'node:url'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export async function resolve(spec, ctx, next) {
  if (spec === '@supabase/supabase-js') return { url: pathToFileURL(join(root, 'scripts/lms-admin-auth/mockSupabase.mjs')).href, shortCircuit: true }
  if (spec.startsWith('@/')) {
    let p = join(root, 'app', spec.slice(2))
    if (!existsSync(p)) p += '.js'
    return { url: pathToFileURL(p).href, shortCircuit: true }
  }
  if (spec === 'next/server') return next('next/server.js', ctx)
  return next(spec, ctx)
}
