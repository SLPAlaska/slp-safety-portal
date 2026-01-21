'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

export default function FieldEnvironmentalAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '', audit_date: new Date().toISOString().split('T')[0], company: '', location: '',
    access_limits: '', vehicle_routes: '', food_waste: '', bear_guards: '', animal_activity: '',
    waste_storages: '', wastes_stored: '', trucks_inspected: '',
    spill_kit: '', spill_equipment: '', spill_training: '', containments_free: '', spill_reporting: '', drip_drop_log: '',
    water_contamination: '', storm_water: '', air_emissions: '', equipment_maintained: '',
    cultural_sites: '', cultural_monitors: '',
    habitat_restoration: '', revegetation: '',
    permits_up_to_date: '', daily_logs: '', non_compliance: '',
    odpcp_understood: '', emergency_training: '', odpcp_contact_list: '', emergency_contact_list: '',
    improvements: ''
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
      const filePath = `env-audit-photos/${fileName}`
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
      let photoUrl = ''
      if (photoFile) {
        setStatus('Uploading photo...')
        photoUrl = await uploadPhoto(photoFile)
      }

      const dataToSubmit = { ...formData, photo_url: photoUrl || null }
      const { error } = await supabase.from('field_environmental_audits').insert([dataToSubmit])
      if (error) throw error

      setStatus('✅ Field Environmental Audit submitted successfully!')
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const AuditTable = ({ title, items }) => (
    <div style={{ marginBottom: '20px' }}>
      {title && <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#059669' }}>{title}</h3>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <input type="radio" name={item.name} value={val} checked={formData[item.name] === val} onChange={handleChange} required style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '15px', display: 'block', margin: '0 auto 15px auto' }} />
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>Field Environmental Audit</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Comprehensive Environmental Compliance Assessment</p>
          <div style={{ display: 'inline-block', background: 'white', color: '#059669', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>🌿 ENVIRONMENTAL PROTECTION</div>
        </div>

        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Audit Information */}
            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '0 -30px 20px', fontWeight: 600, fontSize: '15px' }}>📋 Audit Information</div>
            
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

            {/* Tundra & Wildlife Protection */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🦌 Tundra & Wildlife Protection</div>
            
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#065f46' }}>
              <strong>Arctic Environment:</strong> Assess measures to protect sensitive tundra ecosystems and wildlife habitats.
            </div>

            <AuditTable items={[
              { name: 'access_limits', label: 'Access limits disturbance to tundra/wildlife' },
              { name: 'vehicle_routes', label: 'Designated vehicle/equipment routes followed' },
              { name: 'food_waste', label: 'Food waste removed to prevent animal attractant' },
              { name: 'bear_guards', label: 'Bear guards identifying potential animal activity' },
              { name: 'animal_activity', label: 'Animal activity reported to Field Environmental Coordinator' }
            ]} />

            {/* Waste Management */}
            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🗑️ Waste Management</div>

            <AuditTable items={[
              { name: 'waste_storages', label: 'Waste storages properly constructed & maintained' },
              { name: 'wastes_stored', label: 'All wastes stored IAW regulations and permit stipulations' },
              { name: 'trucks_inspected', label: 'All trucks inspected for trackable materials' }
            ]} />

            {/* Spill Prevention & Response */}
            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🛢️ Spill Prevention & Response</div>

            <AuditTable items={[
              { name: 'spill_kit', label: 'Spill response kit in place & readily available' },
              { name: 'spill_equipment', label: 'Spill response equipment in good supply' },
              { name: 'spill_training', label: 'Personnel trained in spill response protocols' },
              { name: 'containments_free', label: 'All containments free of snow/ice/water' },
              { name: 'spill_reporting', label: 'Spill reporting requirements adhered to' },
              { name: 'drip_drop_log', label: 'Drip/drop log being utilized correctly' }
            ]} />

            {/* Water & Air Quality */}
            <div style={{ background: '#0891b2', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>💧 Water & Air Quality</div>

            <AuditTable items={[
              { name: 'water_contamination', label: 'Plan to prevent surface/ground water contamination' },
              { name: 'storm_water', label: 'Storm water runoff managed effectively' },
              { name: 'air_emissions', label: 'Air emissions within permitted limits' },
              { name: 'equipment_maintained', label: 'Equipment maintained to limit air pollution' }
            ]} />

            {/* Cultural Resources */}
            <div style={{ background: '#7c3aed', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🏛️ Cultural Resources</div>

            <AuditTable items={[
              { name: 'cultural_sites', label: 'Plan to preserve historic/cultural sites followed' },
              { name: 'cultural_monitors', label: 'Cultural resource monitors present during work' }
            ]} />

            {/* Habitat Restoration */}
            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🌱 Habitat Restoration</div>

            <AuditTable items={[
              { name: 'habitat_restoration', label: 'Need for habitat restoration post drilling work' },
              { name: 'revegetation', label: 'Will there be need for revegetation efforts' }
            ]} />

            {/* Documentation & Compliance */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📑 Documentation & Compliance</div>

            <AuditTable items={[
              { name: 'permits_up_to_date', label: 'All permits and documents on site up-to-date' },
              { name: 'daily_logs', label: 'Daily logs of activity and inspections maintained' },
              { name: 'non_compliance', label: 'Non-compliance reported/addressed promptly' }
            ]} />

            {/* Emergency Response */}
            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🚨 Emergency Response (ODPCP & WCERP)</div>

            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
              <strong>ODPCP:</strong> Oil Discharge Prevention & Contingency Plan<br />
              <strong>WCERP:</strong> Worst Case Emergency Response Plan
            </div>

            <AuditTable items={[
              { name: 'odpcp_understood', label: 'ODPCP & WCERP understood by affected parties' },
              { name: 'emergency_training', label: 'People trained in emergency response procedures' },
              { name: 'odpcp_contact_list', label: 'ODPCP & WCERP contact list available & current' },
              { name: 'emergency_contact_list', label: 'Emergency contact list for notification available' }
            ]} />

            {/* Improvement Opportunities */}
            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>💡 Improvement Opportunities</div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Describe any improvement opportunities identified during this audit</label>
              <textarea name="improvements" value={formData.improvements} onChange={handleChange} placeholder="Document any observations, recommendations, or improvement opportunities..." style={{ width: '100%', minHeight: '100px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }} />
            </div>

            {/* Photo Documentation */}
            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📷 Photo Documentation</div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Photo (Optional)</label>
              <div onClick={() => document.getElementById('photoInput').click()} style={{ border: photoPreview ? '2px solid #059669' : '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <><p>📷 Tap to take or upload photo</p><p style={{ fontSize: '12px', color: '#6b7280' }}>Document environmental conditions or findings</p></>}
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} />}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? 'Submitting...' : 'Submit Environmental Audit'}
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
