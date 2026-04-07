path = r'app\lms\company-dashboard\page.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = []

# 1. Add new state variables
replacements.append((
    "  const [assigning, setAssigning] = useState({})\n  const [assignSelects, setAssignSelects] = useState({})",
    "  const [assigning, setAssigning] = useState({})\n  const [assignSelects, setAssignSelects] = useState({})\n  const [showAddEmployee, setShowAddEmployee] = useState(false)\n  const [addForm, setAddForm] = useState({ full_name: '', email: '', username: '', job_title: '', password: '', work_location: '', department: '', employee_id: '', hire_date: '' })\n  const [addSaving, setAddSaving] = useState(false)\n  const [addError, setAddError] = useState('')\n  const [companyId, setCompanyId] = useState(null)\n  const [multiSelects, setMultiSelects] = useState({})"
))

# 2. Add new functions after load effect
replacements.append((
    "  useEffect(() => { load() }, [load])",
    """  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token) return
    fetch('/api/lms/company-admin/me', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.company_id) setCompanyId(d.company_id) })
  }, [token])

  async function handleAddEmployee() {
    setAddError(''); setAddSaving(true)
    const res = await fetch('/api/lms/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, company_id: companyId, role: 'learner' })
    })
    const data = await res.json()
    setAddSaving(false)
    if (!res.ok) { setAddError(data.error); return }
    setShowAddEmployee(false)
    setAddForm({ full_name: '', email: '', username: '', job_title: '', password: '', work_location: '', department: '', employee_id: '', hire_date: '' })
    load()
  }

  async function handleDeactivate(emp) {
    if (!confirm(`Deactivate ${emp.full_name}? They will lose access immediately.`)) return
    await fetch('/api/lms/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: emp.id, auth_user_id: emp.auth_user_id })
    })
    load()
  }

  async function handleReactivate(emp) {
    await fetch('/api/lms/reactivate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: emp.id, auth_user_id: emp.auth_user_id })
    })
    load()
  }

  function toggleMultiCourse(userId, courseId) {
    setMultiSelects(s => {
      const cur = s[userId] || []
      const next = cur.includes(courseId) ? cur.filter(id => id !== courseId) : [...cur, courseId]
      return { ...s, [userId]: next }
    })
  }

  async function handleMultiAssign(userId) {
    const courseIds = multiSelects[userId] || []
    if (!courseIds.length) return
    setAssigning(a => ({ ...a, [userId]: true }))
    for (const courseId of courseIds) {
      await fetch('/api/lms/company-admin/assign', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: courseId, action: 'assign' }),
      })
    }
    setAssigning(a => ({ ...a, [userId]: false }))
    setMultiSelects(s => ({ ...s, [userId]: [] }))
    load()
  }"""
))

# 3. Add employee button above search row
replacements.append((
    "        {/* Search + select all */}\n        <div style={S.searchRow}>",
    """        {/* Search + select all */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <button style={{ background: '#fbbf24', color: '#1a1a2e', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }} onClick={() => setShowAddEmployee(true)}>+ Add Employee</button>
        </div>
        <div style={S.searchRow}>"""
))

# 4. Add Deactivate/Reactivate to card header
replacements.append((
    "                      <button style={S.editBtn} onClick={() => setEditingEmployee(emp)}>\u270f Edit</button>",
    """                      <button style={S.editBtn} onClick={() => setEditingEmployee(emp)}>Edit</button>
                      {emp.active
                        ? <button style={{ background: '#ffebee', color: '#b71c1c', border: 'none', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }} onClick={() => handleDeactivate(emp)}>Deactivate</button>
                        : <button style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }} onClick={() => handleReactivate(emp)}>Reactivate</button>
                      }"""
))

# 5. Replace single dropdown with multi-select checklist
old_assign = """                  {/* Assign */}
                  <div style={S.assignRow}>
                    <select
                      style={S.assignSelect}
                      value={assignSelects[emp.id] || ''}
                      onChange={e => setAssignSelects(s => ({ ...s, [emp.id]: e.target.value }))}
                    >
                      <option value="">+ Assign a course\u2026</option>
                      {courses
                        .filter(c => !emp.courses.find(ec => ec.course_id === c.id))
                        .map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                      }
                    </select>
                    {assignSelects[emp.id] && (
                      <button style={S.assignBtn}
                        onClick={() => handleAssign(emp.id, assignSelects[emp.id])}
                        disabled={assigning[emp.id]}>
                        {assigning[emp.id] ? '\u2026' : 'Assign'}
                      </button>
                    )}
                  </div>"""
new_assign = """                  {/* Assign */}
                  <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0', background: '#f9f9fb' }}>
                    {(() => {
                      const available = courses.filter(c => !emp.courses.find(ec => ec.course_id === c.id))
                      const selected = multiSelects[emp.id] || []
                      if (available.length === 0) return <div style={{ fontSize: '11px', color: '#bbb', padding: '4px 0' }}>All courses assigned</div>
                      return (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>+ Assign courses</div>
                          <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', maxHeight: '140px', overflowY: 'auto', background: '#fff', marginBottom: '6px' }}>
                            {available.map(c => {
                              const sel = selected.includes(c.id)
                              return (
                                <div key={c.id} onClick={() => toggleMultiCourse(emp.id, c.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', cursor: 'pointer', background: sel ? '#e3f2fd' : '#fff', borderBottom: '1px solid #f5f5f5' }}>
                                  <div style={{ width: '13px', height: '13px', borderRadius: '3px', border: sel ? 'none' : '1.5px solid #ccc', background: sel ? '#1565c0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {sel && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>v</span>}
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#333' }}>{c.title}</span>
                                </div>
                              )
                            })}
                          </div>
                          {selected.length > 0 && (
                            <button style={{ ...S.assignBtn, width: '100%' }} onClick={() => handleMultiAssign(emp.id)} disabled={assigning[emp.id]}>
                              {assigning[emp.id] ? '...' : `Assign ${selected.length} Course${selected.length !== 1 ? 's' : ''}`}
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>"""
replacements.append((old_assign, new_assign))

# 6. Add AddEmployee modal before editingEmployee modal
replacements.append((
    "      {editingEmployee && (",
    """      {showAddEmployee && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Add Employee</h3>
              <button onClick={() => { setShowAddEmployee(false); setAddError('') }} style={S.closeBtn}>X</button>
            </div>
            {[['Full Name *', 'full_name', 'text'], ['Email *', 'email', 'email'], ['Username *', 'username', 'text'], ['Job Title', 'job_title', 'text'], ['Work Location', 'work_location', 'text'], ['Department', 'department', 'text'], ['Employee ID', 'employee_id', 'text']].map(([label, key, type]) => (
              <div key={key} style={S.field}>
                <label style={S.label}>{label}</label>
                <input type={type} style={S.input} value={addForm[key]} onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={S.field}>
              <label style={S.label}>Hire Date</label>
              <input type="date" style={S.input} value={addForm.hire_date} onChange={e => setAddForm(f => ({ ...f, hire_date: e.target.value }))} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Temporary Password *</label>
              <input type="password" style={S.input} value={addForm.password} placeholder="Min 8 characters" onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {addError && <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>{addError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={S.btnPrimary} onClick={handleAddEmployee} disabled={addSaving || !addForm.full_name || !addForm.email || !addForm.username || !addForm.password}>{addSaving ? 'Creating...' : 'Create Account'}</button>
              <button style={S.btnSecondary} onClick={() => { setShowAddEmployee(false); setAddError('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingEmployee && ("""
))

errors = []
for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
    else:
        errors.append(f'MISSING: {old[:60].strip()}')

if errors:
    for e in errors:
        print(e)
else:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done. All patches applied.')
