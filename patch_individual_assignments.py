#!/usr/bin/env python3
"""
Patches app/admin/lms/page.js — rebuilds the super-admin
Individual Assignments tab:

  1. Drops the role=='learner' filter so company_admin users
     (e.g. Kevin Robinson / GBR) appear in the employee picker.
  2. Adds a "Company" dropdown filter above the table.
  3. Adds a "Search by name" input above the table.
  4. Upgrades the course selector from single-select to
     multi-course checklist (same UX as the company admin page).
  5. Shows a result count so 125+ Pollard users don't disappear
     into a scroll hole.

Run from project root:
    python patch_individual_assignments.py
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
# Locate the IndividualAssignmentsTab section by its header marker
# and the NEXT section marker after it.
# ----------------------------------------------------------------
start_re = re.compile(r"//\s*[─\-=]+\s*INDIVIDUAL ASSIGNMENTS TAB[^\n]*\n")
start_m = start_re.search(s)
if not start_m:
    print("ERROR: Could not locate the '// --- INDIVIDUAL ASSIGNMENTS TAB' marker.")
    print("       Scan the file for the tab's header comment and let me know what")
    print("       it looks like so I can adjust the pattern.")
    sys.exit(1)

start_idx = start_m.start()

# Next marker: any line of the form "// <box-drawing-or-dashes> SOMETHING"
next_re = re.compile(r"\n//\s*[─\-=]{3,}[^\n]*\n")
next_m = next_re.search(s, pos=start_m.end())
if not next_m:
    print("ERROR: Could not find the next section marker after IndividualAssignmentsTab.")
    sys.exit(1)

end_idx = next_m.start() + 1  # keep the trailing \n on previous section

old_section = s[start_idx:end_idx]
print(f"Located IndividualAssignmentsTab: {len(old_section)} chars "
      f"(offset {start_idx}->{end_idx})")

# ----------------------------------------------------------------
# Replacement component
# ----------------------------------------------------------------
NEW_TAB = r'''// ─── INDIVIDUAL ASSIGNMENTS TAB ─────────────────────────────
function IndividualAssignmentsTab() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ user_id: '', course_ids: [], due_date: '' })

  const load = useCallback(async () => {
    const [ar, ur, cor, comr] = await Promise.all([
      fetch('/api/lms/individual-assignments'),
      fetch('/api/lms/users'),
      fetch('/api/lms/courses'),
      fetch('/api/lms/companies'),
    ])
    const [ad, ud, cod, comd] = await Promise.all([
      ar.json(), ur.json(), cor.json(), comr.json(),
    ])
    setAssignments(ad.assignments || [])
    setUsers((ud.users || []).filter(u => u.active))
    setCourses((cod.courses || []).filter(c => c.active))
    setCompanies((comd.companies || []).filter(c => c.active !== false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAssign() {
    setError('')
    setSaving(true)
    let anyError = null
    for (const course_id of form.course_ids) {
      const res = await fetch('/api/lms/individual-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: form.user_id,
          course_id,
          due_date: form.due_date || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) anyError = data.error
    }
    setSaving(false)
    if (anyError) { setError(anyError); return }
    setShowModal(false)
    setForm({ user_id: '', course_ids: [], due_date: '' })
    load()
  }

  async function handleRemove(a) {
    if (!confirm(`Remove "${a.lms_courses?.title}" from ${a.lms_users?.full_name}?`)) return
    await fetch('/api/lms/individual-assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    })
    load()
  }

  function toggleCourse(courseId) {
    setForm(f => {
      const ids = f.course_ids.includes(courseId)
        ? f.course_ids.filter(id => id !== courseId)
        : [...f.course_ids, courseId]
      return { ...f, course_ids: ids }
    })
  }

  // Filtered views based on company dropdown + name search
  const filteredUsers = users.filter(u => {
    if (companyFilter && u.company_id !== companyFilter) return false
    if (nameSearch && !(u.full_name || '').toLowerCase().includes(nameSearch.toLowerCase())) return false
    return true
  })

  const filteredAssignments = assignments.filter(a => {
    const uCompany = a.lms_users?.company_id || a.lms_users?.lms_companies?.id
    if (companyFilter && uCompany !== companyFilter) return false
    if (nameSearch && !(a.lms_users?.full_name || '').toLowerCase().includes(nameSearch.toLowerCase())) return false
    return true
  })

  const alreadyAssigned = new Set(
    assignments.filter(a => a.user_id === form.user_id).map(a => a.course_id)
  )

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Individual Assignments</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Assign Courses</button>
      </div>
      <div style={S.infoBox}>
        Individual assignments are <strong>hazard-based</strong> — assign specific courses to specific workers based on their actual job duties and exposure.
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, margin: '16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
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
        {(companyFilter || nameSearch) && (
          <button
            style={{ ...S.btnSmall, margin: 0 }}
            onClick={() => { setCompanyFilter(''); setNameSearch('') }}
          >
            Clear
          </button>
        )}
        <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 'auto' }}>
          {filteredAssignments.length} of {assignments.length} assignments
        </span>
      </div>

      <table style={S.table}>
        <thead>
          <tr>{['Employee', 'Company', 'Course', 'Due Date', 'Assigned', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {filteredAssignments.map(a => (
            <tr key={a.id} style={S.tr}>
              <td style={S.td}>{a.lms_users?.full_name}</td>
              <td style={S.td}>{a.lms_users?.lms_companies?.name || '—'}</td>
              <td style={S.td}>{a.lms_courses?.title}</td>
              <td style={S.td}>{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
              <td style={S.td}>{new Date(a.assigned_at).toLocaleDateString()}</td>
              <td style={S.td}><button style={S.btnSmallRed} onClick={() => handleRemove(a)}>Remove</button></td>
            </tr>
          ))}
          {filteredAssignments.length === 0 && (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#6b7280', padding: 24 }}>
              No assignments match the current filters.
            </td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Assign Courses">
          {error && <div style={S.errorBox}>{error}</div>}

          <label style={S.label}>Filter by company</label>
          <select
            value={companyFilter}
            onChange={e => { setCompanyFilter(e.target.value); setForm(f => ({ ...f, user_id: '', course_ids: [] })) }}
            style={S.input}
          >
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label style={S.label}>Employee ({filteredUsers.length})</label>
          <select
            value={form.user_id}
            onChange={e => setForm({ ...form, user_id: e.target.value, course_ids: [] })}
            style={S.input}
          >
            <option value="">Select employee…</option>
            {filteredUsers.map(u => {
              const companyName = u.lms_companies?.name
                || companies.find(c => c.id === u.company_id)?.name
                || ''
              const roleTag = u.role && u.role !== 'learner' ? ` [${u.role}]` : ''
              return (
                <option key={u.id} value={u.id}>
                  {u.full_name}{companyName ? ` — ${companyName}` : ''}{roleTag}
                </option>
              )
            })}
          </select>

          {form.user_id && (
            <>
              <label style={S.label}>Courses (select one or more)</label>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
                {courses.map(c => {
                  const isAssigned = alreadyAssigned.has(c.id)
                  const isChecked = form.course_ids.includes(c.id)
                  return (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', opacity: isAssigned ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAssigned}
                        onChange={() => toggleCourse(c.id)}
                        style={{ marginRight: 8 }}
                      />
                      {c.title}{isAssigned ? ' (already assigned)' : ''}
                    </label>
                  )
                })}
              </div>
            </>
          )}

          <label style={S.label}>Due Date (optional)</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
            style={S.input}
          />

          <button
            style={S.btnPrimary}
            onClick={handleAssign}
            disabled={saving || !form.user_id || form.course_ids.length === 0}
          >
            {saving ? 'Saving…' : `Assign ${form.course_ids.length} course${form.course_ids.length === 1 ? '' : 's'}`}
          </button>
        </Modal>
      )}
    </div>
  )
}

'''

# ----------------------------------------------------------------
# Splice in
# ----------------------------------------------------------------
new_s = s[:start_idx] + NEW_TAB + s[end_idx:]

# Sanity checks
checks = {
    "role filter removed":          "u.role==='learner'"  not in new_s[start_idx:start_idx+len(NEW_TAB)],
    "companies state added":        "setCompanies"        in new_s,
    "companyFilter added":          "companyFilter"       in new_s,
    "nameSearch added":             "nameSearch"          in new_s,
    "multi-select course_ids":      "course_ids: []"      in new_s,
    "companies fetch added":        "/api/lms/companies"  in new_s,
    "IndividualAssignmentsTab still referenced": "<IndividualAssignmentsTab" in new_s,
}
failed = [k for k, v in checks.items() if not v]
if failed:
    print("FAILED sanity checks:", failed)
    sys.exit(1)

FILE.write_text(new_s, encoding="utf-8")

print("OK  Patched app/admin/lms/page.js")
print(f"    Old section: {len(old_section):>6} chars")
print(f"    New section: {len(NEW_TAB):>6} chars")
print()
print("Next:")
print('  git add app/admin/lms/page.js')
print('  git commit -m "Admin: fix role filter, add company+name filters to Individual Assignments"')
print('  git push origin main')
