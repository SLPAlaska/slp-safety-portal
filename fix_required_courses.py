path = r'app\admin\lms\page.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''// \u2500\u2500\u2500 REQUIRED COURSES TAB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function RequiredCoursesTab() {
  const [required, setRequired] = useState([])
  const [companies, setCompanies] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({company_id:'',course_id:''})

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
    const res = await fetch('/api/lms/required-courses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); setForm({company_id:'',course_id:''}); load()
  }

  async function handleRemove(item) {
    if (!confirm(`Remove "${item.lms_courses?.title}" as required for ${item.lms_companies?.name}?`)) return
    await fetch('/api/lms/required-courses',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})})
    load()
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Required Courses</h2>
        <button style={S.btnPrimary} onClick={()=>setShowModal(true)}>+ Add Required Course</button>
      </div>
      <div style={S.infoBox}>Required courses are assigned to <strong>every active user in a company</strong> \u2014 use these for OSHA mandatory training that applies to all workers regardless of role.</div>
      <br/>
      <table style={S.table}>
        <thead><tr>{['Company','Course','Assigned','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {required.map(r=>(
            <tr key={r.id} style={S.tr}>
              <td style={S.td}>{r.lms_companies?.name}</td>
              <td style={S.td}>{r.lms_courses?.title}</td>
              <td style={S.td}>{new Date(r.assigned_at).toLocaleDateString()}</td>
              <td style={S.td}><button style={S.btnSmallRed} onClick={()=>handleRemove(r)}>Remove</button></td>
            </tr>
          ))}
          {required.length===0&&<tr><td colSpan={4} style={S.empty}>No required courses yet.</td></tr>}
        </tbody>
      </table>
      {showModal&&(
        <Modal title="Add Required Course" onClose={()=>setShowModal(false)}>
          <div style={S.infoBox}>This course will be required for <strong>all active users</strong> in the selected company.</div>
          <Field label="Company *">
            <select style={S.input} value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value}))}>
              <option value="">\u2014 Select Company \u2014</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Course *">
            <select style={S.input} value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))}>
              <option value="">\u2014 Select Course \u2014</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleAdd} disabled={saving||!form.company_id||!form.course_id}>{saving?'Saving\u2026':'Add Required Course'}</button>
        </Modal>
      )}
    </div>
  )
}'''

new = '''// \u2500\u2500\u2500 REQUIRED COURSES TAB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
      <div style={S.infoBox}>Required courses are assigned to <strong>every active user in a company</strong> \u2014 use these for OSHA mandatory training that applies to all workers regardless of role.</div>
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
            <span style={{color:'#999',fontSize:'12px'}}>{expanded[cid]?'\u25b2':'\u25bc'}</span>
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
              <option value="">\u2014 Select Company \u2014</option>
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
                        {selected && <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>\u2713</span>}
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
          <button style={S.btnPrimary} onClick={handleAdd} disabled={saving||!form.company_id||form.course_ids.length===0}>{saving?'Saving\u2026':`Assign ${form.course_ids.length||''} Course${form.course_ids.length!==1?'s':''}`}</button>
        </Modal>
      )}
    </div>
  )
}'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done.')
else:
    print('ERROR: Target string not found.')
