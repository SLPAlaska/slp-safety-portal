// lib/courseStatus.js
//
// Shared helper for computing compliance status for a user-course pair.
// Pure function — no Supabase calls. Call from both server and client code.
//
// Status values:
//   'never'    — no completion recorded (required or assigned but never done)
//   'overdue'  — completion expired (past refresher due date)
//   'due_soon' — expires within DUE_SOON_DAYS
//   'current'  — completed and not yet due for refresher
//
// Colors:
//   never    -> red
//   overdue  -> red
//   due_soon -> yellow
//   current  -> green

export const DUE_SOON_DAYS = 90 // 3 months

export const STATUS_COLORS = {
  current:  { bg: '#dcfce7', fg: '#166534', border: '#86efac', label: 'Current'  },
  due_soon: { bg: '#fef9c3', fg: '#854d0e', border: '#fde047', label: 'Due Soon' },
  overdue:  { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', label: 'Overdue'  },
  never:    { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', label: 'Not Completed' },
}

/**
 * Compute status for a single user/course pair.
 *
 * @param {string|Date|null} completedAt      ISO timestamp of most recent completion, or null
 * @param {number|null} refresherFrequencyMonths  Months between refreshers. null = one-time.
 * @param {Date}   [now=new Date()]           Reference date for testing
 * @returns {{ status: string, expiresAt: Date|null, daysUntilExpiry: number|null }}
 */
export function getCourseStatus(completedAt, refresherFrequencyMonths, now = new Date()) {
  if (!completedAt) {
    return { status: 'never', expiresAt: null, daysUntilExpiry: null }
  }

  const completed = new Date(completedAt)
  if (isNaN(completed.getTime())) {
    return { status: 'never', expiresAt: null, daysUntilExpiry: null }
  }

  // One-time course — any completion is permanently current
  if (!refresherFrequencyMonths) {
    return { status: 'current', expiresAt: null, daysUntilExpiry: null }
  }

  const expires = new Date(completed)
  expires.setMonth(expires.getMonth() + refresherFrequencyMonths)
  const msPerDay = 24 * 60 * 60 * 1000
  const daysUntilExpiry = Math.floor((expires.getTime() - now.getTime()) / msPerDay)

  let status
  if (daysUntilExpiry < 0) status = 'overdue'
  else if (daysUntilExpiry <= DUE_SOON_DAYS) status = 'due_soon'
  else status = 'current'

  return { status, expiresAt: expires, daysUntilExpiry }
}

/**
 * Format a frequency number as a human label.
 */
export function formatFrequency(months) {
  if (!months) return 'One-time'
  if (months === 12) return 'Annual'
  if (months === 24) return '2 years'
  if (months === 36) return '3 years'
  if (months === 60) return '5 years'
  return `${months} months`
}
