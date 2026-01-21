'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const RESPONSE_OPTIONS = ['Yes', 'No', 'Needs Improvement', 'N/A'];

export default function FluidTransferAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    // Permit & Documentation
    ftp_complete: '',
    hazards_addressed: '',
    tha_completed: '',
    // Equipment & Lines
    lines_walked: '',
    valve_alignment: '',
    whip_checks: '',
    lines_inspected: '',
    // Safety Measures
    bonding_grounding: '',
    drip_pans: '',
    // Communication & Staffing
    effective_comms: '',
    enough_staff: '',
    simops: '',
    // Observations
    opportunities: ''
  });

  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const photo of photos) {
      const fileName = `fluid-transfer/${Date.now()}-${photo.name}`;
      const { data, error } = await supabase.storage
        .from('safety-photos')
        .upload(fileName, photo);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      console.log('Starting form submission...');
      
      let photoUrls = [];
      if (photos.length > 0) {
        console.log('Uploading photos...');
        photoUrls = await uploadPhotos();
      }

      // Convert empty strings to null
      const cleanData = {};
      for (const [key, value] of Object.entries(formData)) {
        cleanData[key] = value === '' ? null : value;
      }

      const submitData = {
        ...cleanData,
        photo_urls: photoUrls.length > 0 ? photoUrls : null
      };

      console.log('Submitting to Supabase:', submitData);

      const { data, error } = await supabase
        .from('fluid_transfer_audits')
        .insert([submitData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Success:', data);
      setSubmitStatus('success');
      
      // Reset form
      setFormData({
        auditor_name: '',
        date: new Date().toISOString().split('T')[0],
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
      });
      setPhotos([]);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const RadioGroup = ({ label, name, required = false }) => (
    <tr>
      <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', textAlign: 'left' }}>
        {label}
      </td>
      {RESPONSE_OPTIONS.map(option => (
        <td key={option} style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={formData[name] === option}
            onChange={handleChange}
            required={required && option === 'Yes'}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </td>
      ))}
    </tr>
  );

  const styles = {
    container: { maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', color: '#fff', padding: '30px', textAlign: 'center' },
    headerTitle: { margin: '0', fontSize: '26px', fontWeight: '700' },
    headerSubtitle: { margin: '10px 0 0', opacity: '0.9', fontSize: '14px' },
    badge: { display: 'inline-block', background: '#fff', color: '#0891b2', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '10px' },
    formContent: { padding: '30px' },
    sectionHeader: { padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' },
    row: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1f2937', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    infoBox: { background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#0e7490' },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    tableHeader: { background: '#f3f4f6', padding: '10px 8px', textAlign: 'center', fontSize: '12px', borderBottom: '2px solid #d1d5db' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' },
    photoPreview: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
    photoThumb: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' },
    submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer', marginTop: '20px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '30px', borderRadius: '8px', textAlign: 'center', marginTop: '20px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }
  };

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={styles.headerTitle}>Fluid Transfer Permit Audit</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Fluid Transfer Permit Audit Submitted!</h2>
              <p>The audit has been recorded successfully.</p>
              <button
                onClick={() => setSubmitStatus(null)}
                style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '15px' }}
              >
                Start New Audit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <h1 style={styles.headerTitle}>Fluid Transfer Permit Audit</h1>
          <p style={styles.headerSubtitle}>Verify FTP Compliance & Safety Requirements</p>
          <div style={styles.badge}>🛢️ FLUID TRANSFER SAFETY</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            {/* Audit Information */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#0891b2', marginTop: '0' }}>
              📋 Audit Information
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name of Auditor <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  name="auditor_name"
                  value={formData.auditor_name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Location <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Permit & Documentation */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>
              📄 Permit & Documentation
            </div>

            <div style={styles.infoBox}>
              <strong>Pre-Transfer Requirements:</strong> Ensure all permits are complete and hazard assessments are documented before fluid transfer operations begin.
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '12px', width: '55%' }}>Audit Question</th>
                  <th style={{ ...styles.tableHeader, color: '#059669' }}>Yes</th>
                  <th style={{ ...styles.tableHeader, color: '#dc2626' }}>No</th>
                  <th style={{ ...styles.tableHeader, color: '#f59e0b' }}>Needs Improvement</th>
                  <th style={{ ...styles.tableHeader, color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <RadioGroup label="Fluid Transfer Permit filled out correctly & completely" name="ftp_complete" required />
                <RadioGroup label="Hazards adequately addressed for fluid type being transferred" name="hazards_addressed" required />
                <RadioGroup label="THA completed and hazards identified correctly" name="tha_completed" required />
              </tbody>
            </table>

            {/* Equipment & Lines */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>
              🔧 Equipment & Lines
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '12px', width: '55%' }}>Audit Question</th>
                  <th style={{ ...styles.tableHeader, color: '#059669' }}>Yes</th>
                  <th style={{ ...styles.tableHeader, color: '#dc2626' }}>No</th>
                  <th style={{ ...styles.tableHeader, color: '#f59e0b' }}>Needs Improvement</th>
                  <th style={{ ...styles.tableHeader, color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <RadioGroup label="All lines physically walked down prior to transfer" name="lines_walked" required />
                <RadioGroup label="Valve alignment verified & appropriate for job" name="valve_alignment" required />
                <RadioGroup label="Rated whip checks used at all connections" name="whip_checks" required />
                <RadioGroup label="Lines inspected prior to beginning transfer" name="lines_inspected" required />
              </tbody>
            </table>

            {/* Safety Measures */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>
              ⚠️ Safety Measures
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '12px', width: '55%' }}>Audit Question</th>
                  <th style={{ ...styles.tableHeader, color: '#059669' }}>Yes</th>
                  <th style={{ ...styles.tableHeader, color: '#dc2626' }}>No</th>
                  <th style={{ ...styles.tableHeader, color: '#f59e0b' }}>Needs Improvement</th>
                  <th style={{ ...styles.tableHeader, color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <RadioGroup label="Bonding/grounding connections in place for flammables" name="bonding_grounding" required />
                <RadioGroup label="Drip pans/duck ponds under every connection" name="drip_pans" required />
              </tbody>
            </table>

            {/* Communication & Staffing */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>
              👥 Communication & Staffing
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '12px', width: '55%' }}>Audit Question</th>
                  <th style={{ ...styles.tableHeader, color: '#059669' }}>Yes</th>
                  <th style={{ ...styles.tableHeader, color: '#dc2626' }}>No</th>
                  <th style={{ ...styles.tableHeader, color: '#f59e0b' }}>Needs Improvement</th>
                  <th style={{ ...styles.tableHeader, color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <RadioGroup label="Effective communications between all involved parties" name="effective_comms" required />
                <RadioGroup label="Enough staff for task without environmental or safety risks" name="enough_staff" required />
                <RadioGroup label="SIMOPS which impact safety or environmental aspects reviewed" name="simops" required />
              </tbody>
            </table>

            {/* Observations */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#f59e0b', color: '#000' }}>
              💡 Observations & Improvements
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Opportunities for Improvement or Good Jobs Observed</label>
              <textarea
                name="opportunities"
                value={formData.opportunities}
                onChange={handleChange}
                placeholder="Document any observations, best practices, or improvement opportunities..."
                style={styles.textarea}
              />
            </div>

            {/* Photo Documentation */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#0891b2' }}>
              📷 Photo Documentation
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Photo (Optional)</label>
              <div style={styles.photoUpload}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  id="photoInput"
                />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}>
                  <p>📷 Tap to take or upload photos</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Document transfer setup, connections, or findings</p>
                </label>
              </div>
              {photos.length > 0 && (
                <div style={styles.photoPreview}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(photo)} alt={`Preview ${index + 1}`} style={styles.photoThumb} />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitStatus && submitStatus.startsWith('error') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginTop: '20px', color: '#991b1b' }}>
                <strong>Error:</strong> {submitStatus.replace('error: ', '')}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Submitting...' : 'Submit FTP Audit'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}
