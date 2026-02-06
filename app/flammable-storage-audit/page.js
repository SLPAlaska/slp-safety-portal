'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

const STORAGE_TYPES = ['Flammable Cabinet', 'Flammable Room', 'Outdoor Storage', 'Paint Locker', 'Fuel Storage', 'Solvent Cabinet', 'Chemical Storage Building', 'Dispensing Area', 'Drum Storage Area', 'IBC/Tote Storage', 'Other']

export default function FlammableStorageAuditForm() {
  const [formData, setFormData] = useState({
    audit_date: new Date().toISOString().split('T')[0], inspector_name: '', company: '', location: '', building_area: '', storage_area_type: '', cabinet_id: '',
    flammable_diamond: '', nfpa_label: '', contents_labeled: '', no_smoking_signs: '', emergency_contact: '', sds_available: '',
    doors_close: '', self_closing: '', no_rust: '', sump_intact: '', vents_configured: '', no_damage: '', grounding_lug: '',
    compatible_materials: '', containers_closed: '', no_overfilled: '', proper_containers: '', approved_containers: '', no_leaking: '', separated_from_oxidizers: '', max_quantity: '',
    fire_extinguisher: '', extinguisher_inspected: '', extinguisher_accessible: '', spill_kit: '', spill_kit_stocked: '', eyewash_nearby: '',
    grounding_bonding: '', no_electrical_hazards: '', proper_lighting: '', static_dissipation: '',
    area_clean: '', no_spills: '', aisle_space: '', no_combustibles: '', drip_pans_clean: '',
    inventory_current: '', inspection_log: '', training_records: '', permits_current: '',
    emergency_procedures: '', evacuation_route: '', emergency_contacts: '', personnel_trained: '',
    sail_log_items: '', comments: ''
  })

  const [findings, setFindings] = useState([])
  const [photos, setPhotos] = useState([])
  const [scores, setScores] = useState(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [auditId, setAuditId] = useState('')

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const addFinding = () => {
    setFindings([...findings, { id: Date.now(), category: '', severity: 'Minor', description: '', correctiveAction: '', assignedTo: '', dueDate: '' }])
  }

  const updateFinding = (id, field, value) => {
    setFindings(findings.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const removeFinding = (id) => {
    setFindings(findings.filter(f => f.id !== id))
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotos(prev => [...prev, { id: Date.now() + Math.random(), data: e.target.result, file }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id))
  }

  const uploadPhoto = async (photo) => {
    try {
      const fileExt = photo.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `flammable-storage/${fileName}`
      const { error } = await supabase.storage.from('safety-photos').upload(filePath, photo.file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (error) {
      console.error('Photo upload error:', error)
      return null
    }
  }

  const calculateScores = () => {
    const calcSection = (fields) => {
      let total = 0, count = 0
      fields.forEach(f => {
        const val = formData[f]
        if (val === 'Yes') { total += 100; count++ }
        else if (val === 'No') { total += 0; count++ }
        // N/A and empty strings are skipped
      })
      return count > 0 ? Math.round(total / count) : 100
    }

    const labeling = calcSection(['flammable_diamond', 'nfpa_label', 'contents_labeled', 'no_smoking_signs', 'emergency_contact', 'sds_available'])
    const cabinet = calcSection(['doors_close', 'self_closing', 'no_rust', 'sump_intact', 'vents_configured', 'no_damage', 'grounding_lug'])
    const storage = calcSection(['compatible_materials', 'containers_closed', 'no_overfilled', 'proper_containers', 'approved_containers', 'no_leaking', 'separated_from_oxidizers', 'max_quantity'])
    const safety = calcSection(['fire_extinguisher', 'extinguisher_inspected', 'extinguisher_accessible', 'spill_kit', 'spill_kit_stocked', 'eyewash_nearby'])
    const electrical = calcSection(['grounding_bonding', 'no_electrical_hazards', 'proper_lighting', 'static_dissipation'])
    const housekeeping = calcSection(['area_clean', 'no_spills', 'aisle_space', 'no_combustibles', 'drip_pans_clean'])
    const documentation = calcSection(['inventory_current', 'inspection_log', 'training_records', 'permits_current'])
    const emergency = calcSection(['emergency_procedures', 'evacuation_route', 'emergency_contacts', 'personnel_trained'])

    const overall = Math.round((labeling * 0.12) + (cabinet * 0.15) + (storage * 0.20) + (safety * 0.15) + (electrical * 0.12) + (housekeeping * 0.10) + (documentation * 0.08) + (emergency * 0.08))
    const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F'

    return { labeling, cabinet, storage, safety, electrical, housekeeping, documentation, emergency, overall, grade }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Calculating scores...')

    try {
      console.log('Starting submission...')
      
      const calculatedScores = calculateScores()
      console.log('Scores calculated:', calculatedScores)
      setScores(calculatedScores)
      
      setStatus('Uploading photos...')
      const photoUrls = []
      for (const photo of photos) {
        console.log('Uploading photo...')
        const url = await uploadPhoto(photo)
        if (url) photoUrls.push(url)
      }
      console.log('Photos uploaded:', photoUrls.length)

      const generatedAuditId = `FSA-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-4)}`
      setAuditId(generatedAuditId)
      console.log('Audit ID:', generatedAuditId)

      // Convert empty strings to null for all question fields
      const cleanedFormData = { ...formData }
      Object.keys(cleanedFormData).forEach(key => {
        if (cleanedFormData[key] === '') {
          cleanedFormData[key] = null
        }
      })

      const dataToSubmit = {
        ...cleanedFormData,
        findings: findings.length > 0 ? findings : null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        labeling_score: calculatedScores.labeling,
        cabinet_score: calculatedScores.cabinet,
        storage_score: calculatedScores.storage,
        safety_score: calculatedScores.safety,
        electrical_score: calculatedScores.electrical,
        housekeeping_score: calculatedScores.housekeeping,
        documentation_score: calculatedScores.documentation,
        emergency_score: calculatedScores.emergency,
        overall_score: calculatedScores.overall,
        grade: calculatedScores.grade
      }

      console.log('Data to submit:', dataToSubmit)
      setStatus('Submitting to database...')

      const { data, error } = await supabase.from('flammable_storage_audits').insert([dataToSubmit]).select()
      
      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('SUCCESS! Data inserted:', data)
      setStatus('✅ Flammable Storage Audit submitted successfully!')
      setTimeout(() => {
        document.getElementById('successBox').scrollIntoView({ behavior: 'smooth' })
      }, 500)
    } catch (error) {
      console.error('Submission error:', error)
      setStatus('❌ Error: ' + error.message)
      setIsSubmitting(false)
    }
  }

  const Question = ({ field, text }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'white', border: '2px solid #d1d5db', borderRadius: '8px', marginBottom: '10px' }}>
      <span style={{ flex: 1, fontSize: '14px', paddingRight: '15px' }}>{text}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['Yes', 'No', 'N/A'].map(val => (
          <button key={val} type="button" onClick={() => setFormData(prev => ({ ...prev, [field]: val }))} style={{ padding: '8px 16px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: formData[field] === val ? (val === 'Yes' ? '#059669' : val === 'No' ? '#BF0A30' : '#6b7280') : 'white', color: formData[field] === val ? 'white' : '#000' }}>
            {val}
          </button>
        ))}
      </div>
    </div>
  )

  if (isSubmitting && scores) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', borderTop: '6px solid #BF0A30', borderBottom: '6px solid #002868' }}>
          <div style={{ background: '#002868', color: 'white', padding: '25px', textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>Audit Score</h2>
          </div>
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '4px solid white', background: scores.grade === 'A' ? '#22c55e' : scores.grade === 'B' ? '#84cc16' : scores.grade === 'C' ? '#facc15' : scores.grade === 'D' ? '#f97316' : '#dc2626', color: scores.grade === 'C' ? '#000' : 'white' }}>
              <div style={{ fontSize: '60px', fontWeight: 'bold', lineHeight: 1 }}>{scores.grade}</div>
              <div style={{ fontSize: '16px' }}>{scores.overall}%</div>
            </div>
            <div id="successBox" style={{ background: status.includes('✅') ? '#059669' : '#dc2626', color: 'white', padding: '30px', borderRadius: '12px', marginTop: '20px' }}>
              <h2 style={{ margin: '0 0 10px' }}>{status.includes('✅') ? '✓ Audit Submitted Successfully!' : '✗ Submission Error'}</h2>
              {status.includes('✅') && (
                <>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '8px', margin: '15px 0', display: 'inline-block' }}>{auditId}</div>
                  <p>Your flammable storage audit has been recorded.</p>
                </>
              )}
              {!status.includes('✅') && <p>{status}</p>}
              <button type="button" onClick={() => window.location.reload()} style={{ background: 'white', color: status.includes('✅') ? '#059669' : '#dc2626', padding: '12px 30px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '15px' }}>
                {status.includes('✅') ? 'Start New Audit' : 'Try Again'}
              </button>
            </div>
            <div style={{ marginTop: '20px', fontSize: '13px', color: '#666' }}>
              Check browser console (F12) for detailed error information
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', borderTop: '6px solid #BF0A30', borderBottom: '6px solid #002868' }}>
        <div style={{ textAlign: 'center', padding: '15px', background: 'white' }}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxHeight: '80px' }} />
        </div>
        <div style={{ background: '#002868', color: 'white', padding: '25px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🔥 Flammable Storage Audit</h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}>OSHA 29 CFR 1910.106 Compliance Inspection</p>
        </div>
        <div style={{ padding: '25px' }}>
          <form onSubmit={handleSubmit}>
            
            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '0 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>📋 General Information</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Audit Date *</label><input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Inspector Name *</label><input type="text" name="inspector_name" value={formData.inspector_name} onChange={handleChange} required placeholder="Enter your name" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Client / Company *</label><select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }}><option value="">-- Select Company --</option>{COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Location *</label><select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }}><option value="">-- Select Location --</option>{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Building / Area</label><input type="text" name="building_area" value={formData.building_area} onChange={handleChange} placeholder="e.g., Warehouse A, Module 3" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Storage Area Type *</label><select name="storage_area_type" value={formData.storage_area_type} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }}><option value="">-- Select Type --</option>{STORAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>

            <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Cabinet / Container ID</label><input type="text" name="cabinet_id" value={formData.cabinet_id} onChange={handleChange} placeholder="e.g., FC-001, Tank-A" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} /></div>

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>🏷️ Labeling & Signage</div>
            <Question field="flammable_diamond" text="Flammable diamond/placard present and visible?" />
            <Question field="nfpa_label" text="NFPA 704 label correct and legible?" />
            <Question field="contents_labeled" text="All containers properly labeled with contents?" />
            <Question field="no_smoking_signs" text='"No Smoking" signs posted and visible?' />
            <Question field="emergency_contact" text="Emergency contact information posted?" />
            <Question field="sds_available" text="SDS sheets available and accessible?" />

            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>🗄️ Cabinet / Storage Area Condition</div>
            <Question field="doors_close" text="Cabinet doors close and latch properly?" />
            <Question field="self_closing" text="Self-closing mechanism functional?" />
            <Question field="no_rust" text="No visible rust or corrosion?" />
            <Question field="sump_intact" text="Liquid-tight sump/spill containment intact?" />
            <Question field="vents_configured" text="Vents properly configured (plugged or ducted)?" />
            <Question field="no_damage" text="No visible damage, dents, or holes?" />
            <Question field="grounding_lug" text="Grounding lug present and functional?" />

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>📦 Storage Practices</div>
            <Question field="compatible_materials" text="Only compatible materials stored together?" />
            <Question field="containers_closed" text="All containers closed when not in use?" />
            <Question field="no_overfilled" text="No overfilled containers?" />
            <Question field="proper_containers" text="Proper container types used (safety cans, etc.)?" />
            <Question field="approved_containers" text="Original or approved containers only?" />
            <Question field="no_leaking" text="No leaking or damaged containers?" />
            <Question field="separated_from_oxidizers" text="Flammables separated from oxidizers/acids?" />
            <Question field="max_quantity" text="Maximum quantity limits not exceeded?" />

            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>🧯 Safety Equipment</div>
            <Question field="fire_extinguisher" text="Fire extinguisher present within 50 feet?" />
            <Question field="extinguisher_inspected" text="Extinguisher inspection current (monthly)?" />
            <Question field="extinguisher_accessible" text="Extinguisher unobstructed and accessible?" />
            <Question field="spill_kit" text="Spill kit available nearby?" />
            <Question field="spill_kit_stocked" text="Spill kit properly stocked?" />
            <Question field="eyewash_nearby" text="Eyewash/safety shower within reach?" />

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>⚡ Electrical / Grounding & Bonding</div>
            <Question field="grounding_bonding" text="Grounding and bonding in place for transfers?" />
            <Question field="no_electrical_hazards" text="No electrical hazards nearby (sparking, etc.)?" />
            <Question field="proper_lighting" text="Explosion-proof lighting if required?" />
            <Question field="static_dissipation" text="Static dissipation measures in place?" />

            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>🧹 Housekeeping</div>
            <Question field="area_clean" text="Area clean and organized?" />
            <Question field="no_spills" text="No spills, stains, or residue present?" />
            <Question field="aisle_space" text="Adequate aisle space maintained (36 inches)?" />
            <Question field="no_combustibles" text="No combustibles stored near flammables?" />
            <Question field="drip_pans_clean" text="Drip pans and shelves clean?" />

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>📄 Documentation & Training</div>
            <Question field="inventory_current" text="Inventory records current and accurate?" />
            <Question field="inspection_log" text="Inspection log maintained?" />
            <Question field="training_records" text="Personnel training records current?" />
            <Question field="permits_current" text="Required permits current (if applicable)?" />

            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>🚨 Emergency Preparedness</div>
            <Question field="emergency_procedures" text="Emergency procedures posted?" />
            <Question field="evacuation_route" text="Evacuation route clear and marked?" />
            <Question field="emergency_contacts" text="Emergency contacts current?" />
            <Question field="personnel_trained" text="Personnel trained on emergency response?" />

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>⚠️ Findings & Corrective Actions</div>
            
            <div style={{ background: '#eff6ff', borderLeft: '4px solid #002868', borderRadius: '6px', padding: '14px', marginBottom: '15px', fontSize: '13px', color: '#002868' }}>
              Document any deficiencies, hazards, or non-compliant conditions found during the audit.
            </div>

            {findings.map(f => (
              <div key={f.id} style={{ border: '2px solid #d1d5db', borderRadius: '8px', padding: '20px', marginBottom: '15px', background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Category</label><select value={f.category} onChange={(e) => updateFinding(f.id, 'category', e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}><option value="">-- Select --</option><option value="Labeling">Labeling & Signage</option><option value="Cabinet">Cabinet Condition</option><option value="Storage">Storage Practices</option><option value="Safety">Safety Equipment</option><option value="Electrical">Electrical/Grounding</option><option value="Housekeeping">Housekeeping</option><option value="Documentation">Documentation</option><option value="Emergency">Emergency</option><option value="Other">Other</option></select></div>
                  <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Severity</label><select value={f.severity} onChange={(e) => updateFinding(f.id, 'severity', e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}><option value="Minor">Minor</option><option value="Major">Major</option><option value="Critical">Critical</option></select></div>
                </div>
                <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '13px', fontWeight: 600 }}>Finding Description</label><textarea value={f.description} onChange={(e) => updateFinding(f.id, 'description', e.target.value)} placeholder="Describe the finding..." style={{ width: '100%', minHeight: '60px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
                <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '13px', fontWeight: 600 }}>Corrective Action</label><textarea value={f.correctiveAction} onChange={(e) => updateFinding(f.id, 'correctiveAction', e.target.value)} placeholder="What needs to be done?" style={{ width: '100%', minHeight: '60px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Assigned To</label><input type="text" value={f.assignedTo} onChange={(e) => updateFinding(f.id, 'assignedTo', e.target.value)} placeholder="Person responsible" style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
                  <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Due Date</label><input type="date" value={f.dueDate} onChange={(e) => updateFinding(f.id, 'dueDate', e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
                </div>
                <button type="button" onClick={() => removeFinding(f.id)} style={{ background: '#BF0A30', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginTop: '10px' }}>Remove</button>
              </div>
            ))}

            <button type="button" onClick={addFinding} style={{ padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', background: '#059669', color: 'white' }}>+ Add Finding</button>

            <div style={{ background: '#eff6ff', border: '2px solid #002868', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
              <h4 style={{ margin: '0 0 12px', color: '#002868' }}>📝 Items Added to SAIL Log?</h4>
              <p style={{ fontSize: '13px', margin: '0 0 12px', color: '#002868' }}>Were any items from this audit added to the Safety Action Item List (SAIL) Log?</p>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {['Yes', 'No', 'N/A'].map(val => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, background: formData.sail_log_items === val ? '#002868' : 'white', color: formData.sail_log_items === val ? 'white' : '#000' }}>
                    <input type="radio" name="sail_log_items" value={val} checked={formData.sail_log_items === val} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                    <span>{val}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: '#002868', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>💬 Additional Comments</div>
            <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#002868' }}>Inspector Comments / Notes</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Additional observations, recommendations, or notes..." style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', resize: 'vertical' }} /></div>

            <div style={{ background: '#BF0A30', color: 'white', padding: '12px 18px', margin: '25px 0 15px', fontWeight: 600, fontSize: '15px', borderRadius: '6px' }}>📷 Photo Documentation</div>
            <div style={{ border: '3px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', margin: '20px 0', background: '#fafafa' }}>
              <input type="file" id="photoInput" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoChange} />
              <button type="button" onClick={() => document.getElementById('photoInput').click()} style={{ padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', background: '#002868', color: 'white' }}>📷 Add Photos</button>
              <p style={{ fontSize: '13px', color: '#666', margin: '12px 0 0' }}>Upload photos of storage areas, findings, or conditions</p>
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  {photos.map(p => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <img src={p.data} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #d1d5db' }} />
                      <button type="button" onClick={() => removePhoto(p.id)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#BF0A30', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#9ca3af' : '#002868', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? status || 'Submitting...' : 'Submit Audit'}
            </button>

            {status && !isSubmitting && (
              <div style={{ marginTop: '15px', padding: '12px', background: status.includes('✅') ? '#d1fae5' : '#fee2e2', color: status.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </form>
        </div>

        <div style={{ textAlign: 'center', padding: '20px', marginTop: '30px', borderTop: '3px solid #BF0A30', background: '#f8fafc', fontSize: '12px', color: '#64748b' }}>
          <span style={{ color: '#002868', fontWeight: 600 }}>AnthroSafe™ Powered by Field Driven Data™</span> | © 2025 SLP Alaska
        </div>
      </div>
    </div>
  )
}
