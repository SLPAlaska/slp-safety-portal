'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import BulkImportModal from '@/components/lms/BulkImportModal'

const TABS = ['Companies', 'Users', 'Courses', 'Quiz Builder', 'Required Courses', 'Individual Assignments']

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
  const [importCompany, setImportCompany] = useState(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/lms/companies')
    const data = await res.json()
    setCompanies(data.companies || [])
  }, [])

  useEffect(() => { load() }, [load])

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSave() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); setForm({ name: '', slug: '', notes: '' }); load()
  }

  async function toggleActive(company) {
    await fetch('/api/lms/companies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: company.id, active: !company.active }) })
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Client Companies</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Company</button>
      </div>
      <table style={S.table}>
        <thead><tr>{['Company Name','Slug','Status','Notes','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {companies.map(c=>(
            <tr key={c.id} style={S.tr}>
              <td style={S.td}>{c.name}</td>
              <td style={S.td}><code style={S.code}>{c.slug}</code></td>
              <td style={S.td}><span style={c.active?S.badgeGreen:S.badgeGray}>{c.active?'Active':'Inactive'}</span></td>
              <td style={S.td}>{c.notes||'—'}</td>
              <td style={{...S.td,display:'flex',gap:'6px'}}>
                <button style={S.btnSmall} onClick={()=>setImportCompany({id:c.id,name:c.name})}>Import Employees</button>
                <button style={S.btnSmall} onClick={()=>toggleActive(c)}>{c.active?'Deactivate':'Reactivate'}</button>
              </td>
            </tr>
          ))}
          {companies.length===0&&<tr><td colSpan={5} style={S.empty}>No companies yet.</td></tr>}
        </tbody>
      </table>
      {showModal&&(
        <Modal title="Add Company" onClose={()=>setShowModal(false)}>
          <Field label="Company Name *"><input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value,slug:slugify(e.target.value)}))} /></Field>
          <Field label="Slug (auto-generated, editable)"><input style={S.input} value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} /></Field>
          <Field label="Notes"><textarea style={S.textarea} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleSave} disabled={saving||!form.name}>{saving?'Saving…':'Save Company'}</button>
        </Modal>
      )}
      {importCompany&&(
        <BulkImportModal
          company={importCompany}
          onClose={()=>setImportCompany(null)}
          onComplete={()=>setImportCompany(null)}
        />
      )}
    </div>
  )
}

// ─── USERS TAB ──────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({full_name:'',email:'',username:'',job_title:'',company_id:'',password:'',role:'learner',work_location:'',client_project:'',department:'',employee_id:'',supervisor:'',hire_date:''})
  const [editForm, setEditForm] = useState({})

  const load = useCallback(async () => {
    const [ur,cr] = await Promise.all([fetch('/api/lms/users'),fetch('/api/lms/companies')])
    const [ud,cd] = await Promise.all([ur.json(),cr.json()])
    setUsers(ud.users||[])
    setCompanies((cd.companies||[]).filter(c=>c.active))
  }, [])

  useEffect(() => { load() }, [load])

  // Filter + search + sort
  const visibleUsers = users
    .filter(u => !filterCompany || u.company_id === filterCompany || u.lms_companies?.id === filterCompany)
    .filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const aLast = a.full_name?.split(' ').pop() || ''
      const bLast = b.full_name?.split(' ').pop() || ''
      return aLast.localeCompare(bLast)
    })

  async function handleCreate() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/create-user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setForm({full_name:'',email:'',username:'',job_title:'',company_id:'',password:'',role:'learner',work_location:'',client_project:'',department:'',employee_id:'',supervisor:'',hire_date:''})
    load()
  }

  function openEdit(user) {
    setEditUser(user)
    setEditForm({
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      job_title: user.job_title || '',
      company_id: user.company_id || user.lms_companies?.id || '',
      role: user.role || 'learner',
      work_location: user.work_location || '',
      department: user.department || '',
      employee_id: user.employee_id || '',
      hire_date: user.hire_date || '',
    })
    setError('')
  }

  async function handleEdit() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/users', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(editForm)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Save failed.'); return }
    setEditUser(null)
    load()
  }

  async function handleReactivate(user) {
    await fetch('/api/lms/reactivate-user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:user.id,auth_user_id:user.auth_user_id}) })
    load()
  }

  async function handleDeactivate(user) {
    if (!confirm(`Deactivate ${user.full_name}?`)) return
    await fetch('/api/lms/delete-user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:user.id,auth_user_id:user.auth_user_id}) })
    load()
  }

  async function handleDeleteUser(user) {
    if (!confirm(`PERMANENTLY DELETE "${user.full_name}"?\n\nThis will remove the user, all training records, certificates, and completions. This CANNOT be undone.`)) return
    const res = await fetch('/api/lms/delete-user-permanent', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_id: user.id })
    })
    if (!res.ok) {
      const d = await res.json()
      alert('Delete failed: ' + (d.error || 'Unknown error'))
      return
    }
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Learner Accounts</h2>
        <button style={S.btnPrimary} onClick={()=>setShowModal(true)}>+ Add User</button>
      </div>

      {/* Filter bar */}
      <div style={{display:'flex',gap:'12px',marginBottom:'16px',alignItems:'center',flexWrap:'wrap'}}>
        <select
          style={{...S.input,maxWidth:'220px',margin:0}}
          value={filterCompany}
          onChange={e=>setFilterCompany(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          style={{...S.input,maxWidth:'240px',margin:0}}
          placeholder="Search by name or username..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        <span style={{fontSize:'13px',color:'#94a3b8',fontWeight:'600',whiteSpace:'nowrap'}}>
          {visibleUsers.length} of {users.length} users
        </span>
      </div>

      <table style={S.table}>
        <thead><tr>{['Name','Email','Username','Company','Job Title','Role','Status','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {visibleUsers.map(u=>(
            <tr key={u.id} style={S.tr}>
              <td style={S.td}>{u.full_name}</td>
              <td style={S.td}>{u.email||<span style={{color:'#94a3b8',fontSize:'12px'}}>no email</span>}</td>
              <td style={S.td}><code style={S.code}>{u.username}</code></td>
              <td style={S.td}>{u.lms_companies?.name||'—'}</td>
              <td style={S.td}>{u.job_title||'—'}</td>
              <td style={S.td}><span style={u.role==='company_admin'?S.badgeBlue:S.badgeGray}>{u.role==='company_admin'?'Company Admin':'Learner'}</span></td>
              <td style={S.td}><span style={u.active?S.badgeGreen:S.badgeGray}>{u.active?(u.must_change_pw?'Pending Login':'Active'):'Inactive'}</span></td>
              <td style={{...S.td,display:'flex',gap:'5px',flexWrap:'wrap'}}>
                <button style={S.btnSmall} onClick={()=>openEdit(u)}>Edit</button>
                {u.active
                  ? <button style={S.btnSmallRed} onClick={()=>handleDeactivate(u)}>Deactivate</button>
                  : <button style={S.btnSmall} onClick={()=>handleReactivate(u)}>Reactivate</button>
                }
              </td>
            </tr>
          ))}
          {visibleUsers.length===0&&<tr><td colSpan={8} style={S.empty}>{users.length===0?'No users yet.':'No users match the current filter.'}</td></tr>}
        </tbody>
      </table>

      {/* Create modal */}
      {showModal&&(
        <Modal title="Create Account" onClose={()=>setShowModal(false)}>
          <Field label="Full Name *"><input style={S.input} value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} /></Field>
          <Field label="Email *"><input style={S.input} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></Field>
          <Field label="Username *"><input style={S.input} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} /></Field>
          <Field label="Job Title"><input style={S.input} value={form.job_title} onChange={e=>setForm(f=>({...f,job_title:e.target.value}))} /></Field>
          <Field label="Company *">
            <select style={S.input} value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value}))}>
              <option value="">— Select Company —</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Role *">
            <select style={S.input} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option value="learner">Learner</option>
              <option value="company_admin">Company Admin (view-only dashboard)</option>
            </select>
          </Field>
          <Field label="Work Location"><input style={S.input} value={form.work_location} placeholder="e.g. North Slope, Kenai, Offshore" onChange={e=>setForm(f=>({...f,work_location:e.target.value}))} /></Field>
          <Field label="Client / Project"><input style={S.input} value={form.client_project} placeholder="e.g. BP Alaska, ConocoPhillips" onChange={e=>setForm(f=>({...f,client_project:e.target.value}))} /></Field>
          <Field label="Department"><input style={S.input} value={form.department} placeholder="e.g. Operations, Maintenance" onChange={e=>setForm(f=>({...f,department:e.target.value}))} /></Field>
          <Field label="Employee ID"><input style={S.input} value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} /></Field>
          <Field label="Supervisor"><input style={S.input} value={form.supervisor} onChange={e=>setForm(f=>({...f,supervisor:e.target.value}))} /></Field>
          <Field label="Hire Date"><input style={S.input} type="date" value={form.hire_date} onChange={e=>setForm(f=>({...f,hire_date:e.target.value}))} /></Field>
          <Field label="Temporary Password *"><input style={S.input} type="password" value={form.password} placeholder="Min 8 characters" onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleCreate} disabled={saving||!form.full_name||!form.email||!form.username||!form.company_id||!form.password}>{saving?'Creating…':'Create Account'}</button>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser&&(
        <Modal title={`Edit — ${editUser.full_name}`} onClose={()=>setEditUser(null)}>
          <Field label="Full Name *"><input style={S.input} value={editForm.full_name} onChange={e=>setEditForm(f=>({...f,full_name:e.target.value}))} /></Field>
          <Field label="Email"><input style={S.input} type="email" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} /></Field>
          <Field label="Username *"><input style={S.input} value={editForm.username} onChange={e=>setEditForm(f=>({...f,username:e.target.value}))} /></Field>
          <Field label="Job Title"><input style={S.input} value={editForm.job_title} onChange={e=>setEditForm(f=>({...f,job_title:e.target.value}))} /></Field>
          <Field label="Company *">
            <select style={S.input} value={editForm.company_id} onChange={e=>setEditForm(f=>({...f,company_id:e.target.value}))}>
              <option value="">— Select Company —</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Role *">
            <select style={S.input} value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))}>
              <option value="learner">Learner</option>
              <option value="company_admin">Company Admin</option>
            </select>
          </Field>
          <Field label="Work Location"><input style={S.input} value={editForm.work_location} onChange={e=>setEditForm(f=>({...f,work_location:e.target.value}))} /></Field>
          <Field label="Department"><input style={S.input} value={editForm.department} onChange={e=>setEditForm(f=>({...f,department:e.target.value}))} /></Field>
          <Field label="Employee ID"><input style={S.input} value={editForm.employee_id} onChange={e=>setEditForm(f=>({...f,employee_id:e.target.value}))} /></Field>
          <Field label="Hire Date"><input style={S.input} type="date" value={editForm.hire_date} onChange={e=>setEditForm(f=>({...f,hire_date:e.target.value}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleEdit} disabled={saving||!editForm.full_name||!editForm.username||!editForm.company_id}>{saving?'Saving…':'Save Changes'}</button>
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
  const [showVideoModal, setShowVideoModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [form, setForm] = useState({title:'',description:'',completion_text:'',regulation_ref:'',pass_score:80,max_quiz_attempts:0})
  const [slideFiles, setSlideFiles] = useState([])
  const [speakerNotes, setSpeakerNotes] = useState([])
  const [videoSlides, setVideoSlides] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedVideoSlide, setSelectedVideoSlide] = useState('')
  const [showEditModal, setShowEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showSlideManager, setShowSlideManager] = useState(null)
  const [slideManagerSlides, setSlideManagerSlides] = useState([])
  const [loadingSlides, setLoadingSlides] = useState(false)
  const [editingSlide, setEditingSlide] = useState(null)
  const [editNotes, setEditNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/lms/courses')
    const data = await res.json()
    setCourses(data.courses||[])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreateCourse() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/create-course', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setForm({title:'',description:'',completion_text:'',regulation_ref:'',pass_score:80,max_quiz_attempts:0})
    load()
  }

  async function handleSlideUpload(course) {
    if (slideFiles.length===0) { setError('Select at least one slide image.'); return }
    setError(''); setSaving(true)
    for (let i=0; i<slideFiles.length; i++) {
      setUploadProgress(`Uploading slide ${i+1} of ${slideFiles.length}…`)
      const fd = new FormData()
      fd.append('file',slideFiles[i])
      fd.append('course_id',course.id)
      fd.append('slide_order',i+1)
      fd.append('speaker_notes',speakerNotes[i]||'')
      const res = await fetch('/api/lms/upload-slide',{method:'POST',body:fd})
      if (!res.ok) {
        const d = await res.json()
        setError(`Slide ${i+1} failed: ${d.error}`)
        setSaving(false); setUploadProgress(''); return
      }
    }
    setSaving(false); setUploadProgress(''); setSlideFiles([]); setSpeakerNotes([]); setShowSlideModal(null); load()
  }

  async function loadVideoSlides(course) {
    const res = await fetch(`/api/lms/quiz-questions?course_id=${course.id}`)
    // Reuse courses endpoint to get slides
    const slidesRes = await fetch(`/api/lms/courses`)
    const data = await slidesRes.json()
    // Get slide count from course
    const c = (data.courses||[]).find(c=>c.id===course.id)
    const count = c?.lms_slides?.[0]?.count || 0
    setVideoSlides(Array.from({length:count},(_,i)=>i+1))
  }

  async function handleVideoUpload(course) {
    if (!selectedVideoSlide) { setError('Select a slide number first.'); return }
    if (!videoFile && !videoUrl) { setError('Select a video file or enter a URL.'); return }
    setError(''); setSaving(true)

    // Get slide_id for the selected slide_order
    const { data: slideData } = await fetch(`/api/lms/learner/slides/${course.id}`, {
      headers: { 'Authorization': 'Bearer admin' }
    }).then(r=>r.json()).catch(()=>({data:null}))

    const fd = new FormData()
    fd.append('slide_id', selectedVideoSlide)
    if (videoFile) fd.append('file', videoFile)
    if (videoUrl) fd.append('video_url', videoUrl)

    const res = await fetch('/api/lms/upload-video',{method:'POST',body:fd})
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setShowVideoModal(null); setVideoFile(null); setVideoUrl(''); setSelectedVideoSlide('')
  }

  function handleSlideFileChange(e) {
    const files = Array.from(e.target.files).sort((a,b)=>a.name.localeCompare(b.name))
    setSlideFiles(files); setSpeakerNotes(files.map(()=>''))
  }

  async function toggleCourseActive(course) {
    await fetch('/api/lms/courses',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:course.id,active:!course.active})})
    load()
  }

  async function handleDeleteCourse(course) {
    if (!confirm(`DELETE "${course.title}"?\n\nThis will permanently delete the course, all slides, audio files, quiz questions, and completion records. This CANNOT be undone.`)) return
    const res = await fetch('/api/lms/delete-course', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ course_id: course.id })
    })
    if (!res.ok) {
      const d = await res.json()
      alert('Delete failed: ' + (d.error || 'Unknown error'))
      return
    }
    load()
  }

  function openEditCourse(course) {
    setEditForm({
      id: course.id,
      title: course.title || '',
      description: course.description || '',
      completion_text: course.completion_text || '',
      regulation_ref: course.regulation_ref || '',
      pass_score: course.pass_score || 80,
      max_quiz_attempts: course.max_quiz_attempts || 0,
    })
    setShowEditModal(course)
  }

  async function handleEditCourse() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/courses', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(editForm)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowEditModal(null); load()
  }

  async function openSlideManager(course) {
    setShowSlideManager(course); setLoadingSlides(true)
    const res = await fetch('/api/lms/slides?course_id=' + course.id)
    const data = await res.json()
    setSlideManagerSlides(data.slides || [])
    setLoadingSlides(false)
  }

  async function handleDeleteSlide(slide) {
    if (!confirm('Delete Slide ' + slide.slide_order + '? This cannot be undone.')) return
    await fetch('/api/lms/slides', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: slide.id, course_id: showSlideManager.id })
    })
    openSlideManager(showSlideManager)
  }

  async function handleReorderSlide(slide, direction) {
    await fetch('/api/lms/slides', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: slide.id, course_id: showSlideManager.id, direction })
    })
    openSlideManager(showSlideManager)
  }

  async function handleSaveNotes(slide) {
    setSavingNotes(true)
    await fetch('/api/lms/slides', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id: slide.id, speaker_notes: editNotes })
    })
    setSavingNotes(false)
    setEditingSlide(null)
    openSlideManager(showSlideManager)
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Training Courses</h2>
        <button style={S.btnPrimary} onClick={()=>setShowModal(true)}>+ New Course</button>
      </div>
      <table style={S.table}>
        <thead><tr>{['Title','Regulation','Pass Score','Slides','Status','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {courses.map(c=>(
            <tr key={c.id} style={S.tr}>
              <td style={S.td}>{c.title}</td>
              <td style={S.td}>{c.regulation_ref||'—'}</td>
              <td style={S.td}>{c.pass_score}%</td>
              <td style={S.td}>{c.lms_slides?.[0]?.count??0} slides</td>
              <td style={S.td}><span style={c.active?S.badgeGreen:S.badgeGray}>{c.active?'Active':'Inactive'}</span></td>
              <td style={{...S.td,display:'flex',gap:'6px',flexWrap:'wrap'}}>
                <button style={S.btnSmall} onClick={()=>openEditCourse(c)}>Edit</button>
                <button style={S.btnSmall} onClick={()=>openSlideManager(c)}>Manage Slides</button>
                <button style={S.btnSmall} onClick={()=>{setShowSlideModal(c);setError('')}}>Upload Slides</button>
                <button style={S.btnSmall} onClick={()=>{setShowVideoModal(c);setError('');loadVideoSlides(c)}}>Add Video</button>
                <button style={S.btnSmall} onClick={()=>toggleCourseActive(c)}>{c.active?'Deactivate':'Activate'}</button>
                <button style={S.btnSmallRed} onClick={()=>handleDeleteCourse(c)}>Delete</button>
              </td>
            </tr>
          ))}
          {courses.length===0&&<tr><td colSpan={6} style={S.empty}>No courses yet.</td></tr>}
        </tbody>
      </table>

      {showModal&&(
        <Modal title="New Training Course" onClose={()=>setShowModal(false)}>
          <Field label="Course Title *"><input style={S.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Short Description"><textarea style={S.textarea} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></Field>
          <Field label="Certificate Completion Text"><textarea style={{...S.textarea,minHeight:'100px'}} value={form.completion_text} placeholder="Has successfully completed the…" onChange={e=>setForm(f=>({...f,completion_text:e.target.value}))} /></Field>
          <Field label="Regulation Reference (e.g. 29 CFR 1910.120(e))"><input style={S.input} value={form.regulation_ref} onChange={e=>setForm(f=>({...f,regulation_ref:e.target.value}))} /></Field>
          <Field label="Minimum Pass Score (%)"><input style={S.input} type="number" min={1} max={100} value={form.pass_score} onChange={e=>setForm(f=>({...f,pass_score:parseInt(e.target.value)}))} /></Field>
          <Field label="Max Quiz Attempts (0 = unlimited)"><input style={S.input} type="number" min={0} value={form.max_quiz_attempts} onChange={e=>setForm(f=>({...f,max_quiz_attempts:parseInt(e.target.value)}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleCreateCourse} disabled={saving||!form.title}>{saving?'Creating…':'Create Course'}</button>
        </Modal>
      )}

      {showSlideModal&&(
        <Modal title={`Upload Slides — ${showSlideModal.title}`} onClose={()=>{setShowSlideModal(null);setSlideFiles([]);setSpeakerNotes([])}}>
          <div style={S.infoBox}><strong>Export from PowerPoint:</strong> File → Export → Change File Type → PNG → Save Every Slide. Select all PNG/JPG files below. Speaker notes can be left blank — use AI generation in the Quiz Builder tab to auto-generate them.</div>
          <Field label="Select Slide Images (PNG or JPG)">
            <input type="file" multiple accept="image/png,image/jpeg" onChange={handleSlideFileChange} style={{marginTop:'4px'}} />
          </Field>
          {slideFiles.length>0&&(
            <div style={S.slideList}>
              <p style={{margin:'0 0 8px',fontWeight:600,fontSize:'13px'}}>{slideFiles.length} slides selected — speaker notes optional (AI can generate them)</p>
              {slideFiles.map((file,i)=>(
                <div key={i} style={S.slideItem}>
                  <div style={S.slideLabel}>Slide {i+1}: {file.name}</div>
                  <textarea style={{...S.textarea,minHeight:'50px'}} placeholder="Optional — leave blank for AI generation" value={speakerNotes[i]||''} onChange={e=>{const n=[...speakerNotes];n[i]=e.target.value;setSpeakerNotes(n)}} />
                </div>
              ))}
            </div>
          )}
          {uploadProgress&&<div style={S.infoBox}>{uploadProgress}</div>}
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={()=>handleSlideUpload(showSlideModal)} disabled={saving||slideFiles.length===0}>{saving?uploadProgress||'Uploading…':`Upload ${slideFiles.length} Slide${slideFiles.length!==1?'s':''}`}</button>
        </Modal>
      )}

      {showEditModal&&(
        <Modal title={`Edit Course — ${showEditModal.title}`} onClose={()=>setShowEditModal(null)}>
          <Field label="Course Title *"><input style={S.input} value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Short Description"><textarea style={S.textarea} value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} /></Field>
          <Field label="Certificate Completion Text"><textarea style={{...S.textarea,minHeight:'80px'}} value={editForm.completion_text} onChange={e=>setEditForm(f=>({...f,completion_text:e.target.value}))} /></Field>
          <Field label="Regulation Reference"><input style={S.input} value={editForm.regulation_ref} onChange={e=>setEditForm(f=>({...f,regulation_ref:e.target.value}))} /></Field>
          <Field label="Minimum Pass Score (%)"><input style={S.input} type="number" min={1} max={100} value={editForm.pass_score} onChange={e=>setEditForm(f=>({...f,pass_score:parseInt(e.target.value)}))} /></Field>
          <Field label="Max Quiz Attempts (0 = unlimited)"><input style={S.input} type="number" min={0} value={editForm.max_quiz_attempts} onChange={e=>setEditForm(f=>({...f,max_quiz_attempts:parseInt(e.target.value)}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleEditCourse} disabled={saving||!editForm.title}>{saving?'Saving…':'Save Changes'}</button>
        </Modal>
      )}

      {showSlideManager&&(
        <Modal title={`Manage Slides — ${showSlideManager.title}`} onClose={()=>setShowSlideManager(null)}>
          {loadingSlides&&<div style={{textAlign:'center',padding:'24px',color:'#999'}}>Loading slides…</div>}
          {!loadingSlides&&slideManagerSlides.length===0&&<div style={{textAlign:'center',padding:'24px',color:'#999'}}>No slides found.</div>}
          {!loadingSlides&&slideManagerSlides.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:'10px',maxHeight:'60vh',overflowY:'auto'}}>
              {slideManagerSlides.map((slide,idx)=>(
                <div key={slide.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px',border:'1px solid #eee',borderRadius:'8px',background:'#fafafa'}}>
                  <img src={slide.image_url} alt={'Slide '+slide.slide_order} style={{width:'80px',height:'55px',objectFit:'cover',borderRadius:'4px',border:'1px solid #ddd',flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'700',fontSize:'13px',color:'#1a1a2e'}}>Slide {slide.slide_order}</div>
                    <div style={{fontSize:'11px',color:'#999',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{slide.speaker_notes?slide.speaker_notes.substring(0,60)+'…':'No speaker notes'}</div>
                    <div style={{fontSize:'11px',color:slide.audio_path?'#2e7d32':'#999',marginTop:'2px'}}>{slide.audio_path?'✓ Audio ready':'No audio'}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}}>
                    <button style={{...S.btnSmall,padding:'3px 8px',fontSize:'11px'}} onClick={()=>handleReorderSlide(slide,'up')} disabled={idx===0}>↑</button>
                    <button style={{...S.btnSmall,padding:'3px 8px',fontSize:'11px'}} onClick={()=>handleReorderSlide(slide,'down')} disabled={idx===slideManagerSlides.length-1}>↓</button>
                  </div>
                  <button style={{...S.btnSmall,padding:'5px 10px',fontSize:'12px',flexShrink:0}} onClick={()=>{setEditingSlide(slide);setEditNotes(slide.speaker_notes||'')}}>Edit Notes</button>
                  <button style={{...S.btnSmallRed,padding:'5px 10px',fontSize:'12px',flexShrink:0}} onClick={()=>handleDeleteSlide(slide)}>Delete</button>
                </div>
              ))}
            </div>
          )}
          <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>Slides renumber automatically after delete. Audio and speaker notes are preserved on remaining slides.</div>
        </Modal>
      )}

      {editingSlide&&(
        <Modal title={`Edit Speaker Notes — Slide ${editingSlide.slide_order}`} onClose={()=>setEditingSlide(null)}>
          <div style={S.infoBox}>Edit the narration for this slide. Echo will read exactly what you write — so feel free to add personality, jokes, or wake-up calls. Just keep the safety message intact.</div>
          <Field label="Speaker Notes">
            <textarea
              style={{...S.textarea,minHeight:'200px',fontFamily:'Arial,sans-serif',fontSize:'14px',lineHeight:'1.6'}}
              value={editNotes}
              onChange={e=>setEditNotes(e.target.value)}
              placeholder="Write what Echo will say on this slide..."
            />
          </Field>
          <div style={{fontSize:'12px',color:'#999'}}>{editNotes.length} characters — aim for 200-500 for best narration length</div>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={()=>handleSaveNotes(editingSlide)} disabled={savingNotes}>
            {savingNotes?'Saving…':'Save Notes'}
          </button>
        </Modal>
      )}

      {showVideoModal&&(
        <Modal title={`Add Video — ${showVideoModal.title}`} onClose={()=>{setShowVideoModal(null);setVideoFile(null);setVideoUrl('');setSelectedVideoSlide('')}}>
          <div style={S.infoBox}>Link a video to a specific slide. The course player will show the video on that slide. Use an MP4 file (up to 5GB) or paste an external URL (Vimeo, YouTube, S3).</div>
          <Field label="Slide Number *">
            <select style={S.input} value={selectedVideoSlide} onChange={e=>setSelectedVideoSlide(e.target.value)}>
              <option value="">— Select slide —</option>
              {videoSlides.map(n=><option key={n} value={n}>Slide {n}</option>)}
            </select>
          </Field>
          <Field label="Upload MP4 File (up to 5GB)">
            <input type="file" accept="video/mp4,video/*" onChange={e=>setVideoFile(e.target.files[0]||null)} style={{marginTop:'4px'}} />
          </Field>
          <div style={{textAlign:'center',color:'#999',fontSize:'13px'}}>— OR —</div>
          <Field label="External Video URL (Vimeo, YouTube, S3, etc.)">
            <input style={S.input} value={videoUrl} placeholder="https://vimeo.com/..." onChange={e=>setVideoUrl(e.target.value)} />
          </Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={()=>handleVideoUpload(showVideoModal)} disabled={saving||!selectedVideoSlide||((!videoFile)&&(!videoUrl))}>{saving?'Uploading…':'Save Video'}</button>
        </Modal>
      )}
    </div>
  )
}

// ─── QUIZ BUILDER TAB ───────────────────────────────────────
function QuizBuilderTab() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [questions, setQuestions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({question_text:'',option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:'A',slide_reference:''})

  // AI generation state
  const [generating, setGenerating] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioResult, setAudioResult] = useState(null)
  const [generateMode, setGenerateMode] = useState('both')
  const [jobId, setJobId] = useState(null)
  const [jobProgress, setJobProgress] = useState(null)
  const [audioJobId, setAudioJobId] = useState(null)
  const [audioJobProgress, setAudioJobProgress] = useState(null)
  const pollRef = useRef(null)
  const audioPollRef = useRef(null)

  const loadCourses = useCallback(async () => {
    const res = await fetch('/api/lms/courses')
    const data = await res.json()
    setCourses(data.courses||[])
  }, [])

  useEffect(() => { loadCourses() }, [loadCourses])

  // Poll job status
  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/lms/ai-job-status?job_id=${jobId}`)
      const data = await res.json()
      setJobProgress(data)
      if (data.status === 'complete' || data.status === 'failed') {
        clearInterval(pollRef.current)
        setGenerating(false)
        setJobId(null)
        if (selectedCourse) loadQuestions()
        if (data.status === 'failed') setError(data.error_message || 'Generation failed.')
      }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [jobId, selectedCourse])

  // Poll audio job status
  useEffect(() => {
    if (!audioJobId) return
    audioPollRef.current = setInterval(async () => {
      const res = await fetch(`/api/lms/ai-job-status?job_id=${audioJobId}`)
      const data = await res.json()
      setAudioJobProgress(data)
      if (data.status === 'complete' || data.status === 'failed') {
        clearInterval(audioPollRef.current)
        setGeneratingAudio(false)
        setAudioJobId(null)
        if (data.status === 'failed') setError(data.error_message || 'Audio generation failed.')
      }
    }, 2000)
    return () => clearInterval(audioPollRef.current)
  }, [audioJobId])

  async function selectCourse(course) {
    setSelectedCourse(course); setError(''); setJobProgress(null)
    const res = await fetch(`/api/lms/quiz-questions?course_id=${course.id}`)
    const data = await res.json()
    setQuestions(data.questions||[])
  }

  async function loadQuestions() {
    if (!selectedCourse) return
    const res = await fetch(`/api/lms/quiz-questions?course_id=${selectedCourse.id}`)
    const data = await res.json()
    setQuestions(data.questions||[])
  }

  async function handleAIGenerate() {
    setError(''); setGenerating(true); setJobProgress(null)

    const res = await fetch('/api/lms/ai-generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({course_id: selectedCourse.id, mode: generateMode})
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setGenerating(false); return }

    setJobId(data.job_id)
    setJobProgress({ status: 'running', progress: 0, total_slides: data.total_slides, percent: 0 })
    // Polling via useEffect handles progress and completion
  }

  async function handleGenerateAudio() {
    setError(''); setGeneratingAudio(true); setAudioResult(null); setAudioJobProgress(null)
    const res = await fetch('/api/lms/generate-audio', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ course_id: selectedCourse.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setGeneratingAudio(false); return }

    setAudioJobId(data.job_id)
    setAudioJobProgress({ status: 'running', progress: 0, total_slides: data.total_slides, percent: 0 })
    // Polling via useEffect handles progress and completion
  }

  function openAdd() {
    setEditingQuestion(null)
    setForm({question_text:'',option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:'A',slide_reference:''})
    setShowModal(true)
  }

  function openEdit(q) {
    setEditingQuestion(q)
    setForm({question_text:q.question_text,option_a:q.option_a,option_b:q.option_b,option_c:q.option_c||'',option_d:q.option_d||'',correct_answer:q.correct_answer,slide_reference:q.slide_reference||''})
    setShowModal(true)
  }

  async function handleSave() {
    setError(''); setSaving(true)
    const payload = {...form, course_id:selectedCourse.id, slide_reference:form.slide_reference?parseInt(form.slide_reference):null, is_ai_generated:false, always_include:true}
    const method = editingQuestion?'PATCH':'POST'
    if (editingQuestion) payload.id = editingQuestion.id
    const res = await fetch('/api/lms/quiz-questions',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); loadQuestions()
  }

  async function handleDelete(q) {
    if (!confirm('Delete this question?')) return
    await fetch('/api/lms/quiz-questions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:q.id})})
    loadQuestions()
  }

  async function toggleAlwaysInclude(q) {
    await fetch('/api/lms/quiz-questions',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:q.id,always_include:!q.always_include,question_text:q.question_text,option_a:q.option_a,option_b:q.option_b,option_c:q.option_c,option_d:q.option_d,correct_answer:q.correct_answer,slide_reference:q.slide_reference,question_order:q.question_order})})
    loadQuestions()
  }

  const manualCount = questions.filter(q=>!q.is_ai_generated||q.always_include).length
  const aiCount = questions.filter(q=>q.is_ai_generated&&!q.always_include).length

  return (
    <div>
      <div style={S.tabHeader}><h2 style={S.tabTitle}>Quiz Builder</h2></div>

      <Field label="Select Course">
        <select style={{...S.input,maxWidth:'400px'}} value={selectedCourse?.id||''} onChange={e=>{const c=courses.find(c=>c.id===e.target.value);if(c)selectCourse(c);else{setSelectedCourse(null);setQuestions([])}}}>
          <option value="">— Select a course —</option>
          {courses.map(c=><option key={c.id} value={c.id}>{c.title} ({c.lms_slides?.[0]?.count??0} slides)</option>)}
        </select>
      </Field>

      {selectedCourse&&(
        <>
          {/* AI Panel */}
          <div style={QB.aiPanel}>
            <div style={QB.aiTitle}><span>🤖</span><span>AI Content Generator</span><span style={QB.aiBadge}>Powered by Claude</span></div>
            <p style={QB.aiDesc}>Claude analyzes every slide image, writes CFR-aligned speaker notes, and generates a diverse question bank (5 questions per slide). Each quiz randomly samples from the bank — no two attempts are identical.</p>
            <div style={QB.aiRow}>
              <select style={{...S.input,width:'auto'}} value={generateMode} onChange={e=>setGenerateMode(e.target.value)} disabled={generating}>
                <option value="both">Generate Speaker Notes + Quiz Questions</option>
                <option value="speaker_notes">Speaker Notes Only</option>
                <option value="quiz_questions">Quiz Questions Only</option>
              </select>
              <button style={{...QB.aiBtn,opacity:generating?0.6:1}} onClick={handleAIGenerate} disabled={generating}>
                {generating?'⏳ Processing…':'✨ Generate with AI'}
              </button>
            </div>

            {/* Live Progress Bar */}
            {jobProgress&&(
              <div style={{marginTop:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'13px',color:'rgba(255,255,255,0.9)',fontWeight:'600'}}>
                    {jobProgress.status==='complete'?'✅ Generation complete!'
                      :jobProgress.status==='failed'?'❌ Generation failed'
                      :jobProgress.status==='running'?`Processing slide ${jobProgress.progress} of ${jobProgress.total_slides}…`
                      :'Initializing…'}
                  </span>
                  <span style={{fontSize:'13px',color:'#fbbf24',fontWeight:'700'}}>{jobProgress.percent||0}%</span>
                </div>
                <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'10px',height:'10px',overflow:'hidden'}}>
                  <div style={{background:'#fbbf24',height:'100%',width:`${jobProgress.percent||0}%`,borderRadius:'10px',transition:'width 0.5s ease'}} />
                </div>
                {jobProgress.status==='complete'&&(
                  <div style={{marginTop:'8px',fontSize:'12px',color:'rgba(255,255,255,0.8)'}}>
                    {jobProgress.total_slides} slides processed. Question bank updated — each quiz will randomly select questions.
                  </div>
                )}
              </div>
            )}
          <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.9)',fontWeight:'700',marginBottom:'6px'}}>Professional Audio Narration</div>
              <p style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',margin:'0 0 10px'}}>Generate studio-quality MP3 audio for each slide using ElevenLabs AI voices.</p>
              <button style={{...QB.aiBtn,background:'#10b981'}} onClick={handleGenerateAudio} disabled={generatingAudio}>
                {generatingAudio ? 'Generating Audio...' : 'Generate Audio with ElevenLabs'}
              </button>
              {audioJobProgress && (
                <div style={{marginTop:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.9)',fontWeight:'600'}}>
                      {audioJobProgress.status==='complete'?'Audio generation complete!'
                        :audioJobProgress.status==='failed'?'Audio generation failed'
                        :`Generating audio for slide ${audioJobProgress.progress} of ${audioJobProgress.total_slides}...`}
                    </span>
                    <span style={{fontSize:'12px',color:'#10b981',fontWeight:'700'}}>{audioJobProgress.percent||0}%</span>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'10px',height:'8px',overflow:'hidden'}}>
                    <div style={{background:'#10b981',height:'100%',width:`${audioJobProgress.percent||0}%`,borderRadius:'10px',transition:'width 0.5s ease'}} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'flex',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}}>
            <div style={QB.statBox}><div style={QB.statNum}>{questions.length}</div><div style={QB.statLbl}>Total Questions</div></div>
            <div style={QB.statBox}><div style={{...QB.statNum,color:'#1565c0'}}>{manualCount}</div><div style={QB.statLbl}>Always Include</div></div>
            <div style={{...QB.statBox,background:'#f3e5f5'}}><div style={{...QB.statNum,color:'#7b1fa2'}}>{aiCount}</div><div style={QB.statLbl}>AI Bank (Random)</div></div>
          </div>

          <div style={S.tabHeader}>
            <span style={{fontSize:'14px',fontWeight:'700',color:'#1a1a2e'}}>{questions.length} Question{questions.length!==1?'s':''} — {selectedCourse.title}</span>
            <button style={S.btnPrimary} onClick={openAdd}>+ Add Question</button>
          </div>

          {error&&<div style={S.error}>{error}</div>}

          <table style={S.table}>
            <thead><tr>{['#','Question','Slide Ref','Options','Answer','Type','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {questions.map((q,i)=>(
                <tr key={q.id} style={{...S.tr,background:q.always_include||!q.is_ai_generated?'#f0f7ff':'#fff'}}>
                  <td style={{...S.td,width:'36px',color:'#999',fontSize:'12px'}}>{i+1}</td>
                  <td style={{...S.td,maxWidth:'260px'}}><div style={{fontSize:'13px',color:'#1a1a2e',lineHeight:'1.4'}}>{q.question_text}</div></td>
                  <td style={{...S.td,width:'80px',textAlign:'center'}}>{q.slide_reference?<span style={QB.slideRef}>Slide {q.slide_reference}</span>:'—'}</td>
                  <td style={{...S.td,fontSize:'11px',color:'#666'}}>
                    <div><strong>A:</strong> {q.option_a}</div>
                    <div><strong>B:</strong> {q.option_b}</div>
                    {q.option_c&&<div><strong>C:</strong> {q.option_c}</div>}
                    {q.option_d&&<div><strong>D:</strong> {q.option_d}</div>}
                  </td>
                  <td style={{...S.td,width:'56px',textAlign:'center'}}><span style={QB.correctBadge}>{q.correct_answer}</span></td>
                  <td style={{...S.td,width:'90px'}}>
                    {q.is_ai_generated
                      ? <button style={{...S.btnSmall,fontSize:'10px',padding:'3px 7px',background:q.always_include?'#e8f5e9':'#f3e5f5',color:q.always_include?'#2e7d32':'#7b1fa2'}} onClick={()=>toggleAlwaysInclude(q)}>
                          {q.always_include?'★ Fixed':'◇ Random'}
                        </button>
                      : <span style={{fontSize:'11px',fontWeight:'700',color:'#1565c0'}}>★ Manual</span>
                    }
                  </td>
                  <td style={{...S.td,width:'96px'}}><div style={{display:'flex',gap:'5px'}}><button style={S.btnSmall} onClick={()=>openEdit(q)}>Edit</button><button style={S.btnSmallRed} onClick={()=>handleDelete(q)}>Del</button></div></td>
                </tr>
              ))}
              {questions.length===0&&<tr><td colSpan={7} style={S.empty}>No questions yet. Use AI generation or add manually.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {!selectedCourse&&<div style={{textAlign:'center',padding:'48px',color:'#aaa'}}><div style={{fontSize:'48px',marginBottom:'12px'}}>📝</div><p>Select a course to manage its quiz questions.</p></div>}

      {showModal&&(
        <Modal title={editingQuestion?'Edit Question':'Add Question'} onClose={()=>setShowModal(false)}>
          <Field label="Question Text *"><textarea style={{...S.textarea,minHeight:'80px'}} value={form.question_text} onChange={e=>setForm(f=>({...f,question_text:e.target.value}))} /></Field>
          <Field label="Slide Reference (which slide covers this topic)"><input style={S.input} type="number" min={1} value={form.slide_reference} placeholder="e.g. 3" onChange={e=>setForm(f=>({...f,slide_reference:e.target.value}))} /></Field>
          <div style={{background:'#f9f9f9',borderRadius:'8px',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
            {['A','B','C','D'].map(opt=>(
              <Field key={opt} label={`Option ${opt}${opt==='A'||opt==='B'?' *':' (optional)'}`}>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <input style={{...S.input,flex:1}} value={form[`option_${opt.toLowerCase()}`]} onChange={e=>setForm(f=>({...f,[`option_${opt.toLowerCase()}`]:e.target.value}))} />
                  <button style={{...QB.correctBtn,background:form.correct_answer===opt?'#2e7d32':'#f0f0f0',color:form.correct_answer===opt?'#fff':'#999'}} onClick={()=>setForm(f=>({...f,correct_answer:opt}))}>{form.correct_answer===opt?'✓ Correct':'Set Correct'}</button>
                </div>
              </Field>
            ))}
          </div>
          <div style={{background:'#e8f5e9',borderRadius:'6px',padding:'8px 12px',fontSize:'12px',color:'#2e7d32'}}>Correct answer: Option <strong>{form.correct_answer}</strong> — this question will always appear in quizzes</div>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleSave} disabled={saving||!form.question_text||!form.option_a||!form.option_b||!form.correct_answer}>{saving?'Saving…':editingQuestion?'Save Changes':'Add Question'}</button>
        </Modal>
      )}
    </div>
  )
}

// ─── REQUIRED COURSES TAB ───────────────────────────────────
function RequiredCoursesTab() {
  const [required, setRequired] = useState([])
  const [companies, setCompanies] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({company_id:'',course_ids:[]})
  const [expanded, setExpanded] = useState({})

  const load = useCallback(async () => {
    const [rr,cr,cor] = await Promise.all([fetch('/api/lms/required-courses'),fetch('/api/lms/companies'),fetch('/api/lms/courses')])
    const [rd,cd,cod] = await Promise.all([rr.json(),cr.json(),cor.json()])
    setRequired(rd.required_courses||[])
    setCompanies((cd.companies||[]).filter(c=>c.active))
    setCourses((cod.courses||[]).filter(c=>c.active))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    setError(''); setSaving(true)
    let anyError = null
    for (const course_id of form.course_ids) {
      const res = await fetch('/api/lms/required-courses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:form.company_id,course_id})})
      const data = await res.json()
      if (!res.ok) anyError = data.error
    }
    setSaving(false)
    if (anyError) { setError(anyError); return }
    setShowModal(false); setForm({company_id:'',course_ids:[]}); load()
  }

  async function handleRemove(item) {
    if (!confirm(`Remove "${item.lms_courses?.title}" as required for ${item.lms_companies?.name}?`)) return
    await fetch('/api/lms/required-courses',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})})
    load()
  }

  function toggleExpanded(companyId) {
    setExpanded(prev => ({...prev, [companyId]: !prev[companyId]}))
  }

  function toggleCourse(courseId) {
    setForm(f => {
      const ids = f.course_ids.includes(courseId)
        ? f.course_ids.filter(id => id !== courseId)
        : [...f.course_ids, courseId]
      return {...f, course_ids: ids}
    })
  }

  // Group required courses by company
  const byCompany = {}
  for (const r of required) {
    const cid = r.lms_companies?.id || r.company_id
    const cname = r.lms_companies?.name || 'Unknown'
    if (!byCompany[cid]) byCompany[cid] = {name: cname, courses: []}
    byCompany[cid].courses.push(r)
  }

  // Filter out courses already required for selected company
  const alreadyRequired = new Set(
    required.filter(r => r.company_id === form.company_id || r.lms_companies?.id === form.company_id).map(r => r.course_id || r.lms_courses?.id)
  )

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Required Courses</h2>
        <button style={S.btnPrimary} onClick={()=>setShowModal(true)}>+ Assign Required Courses</button>
      </div>
      <div style={S.infoBox}>Required courses are assigned to <strong>every active user in a company</strong> — use these for OSHA mandatory training that applies to all workers regardless of role.</div>
      <br/>
      {Object.keys(byCompany).length === 0 && <div style={S.empty}>No required courses yet.</div>}
      {Object.entries(byCompany).map(([cid, group]) => (
        <div key={cid} style={{border:'1px solid #e5e5e5',borderRadius:'8px',marginBottom:'8px',overflow:'hidden'}}>
          <div
            onClick={() => toggleExpanded(cid)}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:'pointer',background:expanded[cid]?'#f7f7f9':'#fff',userSelect:'none'}}
          >
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'13px',fontWeight:'700',color:'#1a1a2e'}}>{group.name}</span>
              <span style={{background:'#e3f2fd',color:'#1565c0',padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:'700'}}>{group.courses.length} course{group.courses.length!==1?'s':''}</span>
            </div>
            <span style={{color:'#999',fontSize:'12px'}}>{expanded[cid]?'▲':'▼'}</span>
          </div>
          {expanded[cid] && (
            <table style={{...S.table,margin:0}}>
              <thead><tr>{['Course','Assigned','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {group.courses.map(r=>(
                  <tr key={r.id} style={S.tr}>
                    <td style={S.td}>{r.lms_courses?.title}</td>
                    <td style={S.td}>{new Date(r.assigned_at).toLocaleDateString()}</td>
                    <td style={S.td}><button style={S.btnSmallRed} onClick={()=>handleRemove(r)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      {showModal&&(
        <Modal title="Assign Required Courses" onClose={()=>{setShowModal(false);setForm({company_id:'',course_ids:[]})}}>
          <div style={S.infoBox}>Selected courses will be required for <strong>all active users</strong> in the selected company.</div>
          <Field label="Company *">
            <select style={S.input} value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value,course_ids:[]}))}>
              <option value="">— Select Company —</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {form.company_id && (
            <Field label="Courses * (select one or more)">
              <div style={{border:'1px solid #ddd',borderRadius:'8px',maxHeight:'280px',overflowY:'auto'}}>
                {courses.map(c => {
                  const alreadyHas = alreadyRequired.has(c.id)
                  const selected = form.course_ids.includes(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => !alreadyHas && toggleCourse(c.id)}
                      style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderBottom:'1px solid #f0f0f0',cursor:alreadyHas?'default':'pointer',background:selected?'#e3f2fd':alreadyHas?'#f9f9f9':'#fff',opacity:alreadyHas?0.5:1}}
                    >
                      <div style={{width:'16px',height:'16px',borderRadius:'4px',border:selected?'none':'1.5px solid #ccc',background:selected?'#1565c0':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {selected && <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>✓</span>}
                      </div>
                      <span style={{fontSize:'13px',color:alreadyHas?'#999':'#1a1a2e'}}>{c.title}</span>
                      {alreadyHas && <span style={{marginLeft:'auto',fontSize:'11px',color:'#999'}}>already assigned</span>}
                    </div>
                  )
                })}
              </div>
              {form.course_ids.length > 0 && <div style={{fontSize:'12px',color:'#1565c0',marginTop:'6px',fontWeight:'600'}}>{form.course_ids.length} course{form.course_ids.length!==1?'s':''} selected</div>}
            </Field>
          )}
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleAdd} disabled={saving||!form.company_id||form.course_ids.length===0}>{saving?'Saving…':`Assign ${form.course_ids.length||''} Course${form.course_ids.length!==1?'s':''}`}</button>
        </Modal>
      )}
    </div>
  )
}

// ─── INDIVIDUAL ASSIGNMENTS TAB ─────────────────────────────
function IndividualAssignmentsTab() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({user_id:'',course_id:'',due_date:''})

  const load = useCallback(async () => {
    const [ar,ur,cor] = await Promise.all([fetch('/api/lms/individual-assignments'),fetch('/api/lms/users'),fetch('/api/lms/courses')])
    const [ad,ud,cod] = await Promise.all([ar.json(),ur.json(),cor.json()])
    setAssignments(ad.assignments||[])
    setUsers((ud.users||[]).filter(u=>u.active&&u.role==='learner'))
    setCourses((cod.courses||[]).filter(c=>c.active))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAssign() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/individual-assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); setForm({user_id:'',course_id:'',due_date:''}); load()
  }

  async function handleRemove(a) {
    if (!confirm(`Remove "${a.lms_courses?.title}" from ${a.lms_users?.full_name}?`)) return
    await fetch('/api/lms/individual-assignments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id})})
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Individual Assignments</h2>
        <button style={S.btnPrimary} onClick={()=>setShowModal(true)}>+ Assign Course</button>
      </div>
      <div style={S.infoBox}>Individual assignments are <strong>hazard-based</strong> — assign specific courses to specific workers based on their actual job duties and exposure.</div>
      <br/>
      <table style={S.table}>
        <thead><tr>{['Employee','Company','Course','Due Date','Assigned','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {assignments.map(a=>(
            <tr key={a.id} style={S.tr}>
              <td style={S.td}>{a.lms_users?.full_name}</td>
              <td style={S.td}>{a.lms_users?.lms_companies?.name||'—'}</td>
              <td style={S.td}>{a.lms_courses?.title}</td>
              <td style={S.td}>{a.due_date?new Date(a.due_date).toLocaleDateString():'—'}</td>
              <td style={S.td}>{new Date(a.assigned_at).toLocaleDateString()}</td>
              <td style={S.td}><button style={S.btnSmallRed} onClick={()=>handleRemove(a)}>Remove</button></td>
            </tr>
          ))}
          {assignments.length===0&&<tr><td colSpan={6} style={S.empty}>No individual assignments yet.</td></tr>}
        </tbody>
      </table>
      {showModal&&(
        <Modal title="Assign Course to Individual" onClose={()=>setShowModal(false)}>
          <Field label="Employee *">
            <select style={S.input} value={form.user_id} onChange={e=>setForm(f=>({...f,user_id:e.target.value}))}>
              <option value="">— Select Employee —</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.full_name} — {u.lms_companies?.name||'No Company'}{u.job_title?` (${u.job_title})`:''}</option>)}
            </select>
          </Field>
          <Field label="Course *">
            <select style={S.input} value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))}>
              <option value="">— Select Course —</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Due Date (optional)"><input style={S.input} type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleAssign} disabled={saving||!form.user_id||!form.course_id}>{saving?'Assigning…':'Assign Course'}</button>
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
          <p style={S.pageSubtitle}>Manage companies, learner accounts, courses, and training assignments</p>
        </div>
        <a href="/" style={S.backLink}>← Back to Portal</a>
      </div>
      <div style={S.tabBar}>
        {TABS.map(tab=>(
          <button key={tab} style={{...S.tabBtn,...(activeTab===tab?S.tabBtnActive:{})}} onClick={()=>setActiveTab(tab)}>{tab}</button>
        ))}
      </div>
      <div style={S.tabContent}>
        {activeTab==='Companies'              && <CompaniesTab />}
        {activeTab==='Users'                  && <UsersTab />}
        {activeTab==='Courses'                && <CoursesTab />}
        {activeTab==='Quiz Builder'           && <QuizBuilderTab />}
        {activeTab==='Required Courses'       && <RequiredCoursesTab />}
        {activeTab==='Individual Assignments' && <IndividualAssignmentsTab />}
      </div>
    </div>
  )
}

const QB = {
  aiPanel: {background:'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',borderRadius:'12px',padding:'20px',marginBottom:'20px',color:'#fff'},
  aiTitle: {display:'flex',alignItems:'center',gap:'10px',fontSize:'16px',fontWeight:'700',marginBottom:'8px'},
  aiBadge: {background:'rgba(251,191,36,0.2)',color:'#fbbf24',padding:'2px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',border:'1px solid rgba(251,191,36,0.4)'},
  aiDesc: {fontSize:'13px',color:'rgba(255,255,255,0.8)',margin:'0 0 14px',lineHeight:'1.5'},
  aiRow: {display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'},
  aiBtn: {background:'#fbbf24',color:'#1a1a2e',border:'none',borderRadius:'8px',padding:'10px 20px',fontSize:'14px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap'},
  slideRef: {background:'#e3f2fd',color:'#1565c0',padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:'700'},
  correctBadge: {background:'#e8f5e9',color:'#2e7d32',padding:'4px 10px',borderRadius:'10px',fontSize:'13px',fontWeight:'700',border:'1px solid #a5d6a7'},
  correctBtn: {border:'none',borderRadius:'6px',padding:'6px 10px',fontSize:'11px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap'},
  statBox: {background:'#e3f2fd',borderRadius:'8px',padding:'12px 20px',textAlign:'center',minWidth:'100px'},
  statNum: {fontSize:'24px',fontWeight:'700',color:'#1565c0'},
  statLbl: {fontSize:'11px',color:'#666',textTransform:'uppercase',marginTop:'2px'},
}

const S = {
  page: {minHeight:'100vh',backgroundColor:'#f0f2f5',fontFamily:'Arial, Helvetica, sans-serif',padding:'24px'},
  pageHeader: {display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'},
  pageTitle: {fontSize:'26px',fontWeight:'700',color:'#1a1a2e',margin:'0 0 4px'},
  pageSubtitle: {fontSize:'14px',color:'#666',margin:0},
  backLink: {fontSize:'13px',color:'#b71c1c',textDecoration:'none',fontWeight:'600',marginTop:'4px'},
  tabBar: {display:'flex',gap:'4px',marginBottom:'24px',borderBottom:'2px solid #ddd',flexWrap:'wrap'},
  tabBtn: {padding:'10px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:'13px',fontWeight:'600',color:'#666',borderBottom:'2px solid transparent',marginBottom:'-2px'},
  tabBtnActive: {color:'#b71c1c',borderBottom:'2px solid #b71c1c'},
  tabContent: {background:'#fff',borderRadius:'10px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.07)'},
  tabHeader: {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'},
  tabTitle: {fontSize:'18px',fontWeight:'700',color:'#1a1a2e',margin:0},
  table: {width:'100%',borderCollapse:'collapse',fontSize:'14px'},
  th: {textAlign:'left',padding:'10px 12px',background:'#f7f7f9',color:'#555',fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.04em',borderBottom:'1px solid #e5e5e5'},
  tr: {borderBottom:'1px solid #f0f0f0'},
  td: {padding:'10px 12px',color:'#333',verticalAlign:'middle'},
  empty: {padding:'24px',textAlign:'center',color:'#aaa',fontSize:'14px'},
  badgeGreen: {background:'#e8f5e9',color:'#2e7d32',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'},
  badgeGray: {background:'#f5f5f5',color:'#999',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'},
  badgeBlue: {background:'#e3f2fd',color:'#1565c0',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'},
  code: {background:'#f5f5f5',padding:'2px 6px',borderRadius:'4px',fontSize:'12px',fontFamily:'monospace'},
  btnPrimary: {background:'#b71c1c',color:'#fff',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:'700',cursor:'pointer'},
  btnSmall: {background:'#e3f2fd',color:'#1565c0',border:'none',borderRadius:'6px',padding:'5px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'},
  btnSmallRed: {background:'#ffebee',color:'#b71c1c',border:'none',borderRadius:'6px',padding:'5px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'},
  overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'24px'},
  modal: {background:'#fff',borderRadius:'12px',padding:'32px',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:'16px'},
  modalHeader: {display:'flex',justifyContent:'space-between',alignItems:'center'},
  modalTitle: {fontSize:'18px',fontWeight:'700',color:'#1a1a2e',margin:0},
  closeBtn: {background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#666'},
  field: {display:'flex',flexDirection:'column',gap:'5px'},
  label: {fontSize:'13px',fontWeight:'600',color:'#444'},
  input: {padding:'9px 12px',borderRadius:'7px',border:'1px solid #ddd',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box'},
  textarea: {padding:'9px 12px',borderRadius:'7px',border:'1px solid #ddd',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box',minHeight:'80px',resize:'vertical',fontFamily:'Arial, Helvetica, sans-serif'},
  error: {background:'#fff0f0',border:'1px solid #ffcdd2',color:'#c62828',borderRadius:'8px',padding:'10px 14px',fontSize:'13px'},
  infoBox: {background:'#e3f2fd',border:'1px solid #bbdefb',color:'#1565c0',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',lineHeight:'1.6'},
  slideList: {maxHeight:'280px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'10px',border:'1px solid #eee',borderRadius:'8px',padding:'12px'},
  slideItem: {display:'flex',flexDirection:'column',gap:'4px'},
  slideLabel: {fontSize:'12px',fontWeight:'700',color:'#555'},
  hint: {fontSize:'13px',color:'#666',marginBottom:'16px',marginTop:'-4px'},
}
