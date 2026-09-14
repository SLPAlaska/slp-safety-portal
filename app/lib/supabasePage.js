// app/lib/supabasePage.js
//
// Paginated Supabase reads.
//
// PostgREST returns at most 1000 rows per response and enforces that limit
// server-side — .range() past it does not return more. Several LMS tables are
// already well over that (lms_completions ~3.8k, lms_session_time ~4.4k,
// lms_quiz_attempts ~4k, lms_slides ~3k, lms_individual_assignments ~1.2k), so
// any bulk read of them silently returns a partial result.
//
// That failure is invisible and produces wrong answers rather than errors: a
// completion that falls past row 1000 looks exactly like a course the employee
// never took, which understates compliance.
//
// Both helpers return the same { data, error } shape the supabase-js client
// returns, so call sites keep their existing error handling.

export const PAGE_SIZE = 1000

/**
 * Run a query to exhaustion, one page at a time.
 *
 * @param {() => object} build  returns a fresh query builder on each call
 *                              (it is re-built per page so .range can differ)
 * @returns {Promise<{data: any[]|null, error: object|null}>}
 */
export async function pageAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    out.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return { data: out, error: null }
}

/**
 * Paginated `.in(column, values)` read. The value list is chunked as well so a
 * long id list cannot push the request URL past its length limit.
 *
 * Returns { data: [], error: null } for an empty value list, matching the
 * `ids.length ? await query : { data: [] }` guard these routes already use.
 */
export async function pageAllIn(supabase, table, select, column, values, chunkSize = 100) {
  const vals = [...new Set((values || []).filter(Boolean))]
  if (vals.length === 0) return { data: [], error: null }

  const out = []
  for (let i = 0; i < vals.length; i += chunkSize) {
    const chunk = vals.slice(i, i + chunkSize)
    const { data, error } = await pageAll(() => supabase.from(table).select(select).in(column, chunk))
    if (error) return { data: null, error }
    out.push(...data)
  }
  return { data: out, error: null }
}
