'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TABS = ['Companies', 'Users', 'Courses', 'Assignments']

// ─── Helpers ────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{title}</h2>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

// ─── COMPANIES TAB ──────────────────────────────────────────
function CompaniesTab() {
  const [companies, setCompanies] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('lms_companies')
      .select('*')
      .order('name')
    setCompanies(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    const { error: err } = await supabase.from('lms_companies').insert({
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      notes: form.notes.trim() || null,
      active: true,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowModal(false)
    setForm({ name: '', slug: '', notes: '' })
    load()
  }

  async function toggleActive(company) {
    await supabase
      .from('lms_companies')
      .update({ active: !company.active })
      .eq('id', company.id)
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Client Companies</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Company</button>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            {['Company Name', 'Slug', 'Status', 'Notes', 'Actions'].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.id} style={S.tr}>
              <td style={S.td}>{c.name}</td>
              <td style={S.td}><code style={S.code}>{c.slug}</code></td>
              <td style={S.td}>
                <span style={c.active ? S.badgeGreen : S.badgeGray}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={S.td}>{c.notes || '—'}</td>
              <td style={S.td}>
                <button style={S.btnSmall} onClick={() => toggleActive(c)}>
                  {c.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
          {companies.length === 0 && (
            <tr><td colSpan={5} style={S.empty}>No companies yet.</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Add Company" onClose={() => setShowModal(false)}>
          <Field label="Company Name *">
            <input style={S.input} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} />
          </Field>
          <Field label="Slug (auto-generated, editable)">
            <input style={S.input} value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </Field>
          <Field label="Notes">
            <textarea style={S.textarea} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Saving…' : 'Save Company'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── USERS TAB ──────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', username: '',
    job_title: '', company_id: '', password: '',
  })

  const load = useCallback(async () => {
    const [{ data: u }, { data: c }] = await Promise.all([
      supabase.from('lms_users').select('*, lms_companies(name)').order('full_name'),
      supabase.from('lms_companies').select('id, name').eq('active', true).order('name'),
    ])
    setUsers(u || [])
    setCompanies(c || [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setError('')
    setSaving(true)
    const res = await fetch('/api/lms/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setForm({ full_name: '', email: '', username: '', job_title: '', company_id: '', password: '' })
    load()
  }

  async function handleDeactivate(user) {
    if (!confirm(`Deactivate ${user.full_name}? They will no longer be able to log in.`)) return
    await fetch('/api/lms/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, auth_user_id: user.auth_user_id }),
    })
    load()
  }

  async function handleReactivate(user) {
    await supabase.from('lms_users').update({ active: true }).eq('id', user.id)
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Learner Accounts</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add User</button>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            {['Name', 'Email', 'Username', 'Company', 'Job Title', 'Status', 'Actions'].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={S.tr}>
              <td style={S.td}>{u.full_name}</td>
              <td style={S.td}>{u.email}</td>
              <td style={S.td}><code style={S.code}>{u.username}</code></td>
              <td style={S.td}>{u.lms_companies?.name || '—'}</td>
              <td style={S.td}>{u.job_title || '—'}</td>
              <td style={S.td}>
                <span style={u.active ? S.badgeGreen : S.badgeGray}>
                  {u.active ? (u.must_change_pw ? 'Pending Login' : 'Active') : 'Inactive'}
                </span>
              </td>
              <td style={S.td}>
                {u.active
                  ? <button style={S.btnSmallRed} onClick={() => handleDeactivate(u)}>Deactivate</button>
                  : <button style={S.btnSmall} onClick={() => handleReactivate(u)}>Reactivate</button>
                }
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={7} style={S.empty}>No learner accounts yet.</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Create Learner Account" onClose={() => setShowModal(false)}>
          <Field label="Full Name *">
            <input style={S.input} value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Email Address *">
            <input style={S.input} type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Username *">
            <input style={S.input} value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </Field>
          <Field label="Job Title">
            <input style={S.input} value={form.job_title}
              onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </Field>
          <Field label="Company *">
            <select style={S.input} value={form.company_id}
              onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
              <option value="">— Select Company —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Temporary Password *">
            <input style={S.input} type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 characters — learner must change on first login" />
          </Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleCreate}
            disabled={saving || !form.full_name || !form.email || !form.username || !form.company_id || !form.password}>
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── COURSES TAB ────────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showSlideModal, setShowSlideModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', completion_text: '',
    regulation_ref: '', pass_score: 80, max_quiz_attempts: 0,
  })
  const [slideFiles, setSlideFiles] = useState([])
  const [speakerNotes, setSpeakerNotes] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('lms_courses')
      .select('*, lms_slides(count)')
      .order('title')
    setCourses(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreateCourse() {
    setError('')
    setSaving(true)
    const res = await fetch('/api/lms/create-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setForm({ title: '', description: '', completion_text: '', regulation_ref: '', pass_score: 80, max_quiz_attempts: 0 })
    load()
  }

  async function handleSlideUpload(course) {
    if (slideFiles.length === 0) { setError('Select at least one slide image.'); return }
    setError('')
    setSaving(true)

    for (let i = 0; i < slideFiles.length; i++) {
      setUploadProgress(`Uploading slide ${i + 1} of ${slideFiles.length}…`)
      const fd = new FormData()
      fd.append('file', slideFiles[i])
      fd.append('course_id', course.id)
      fd.append('slide_order', i + 1)
      fd.append('speaker_notes', speakerNotes[i] || '')

      const res = await fetch('/api/lms/upload-slide', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json()
        setError(`Slide ${i + 1} failed: ${d.error}`)
        setSaving(false)
        setUploadProgress('')
        return
      }
    }

    setSaving(false)
    setUploadProgress('')
    setSlideFiles([])
    setSpeakerNotes([])
    setShowSlideModal(null)
    load()
  }

  function handleSlideFileChange(e) {
    const files = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name))
    setSlideFiles(files)
    setSpeakerNotes(files.map(() => ''))
  }

  async function toggleCourseActive(course) {
    await supabase.from('lms_courses').update({ active: !course.active }).eq('id', course.id)
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Training Courses</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ New Course</button>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            {['Title', 'Regulation', 'Pass Score', 'Slides', 'Status', 'Actions'].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map(c => (
            <tr key={c.id} style={S.tr}>
              <td style={S.td}>{c.title}</td>
              <td style={S.td}>{c.regulation_ref || '—'}</td>
              <td style={S.td}>{c.pass_score}%</td>
              <td style={S.td}>{c.lms_slides?.[0]?.count ?? 0} slides</td>
              <td style={S.td}>
                <span style={c.active ? S.badgeGreen : S.badgeGray}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ ...S.td, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={S.btnSmall} onClick={() => { setShowSlideModal(c); setError('') }}>
                  Upload Slides
                </button>
                <button style={S.btnSmall} onClick={() => toggleCourseActive(c)}>
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr><td colSpan={6} style={S.empty}>No courses yet.</td></tr>
          )}
        </tbody>
      </table>

      {/* Create Course Modal */}
      {showModal && (
        <Modal title="New Training Course" onClose={() => setShowModal(false)}>
          <Field label="Course Title *">
            <input style={S.input} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Short Description">
            <textarea style={S.textarea} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Certificate Completion Text">
            <textarea style={{ ...S.textarea, minHeight: '100px' }} value={form.completion_text}
              placeholder="Has successfully completed the 40-Hour HazWoper initial training in accordance with…"
              onChange={e => setForm(f => ({ ...f, completion_text: e.target.value }))} />
          </Field>
          <Field label="Regulation Reference (e.g. 29 CFR 1910.120(e))">
            <input style={S.input} value={form.regulation_ref}
              onChange={e => setForm(f => ({ ...f, regulation_ref: e.target.value }))} />
          </Field>
          <Field label="Minimum Pass Score (%)">
            <input style={S.input} type="number" min={1} max={100} value={form.pass_score}
              onChange={e => setForm(f => ({ ...f, pass_score: parseInt(e.target.value) }))} />
          </Field>
          <Field label="Max Quiz Attempts (0 = unlimited)">
            <input style={S.input} type="number" min={0} value={form.max_quiz_attempts}
              onChange={e => setForm(f => ({ ...f, max_quiz_attempts: parseInt(e.target.value) }))} />
          </Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleCreateCourse} disabled={saving || !form.title}>
            {saving ? 'Creating…' : 'Create Course'}
          </button>
        </Modal>
      )}

      {/* Upload Slides Modal */}
      {showSlideModal && (
        <Modal title={`Upload Slides — ${showSlideModal.title}`} onClose={() => { setShowSlideModal(null); setSlideFiles([]); setSpeakerNotes([]) }}>
          <div style={S.infoBox}>
            <strong>How to export slides from PowerPoint:</strong><br />
            File → Export → Change File Type → PNG → Save Every Slide<br />
            Then select all exported PNG files below. They will be sorted alphabetically.
          </div>
          <Field label="Select Slide Images (PNG)">
            <input type="file" multiple accept="image/png,image/jpeg"
              onChange={handleSlideFileChange} style={{ marginTop: '4px' }} />
          </Field>

          {slideFiles.length > 0 && (
            <div style={S.slideList}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '13px' }}>
                {slideFiles.length} slides selected — enter speaker notes per slide:
              </p>
              {slideFiles.map((file, i) => (
                <div key={i} style={S.slideItem}>
                  <div style={S.slideLabel}>Slide {i + 1}: {file.name}</div>
                  <textarea
                    style={{ ...S.textarea, minHeight: '60px' }}
                    placeholder="Your talking points for this slide (will be read aloud to learner)"
                    value={speakerNotes[i] || ''}
                    onChange={e => {
                      const notes = [...speakerNotes]
                      notes[i] = e.target.value
                      setSpeakerNotes(notes)
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {uploadProgress && <div style={S.infoBox}>{uploadProgress}</div>}
          {error && <div style={S.error}>{error}</div>}

          <button style={S.btnPrimary}
            onClick={() => handleSlideUpload(showSlideModal)}
            disabled={saving || slideFiles.length === 0}>
            {saving ? uploadProgress || 'Uploading…' : `Upload ${slideFiles.length} Slide${slideFiles.length !== 1 ? 's' : ''}`}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── ASSIGNMENTS TAB ────────────────────────────────────────
function AssignmentsTab() {
  const [assignments, setAssignments] = useState([])
  const [companies, setCompanies] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ company_id: '', course_id: '', due_date: '' })

  const load = useCallback(async () => {
    const [{ data: a }, { data: c }, { data: co }] = await Promise.all([
      supabase.from('lms_assignments')
        .select('*, lms_companies(name), lms_courses(title)')
        .order('created_at', { ascending: false }),
      supabase.from('lms_companies').select('id, name').eq('active', true).order('name'),
      supabase.from('lms_courses').select('id, title').eq('active', true).order('title'),
    ])
    setAssignments(a || [])
    setCompanies(c || [])
    setCourses(co || [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAssign() {
    setError('')
    setSaving(true)
    const { error: err } = await supabase.from('lms_assignments').insert({
      company_id: form.company_id,
      course_id: form.course_id,
      due_date: form.due_date || null,
    })
    setSaving(false)
    if (err) { setError(err.message.includes('unique') ? 'This course is already assigned to that company.' : err.message); return }
    setShowModal(false)
    setForm({ company_id: '', course_id: '', due_date: '' })
    load()
  }

  async function handleRemove(assignment) {
    if (!confirm(`Remove "${assignment.lms_courses?.title}" from ${assignment.lms_companies?.name}?`)) return
    await supabase.from('lms_assignments').delete().eq('id', assignment.id)
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Course Assignments</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Assign Course</button>
      </div>

      <p style={S.hint}>
        Assigning a course to a company gives access to <strong>all active users</strong> in that company.
      </p>

      <table style={S.table}>
        <thead>
          <tr>
            {['Company', 'Course', 'Due Date', 'Assigned', 'Actions'].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assignments.map(a => (
            <tr key={a.id} style={S.tr}>
              <td style={S.td}>{a.lms_companies?.name}</td>
              <td style={S.td}>{a.lms_courses?.title}</td>
              <td style={S.td}>{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
              <td style={S.td}>{new Date(a.assigned_at).toLocaleDateString()}</td>
              <td style={S.td}>
                <button style={S.btnSmallRed} onClick={() => handleRemove(a)}>Remove</button>
              </td>
            </tr>
          ))}
          {assignments.length === 0 && (
            <tr><td colSpan={5} style={S.empty}>No assignments yet.</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Assign Course to Company" onClose={() => setShowModal(false)}>
          <Field label="Company *">
            <select style={S.input} value={form.company_id}
              onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
              <option value="">— Select Company —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Course *">
            <select style={S.input} value={form.course_id}
              onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
              <option value="">— Select Course —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Due Date (optional)">
            <input style={S.input} type="date" value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleAssign}
            disabled={saving || !form.company_id || !form.course_id}>
            {saving ? 'Assigning…' : 'Assign Course'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────
export default function AdminLmsPage() {
  const [activeTab, setActiveTab] = useState('Companies')

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>LMS Administration</h1>
          <p style={S.pageSubtitle}>Manage companies, learner accounts, courses, and assignments</p>
        </div>
        <a href="/" style={S.backLink}>← Back to Portal</a>
      </div>

      {/* Tab Bar */}
      <div style={S.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{ ...S.tabBtn, ...(activeTab === tab ? S.tabBtnActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={S.tabContent}>
        {activeTab === 'Companies'   && <CompaniesTab />}
        {activeTab === 'Users'       && <UsersTab />}
        {activeTab === 'Courses'     && <CoursesTab />}
        {activeTab === 'Assignments' && <AssignmentsTab />}
      </div>
    </div>
  )
}

// ─── STYLES ─────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  pageSubtitle: { fontSize: '14px', color: '#666', margin: 0 },
  backLink: { fontSize: '13px', color: '#b71c1c', textDecoration: 'none', fontWeight: '600', marginTop: '4px' },
  tabBar: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #ddd', paddingBottom: '0' },
  tabBtn: { padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#666', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabBtnActive: { color: '#b71c1c', borderBottom: '2px solid #b71c1c' },
  tabContent: { background: '#fff', borderRadius: '10px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f7f7f9', color: '#555', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e5e5' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 12px', color: '#333', verticalAlign: 'middle' },
  empty: { padding: '24px', textAlign: 'center', color: '#aaa', fontSize: '14px' },
  hint: { fontSize: '13px', color: '#666', marginBottom: '16px', marginTop: '-4px' },
  badgeGreen: { background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgeGray: { background: '#f5f5f5', color: '#999', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  code: { background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  btnPrimary: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnSmall: { background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnSmallRed: { background: '#ffebee', color: '#b71c1c', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' },
  modal: { background: '#fff', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444' },
  input: { padding: '9px 12px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '9px 12px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'Arial, Helvetica, sans-serif' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  infoBox: { background: '#e3f2fd', border: '1px solid #bbdefb', color: '#1565c0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', lineHeight: '1.6' },
  slideList: { maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #eee', borderRadius: '8px', padding: '12px' },
  slideItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  slideLabel: { fontSize: '12px', fontWeight: '700', color: '#555' },
}
