'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

export default function FluidTransferAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    audit_date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    ftp_complete: '',
    hazards_addressed: '',
    tha_completed: '',
    lines_walked: '',
    valve_alignment: '',
    whip_checks: '',
    lines_inspected: '',
    bonding_grounding: '',
    drip_pans: '',
    effective_comms: '',
    enough_staff: '',
    simops: '',
    opportunities: ''
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `fluid-transfer/${fileName}`
      const { error } = await supabase.storage.from('safety-photos').upload(filePath, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (error) {
      console.error('Photo upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      console.log('Starting FTP audit submission...')
      
      let photoUrl = null
      if (photoFile) {
        setStatus('Uploading photo...')
        console.log('Uploading photo...')
        photoUrl = await uploadPhoto(photoFile)
        console.log('Photo uploaded:', photoUrl)
      }

      // Convert empty strings to null
      const cleanedData = { ...formData }
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          cleanedData[key] = null
        }
      })

      const dataToSubmit = {
        ...cleanedData,
        photo_url: photoUrl
      }

      console.log('Data to submit:', dataToSubmit)
      setStatus('Saving to database...')

      const { data, error } = await supabase.from('fluid_transfer_audits').insert([dataToSubmit]).select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('SUCCESS! Data inserted:', data)
      setStatus('✅ Fluid Transfer Permit Audit submitted successfully!')
      
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Submission error:', error)
      setStatus('❌ Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const AuditTable = ({ items }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
      <thead>
        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
          <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', width: '55%' }}>Audit Question</th>
          <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '12px', color: '#059669' }}>Yes</th>
          <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '12px', color: '#dc2626' }}>No</th>
          <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '12px', color: '#f59e0b' }}>Needs Improvement</th>
          <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '12px', color: '#6b7280' }}>N/A</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '12px', fontSize: '14px' }}>{item.label}</td>
            {['Yes', 'No', 'Needs Improvement', 'N/A'].map(val => (
              <td key={val} style={{ textAlign: 'center', padding: '12px 8px' }}>
                <input type="radio" name={item.name} value={val} checked={formData[item.name] === val} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '15px', display: 'block', margin: '0 auto 15px auto' }} />
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>Fluid Transfer Permit Audit</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Verify FTP Compliance & Safety Requirements</p>
          <div style={{ display: 'inline-block', background: 'white', color: '#0891b2', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>🛢️ FLUID TRANSFER SAFETY</div>
        </div>

        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Audit Information */}
            <div style={{ background: '#0891b2', color: 'white', padding: '12px 20px', margin: '0 -30px 20px', fontWeight: 600, fontSize: '15px' }}>📋 Audit Information</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Name of Auditor *</label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Date *</label>
                <input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Location *</label>
                <select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Permit & Documentation */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📄 Permit & Documentation</div>
            
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#0e7490' }}>
              <strong>Pre-Transfer Requirements:</strong> Ensure all permits are complete and hazard assessments are documented before fluid transfer operations begin.
            </div>

            <AuditTable items={[
              { name: 'ftp_complete', label: 'Fluid Transfer Permit filled out correctly & completely' },
              { name: 'hazards_addressed', label: 'Hazards adequately addressed for fluid type being transferred' },
              { name: 'tha_completed', label: 'THA completed and hazards identified correctly' }
            ]} />

            {/* Equipment & Lines */}
            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🔧 Equipment & Lines</div>

            <AuditTable items={[
              { name: 'lines_walked', label: 'All lines physically walked down prior to transfer' },
              { name: 'valve_alignment', label: 'Valve alignment verified & appropriate for job' },
              { name: 'whip_checks', label: 'Rated whip checks used at all connections' },
              { name: 'lines_inspected', label: 'Lines inspected prior to beginning transfer' }
            ]} />

            {/* Safety Measures */}
            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>⚠️ Safety Measures</div>

            <AuditTable items={[
              { name: 'bonding_grounding', label: 'Bonding/grounding connections in place for flammables' },
              { name: 'drip_pans', label: 'Drip pans/duck ponds under every connection' }
            ]} />

            {/* Communication & Staffing */}
            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>👥 Communication & Staffing</div>

            <AuditTable items={[
              { name: 'effective_comms', label: 'Effective communications between all involved parties' },
              { name: 'enough_staff', label: 'Enough staff for task without environmental or safety risks' },
              { name: 'simops', label: 'SIMOPS which impact safety or environmental aspects reviewed' }
            ]} />

            {/* Observations */}
            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>💡 Observations & Improvements</div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Opportunities for Improvement or Good Jobs Observed</label>
              <textarea name="opportunities" value={formData.opportunities} onChange={handleChange} placeholder="Document any observations, best practices, or improvement opportunities..." style={{ width: '100%', minHeight: '100px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }} />
            </div>

            {/* Photo Documentation */}
            <div style={{ background: '#0891b2', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📷 Photo Documentation</div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Photo (Optional)</label>
              <div onClick={() => document.getElementById('photoInput').click()} style={{ border: photoPreview ? '2px solid #059669' : '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <><p>📷 Tap to take or upload photo</p><p style={{ fontSize: '12px', color: '#6b7280' }}>Document transfer setup, connections, or findings</p></>}
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} />}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? 'Submitting...' : 'Submit FTP Audit'}
            </button>

            {status && (
              <div style={{ marginTop: '15px', padding: '12px', background: status.includes('✅') ? '#d1fae5' : '#fee2e2', color: status.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </form>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>Powered by Predictive Safety Analytics™</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
      </div>
    </div>
  )
}
