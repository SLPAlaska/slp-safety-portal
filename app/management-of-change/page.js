'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const CHANGE_TYPES = [
  'Equipment',
  'Process',
  'Procedure',
  'Personnel',
  'Material',
  'Technology',
  'Facility',
  'Organizational',
  'Other'
];

export default function ManagementOfChange() {
  const [formData, setFormData] = useState({
    requestor_name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    immediate_supervisor: '',
    type_of_change: '',
    policy_procedure_num: '',
    describe_change: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `moc_${Date.now()}.${fileExt}`;
    const filePath = `management-of-change/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('safety-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('safety-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      const submitData = {
        requestor_name: formData.requestor_name,
        date: formData.date,
        location: formData.location,
        immediate_supervisor: formData.immediate_supervisor,
        type_of_change: formData.type_of_change,
        policy_procedure_num: formData.policy_procedure_num || null,
        describe_change: formData.describe_change,
        photo_url: photoUrl
      };

      const { error } = await supabase.from('management_of_change').insert([submitData]);
      if (error) throw error;

      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting MOC request: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      requestor_name: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      immediate_supervisor: '',
      type_of_change: '',
      policy_procedure_num: '',
      describe_change: ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setSubmitted(false);
  };

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#059669', marginBottom: '10px', fontSize: '24px' }}>MOC Request Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Your Management of Change request has been recorded.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={resetForm} style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Submit Another Request
              </button>
              <a href="/" style={{ background: '#6b7280', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                Back to Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const styles = {
    input: { width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', background: 'white' },
    textarea: { width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '15px' }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← Back to Portal</a>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px', width: 'fit-content', margin: '15px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', height: 'auto' }} />
          </div>
          <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px', margin: '15px 0', border: '3px solid #b91c1c' }}>
            MANAGEMENT OF CHANGE
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>MOC Request</h1>
          <p style={{ opacity: 0.95, fontSize: '16px' }}>SLP Alaska Safety Management System</p>
        </div>

        {/* Form */}
        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Requestor Information */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '16px' }}>
                Requestor Information
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={styles.label}>Name of Requestor <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input 
                      type="text" 
                      name="requestor_name" 
                      value={formData.requestor_name} 
                      onChange={handleChange} 
                      required 
                      placeholder="Your full name"
                      style={styles.input} 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input 
                      type="date" 
                      name="date" 
                      value={formData.date} 
                      onChange={handleChange} 
                      required 
                      style={styles.input} 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                      <option value="">-- Select Location --</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Immediate Supervisor <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input 
                      type="text" 
                      name="immediate_supervisor" 
                      value={formData.immediate_supervisor} 
                      onChange={handleChange} 
                      required 
                      placeholder="Supervisor's full name"
                      style={styles.input} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Details */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '16px' }}>
                Change Details
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Type of Change <span style={{ color: '#b91c1c' }}>*</span></label>
                  <select name="type_of_change" value={formData.type_of_change} onChange={handleChange} required style={styles.select}>
                    <option value="">-- Select Type of Change --</option>
                    {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Policy/Procedure # If Applicable</label>
                  <input 
                    type="text" 
                    name="policy_procedure_num" 
                    value={formData.policy_procedure_num} 
                    onChange={handleChange} 
                    placeholder="Enter policy or procedure number"
                    style={styles.input} 
                  />
                </div>
                <div>
                  <label style={styles.label}>Describe recommended change & why <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea 
                    name="describe_change" 
                    value={formData.describe_change} 
                    onChange={handleChange} 
                    required 
                    placeholder="Provide a detailed description of the recommended change and the reasons for it..."
                    style={styles.textarea}
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '16px' }}>
                Supporting Documentation
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <label style={styles.label}>Upload Photo (optional)</label>
                <div 
                  onClick={() => document.getElementById('photo-input').click()}
                  style={{ 
                    border: `2px dashed ${photoPreview ? '#059669' : '#d1d5db'}`, 
                    borderRadius: '12px', 
                    padding: '30px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    background: photoPreview ? '#ecfdf5' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="file" 
                    id="photo-input" 
                    accept="image/*" 
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                  {photoPreview ? (
                    <div>
                      <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', marginBottom: '10px' }} />
                      <p style={{ color: '#059669', fontWeight: '600' }}>{photoFile?.name}</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
                      <p style={{ color: '#6b7280', fontSize: '15px' }}>Click or tap to upload a photo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '16px 32px',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '18px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(30, 58, 138, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit MOC Request'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)', color: '#64748b', fontSize: '11px', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
        </div>
      </div>
    </div>
  );
}
