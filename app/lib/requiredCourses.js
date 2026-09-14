// app/lib/requiredCourses.js
//
// Single source of truth for turning a company's required-course list into the
// list that actually applies to one employee.
//
// Two independent opt-outs subtract from that list:
//   - lms_users.exempt_from_required  — all-courses exemption for one employee
//   - lms_required_exclusions         — per-employee, per-course opt-out
//
// Both must be applied together everywhere an effective required list is
// computed, so every route that builds one imports from this file.
//
// Individual assignments (lms_individual_assignments) are NOT affected by
// either opt-out — they always apply.

import { pageAllIn } from '@/lib/supabasePage'

/**
 * Loads per-learner required-course exclusions for the given user ids.
 * Degrades to [] if the table doesn't exist yet.
 */
export async function fetchExclusions(supabaseAdmin, userIds) {
  const { data, error } = await pageAllIn(
    supabaseAdmin, 'lms_required_exclusions', 'user_id, course_id', 'user_id', userIds,
  )
  return error ? [] : (data || [])
}

/** Builds a fast (userId, courseId) => boolean lookup over an exclusions array. */
export function makeIsExcluded(exclusions) {
  const keys = new Set((exclusions || []).map(x => `${x.user_id}|${x.course_id}`))
  return (userId, courseId) => keys.has(`${userId}|${courseId}`)
}

/**
 * The required course ids that actually apply to one employee: none if they are
 * exempt, otherwise the company list minus their per-course exclusions.
 *
 * @param {string[]} requiredIds  company-wide required course ids
 * @param {{id: string, exempt_from_required?: boolean}} employee
 * @param {(userId: string, courseId: string) => boolean} isExcluded
 */
export function effectiveRequiredIds(requiredIds, employee, isExcluded) {
  if (!employee || employee.exempt_from_required) return []
  if (!isExcluded) return [...(requiredIds || [])]
  return (requiredIds || []).filter(cid => !isExcluded(employee.id, cid))
}
