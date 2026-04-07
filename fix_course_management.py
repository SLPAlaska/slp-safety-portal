path = r"C:\Users\brian\OneDrive\SLP HARD DRIVE\00000-2026\GitHub Safety Portal\app\admin\lms\page.js"

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

original_count = len(content)

# ── 1. Add new state variables to CoursesTab ─────────────────────────────────
old_state = "  const [videoFile, setVideoFile] = useState(null)\n  const [videoUrl, setVideoUrl] = useState('')\n  const [selectedVideoSlide, setSelectedVideoSlide] = useState('')"
new_state = "  const [videoFile, setVideoFile] = useState(null)\n  const [videoUrl, setVideoUrl] = useState('')\n  const [selectedVideoSlide, setSelectedVideoSlide] = useState('')\n  const [showEditModal, setShowEditModal] = useState(null)\n  const [editForm, setEditForm] = useState({})\n  const [showSlideManager, setShowSlideManager] = useState(null)\n  const [slideManagerSlides, setSlideManagerSlides] = useState([])\n  const [loadingSlides, setLoadingSlides] = useState(false)"

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print("PASS 1: state variables added")
else:
    print("FAIL 1: state variables target not found")

# ── 2. Add edit/slide-manager functions after toggleCourseActive ──────────────
old_toggle = "  async function toggleCourseActive(course) {\n    await fetch('/api/lms/courses',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:course.id,active:!course.active})})\n    load()\n  }"
new_toggle = """  async function toggleCourseActive(course) {
    await fetch('/api/lms/courses',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:course.id,active:!course.active})})
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
  }"""

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle, 1)
    print("PASS 2: functions added")
else:
    print("FAIL 2: toggleCourseActive target not found")

# ── 3. Add Edit and Manage Slides buttons to course row ───────────────────────
old_buttons = "                <button style={S.btnSmall} onClick={()=>{setShowSlideModal(c);setError('')}}>Upload Slides</button>\n                <button style={S.btnSmall} onClick={()=>{setShowVideoModal(c);setError('');loadVideoSlides(c)}}>Add Video</button>\n                <button style={S.btnSmall} onClick={()=>toggleCourseActive(c)}>{c.active?'Deactivate':'Activate'}</button>"
new_buttons = "                <button style={S.btnSmall} onClick={()=>openEditCourse(c)}>Edit</button>\n                <button style={S.btnSmall} onClick={()=>openSlideManager(c)}>Manage Slides</button>\n                <button style={S.btnSmall} onClick={()=>{setShowSlideModal(c);setError('')}}>Upload Slides</button>\n                <button style={S.btnSmall} onClick={()=>{setShowVideoModal(c);setError('');loadVideoSlides(c)}}>Add Video</button>\n                <button style={S.btnSmall} onClick={()=>toggleCourseActive(c)}>{c.active?'Deactivate':'Activate'}</button>"

if old_buttons in content:
    content = content.replace(old_buttons, new_buttons, 1)
    print("PASS 3: buttons added")
else:
    print("FAIL 3: course row buttons target not found")

# ── 4. Add Edit modal and Slide Manager modal before closing CoursesTab return ─
old_video_modal_close = "      {showVideoModal&&(\n        <Modal title={`Add Video \u2014 ${showVideoModal.title}`} onClose={()=>{setShowVideoModal(null);setVideoFile(null);setVideoUrl('');setSelectedVideoSlide('')}}>"

new_edit_modal = """      {showEditModal&&(
        <Modal title={`Edit Course \u2014 ${showEditModal.title}`} onClose={()=>setShowEditModal(null)}>
          <Field label="Course Title *"><input style={S.input} value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Short Description"><textarea style={S.textarea} value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} /></Field>
          <Field label="Certificate Completion Text"><textarea style={{...S.textarea,minHeight:'80px'}} value={editForm.completion_text} onChange={e=>setEditForm(f=>({...f,completion_text:e.target.value}))} /></Field>
          <Field label="Regulation Reference"><input style={S.input} value={editForm.regulation_ref} onChange={e=>setEditForm(f=>({...f,regulation_ref:e.target.value}))} /></Field>
          <Field label="Minimum Pass Score (%)"><input style={S.input} type="number" min={1} max={100} value={editForm.pass_score} onChange={e=>setEditForm(f=>({...f,pass_score:parseInt(e.target.value)}))} /></Field>
          <Field label="Max Quiz Attempts (0 = unlimited)"><input style={S.input} type="number" min={0} value={editForm.max_quiz_attempts} onChange={e=>setEditForm(f=>({...f,max_quiz_attempts:parseInt(e.target.value)}))} /></Field>
          {error&&<div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleEditCourse} disabled={saving||!editForm.title}>{saving?'Saving\u2026':'Save Changes'}</button>
        </Modal>
      )}

      {showSlideManager&&(
        <Modal title={`Manage Slides \u2014 ${showSlideManager.title}`} onClose={()=>setShowSlideManager(null)}>
          {loadingSlides&&<div style={{textAlign:'center',padding:'24px',color:'#999'}}>Loading slides\u2026</div>}
          {!loadingSlides&&slideManagerSlides.length===0&&<div style={{textAlign:'center',padding:'24px',color:'#999'}}>No slides found.</div>}
          {!loadingSlides&&slideManagerSlides.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:'10px',maxHeight:'60vh',overflowY:'auto'}}>
              {slideManagerSlides.map((slide,idx)=>(
                <div key={slide.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px',border:'1px solid #eee',borderRadius:'8px',background:'#fafafa'}}>
                  <img src={slide.image_url} alt={'Slide '+slide.slide_order} style={{width:'80px',height:'55px',objectFit:'cover',borderRadius:'4px',border:'1px solid #ddd',flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'700',fontSize:'13px',color:'#1a1a2e'}}>Slide {slide.slide_order}</div>
                    <div style={{fontSize:'11px',color:'#999',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{slide.speaker_notes?slide.speaker_notes.substring(0,60)+'\u2026':'No speaker notes'}</div>
                    <div style={{fontSize:'11px',color:slide.audio_path?'#2e7d32':'#999',marginTop:'2px'}}>{slide.audio_path?'\u2713 Audio ready':'No audio'}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}}>
                    <button style={{...S.btnSmall,padding:'3px 8px',fontSize:'11px'}} onClick={()=>handleReorderSlide(slide,'up')} disabled={idx===0}>\u2191</button>
                    <button style={{...S.btnSmall,padding:'3px 8px',fontSize:'11px'}} onClick={()=>handleReorderSlide(slide,'down')} disabled={idx===slideManagerSlides.length-1}>\u2193</button>
                  </div>
                  <button style={{...S.btnSmallRed,padding:'5px 10px',fontSize:'12px',flexShrink:0}} onClick={()=>handleDeleteSlide(slide)}>Delete</button>
                </div>
              ))}
            </div>
          )}
          <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>Slides renumber automatically after delete. Audio and speaker notes are preserved on remaining slides.</div>
        </Modal>
      )}

      {showVideoModal&&(
        <Modal title={`Add Video \u2014 ${showVideoModal.title}`} onClose={()=>{setShowVideoModal(null);setVideoFile(null);setVideoUrl('');setSelectedVideoSlide('')}}>"""

if old_video_modal_close in content:
    content = content.replace(old_video_modal_close, new_edit_modal, 1)
    print("PASS 4: Edit and Slide Manager modals added")
else:
    print("FAIL 4: video modal target not found")

# ── Write result ──────────────────────────────────────────────────────────────
if content != open(path, 'r', encoding='utf-8', errors='replace').read():
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nSUCCESS: page.js updated ({original_count} -> {len(content)} chars)")
else:
    print("\nWARNING: No changes made — check FAIL messages above")
