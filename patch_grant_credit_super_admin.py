#!/usr/bin/env python3
"""
Patches app/admin/lms/page.js to add a Grant Credit tab to the
SLP Alaska super admin panel.

Adds:
  1. 'Grant Credit' to the TABS array
  2. Tab render line for <GrantCreditTab />
  3. GrantCreditTab component (company filter, name search, user picker,
     multi-course select, completion date, optional note, submit)

Idempotent — re-running is safe.

Run from project root:
    python patch_grant_credit_super_admin.py
"""
import re
import sys
from pathlib import Path

FILE = Path("app/admin/lms/page.js")
if not FILE.exists():
    print(f"ERROR: {FILE} not found. Run from project root.")
    sys.exit(1)

s = FILE.read_text(encoding="utf-8")

# ----------------------------------------------------------------
# 1. Add 'Grant Credit' to TABS array
# ----------------------------------------------------------------
if "'Grant Credit'" not in s:
    # Match any TABS array containing 'Individual Assignments'
    tabs_re = re.compile(r"(const\s+TABS\s*=\s*\[[^\]]*'Individual Assignments'[^\]]*)\]")
    m = tabs_re.search(s)
    if not m:
        print("ERROR: could not find TABS array containing 'Individual Assignments'.")
        sys.exit(1)
    s = tabs_re.sub(m.group(1) + ", 'Grant Credit']", s, count=1)
    print("OK  Added 'Grant Credit' to TABS array")
else:
    print("--  'Grant Credit' already in TABS array; skipping")

# ----------------------------------------------------------------
# 2. Add tab render line
# ----------------------------------------------------------------
if "<GrantCreditTab" not in s:
    # Find any existing IndividualAssignments render line and add after it
    render_re = re.compile(r"(\{activeTab\s*===\s*'Individual Assignments'\s*&&\s*<IndividualAssignmentsTab\s*/>\})")
    m = render_re.search(s)
    if not m:
        print("ERROR: could not find IndividualAssignmentsTab render line.")
        sys.exit(1)
    new_line = "\n        {activeTab === 'Grant Credit'            && <GrantCreditTab />}"
    s = s.replace(m.group(1), m.group(1) + new_line, 1)
    print("OK  Added <GrantCreditTab /> render line")
else:
    print("--  <GrantCreditTab /> render already present; skipping")

# ----------------------------------------------------------------
# 3. Append GrantCreditTab component if not already present
# ----------------------------------------------------------------
if "function GrantCreditTab" not in s:
    GRANT_TAB = r'''

// ─── GRANT CREDIT TAB ───────────────────────────────────────
function GrantCreditTab() {
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [courseIds, setCourseIds] = useState([])
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])

  const load = useCallback(async () => {
    const [ur, cor, comr] = await Promise.all([
      fetch('/api/lms/users'),
      fetch('/api/lms/courses'),
      fetch('/api/lms/companies'),
    ])
    const [ud, cod, comd] = await Promise.all([ur.json(), cor.json(), comr.json()])
    setUsers((ud.users || []).filter(u => u.active))
    setCourses((cod.courses || []).filter(c => c.active))
    setCompanies((comd.companies || []).filter(c => c.active !== false))
  }, [])

  useEffect(() => { load() }, [load])

  const filteredUsers = users.filter(u => {
    if (companyFilter && u.company_id !== companyFilter) return false
    if (nameSearch && !(u.full_name || '').toLowerCase().includes(nameSearch.toLowerCase())) return false
    return true
  })

  function toggleCourse(id) {
    setCourseIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function handleGrant() {
    setError(''); setResults([]); setSaving(true)
    // Get auth token — same pattern as other admin actions
    const { data: { session } } = await (await import('@supabase/ssr')).createBrowserClient
      ? { data: { session: null } }
      : { data: { session: null } }
    // Fallback: the admin page already has auth in cookies; the route accepts Bearer header,
    // so we pull from window.localStorage (Supabase default) as a last resort.
    let token = null
    try {
      const raw = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (raw) token = JSON.parse(localStorage.getItem(raw))?.access_token
    } catch {}

    const out = []
    for (const course_id of courseIds) {
      const res = await fetch('/api/lms/grant-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: userId,
          course_id,
          completed_at: completedAt,
          grant_note: note || null,
        }),
      })
      const data = await res.json()
      out.push(res.ok
        ? { ok: true, course: data.course, cert: data.cert_number }
        : { ok: false, course: courses.find(c => c.id === course_id)?.title || course_id, error: data.error })
    }
    setSaving(false)
    setResults(out)
    if (out.every(r => r.ok)) {
      setCourseIds([])
      setNote('')
    } else {
      setError('One or more grants failed. See details below.')
    }
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Grant Course Credit</h2>
      </div>
      <div style={S.infoBox}>
        Grant credit for training completed elsewhere (previous employer, in-person class, etc.)
        without requiring the learner to take the quiz. Issues a certificate and records the admin grant.
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}>
        <select
          value={companyFilter}
          onChange={e => { setCompanyFilter(e.target.value); setUserId('') }}
          style={{ ...S.input, minWidth: 220, margin: 0 }}
        >
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search by name..."
          value={nameSearch}
          onChange={e => setNameSearch(e.target.value)}
          style={{ ...S.input, minWidth: 240, margin: 0 }}
        />
      </div>

      <label style={S.label}>Employee ({filteredUsers.length})</label>
      <select value={userId} onChange={e => setUserId(e.target.value)} style={S.input}>
        <option value="">Select employee…</option>
        {filteredUsers.map(u => {
          const companyName = u.lms_companies?.name
            || companies.find(c => c.id === u.company_id)?.name
            || ''
          return (
            <option key={u.id} value={u.id}>
              {u.full_name}{companyName ? ` — ${companyName}` : ''}
            </option>
          )
        })}
      </select>

      {userId && (
        <>
          <label style={S.label}>Courses ({courseIds.length} selected)</label>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            {courses.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  checked={courseIds.includes(c.id)}
                  onChange={() => toggleCourse(c.id)}
                  style={{ marginRight: 8 }}
                />
                {c.title}
              </label>
            ))}
          </div>

          <label style={S.label}>Completion Date</label>
          <input
            type="date"
            value={completedAt}
            onChange={e => setCompletedAt(e.target.value)}
            style={S.input}
          />

          <label style={S.label}>Note (optional)</label>
          <input
            type="text"
            placeholder="e.g., Completed at previous employer — cert on file"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={S.input}
          />

          <button
            style={S.btnPrimary}
            onClick={handleGrant}
            disabled={saving || !userId || courseIds.length === 0}
          >
            {saving ? 'Granting…' : `Grant ${courseIds.length} course${courseIds.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}

      {error && <div style={{ ...S.errorBox, marginTop: 16 }}>{error}</div>}

      {results.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
          <strong>Results:</strong>
          <ul style={{ margin: '8px 0 0 20px' }}>
            {results.map((r, i) => (
              <li key={i} style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>
                {r.ok
                  ? `✓ ${r.course} — cert ${r.cert}`
                  : `✗ ${r.course} — ${r.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
'''
    # Append at end of file
    s = s.rstrip() + "\n" + GRANT_TAB + "\n"
    print("OK  Appended GrantCreditTab component")
else:
    print("--  GrantCreditTab component already present; skipping")

# ----------------------------------------------------------------
# Write it back
# ----------------------------------------------------------------
FILE.write_text(s, encoding="utf-8")
print()
print("Patched app/admin/lms/page.js")
print()
print("Next:")
print('  git add app/admin/lms/page.js app/api/lms/grant-credit/route.js')
print('  git commit -m "Add Grant Credit tab + backend route to super admin"')
print('  git push origin main')
