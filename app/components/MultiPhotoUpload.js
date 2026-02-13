'use client';
import { useState, useImperativeHandle, forwardRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const MultiPhotoUpload = forwardRef(function MultiPhotoUpload({ formType, maxPhotos = 6 }, ref) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useImperativeHandle(ref, () => ({
    async uploadAll(submissionId) {
      if (photos.length === 0) return [];
      setUploading(true);
      setUploadError(null);
      const urls = [];
      try {
        for (const photo of photos) {
          const fileExt = photo.name.split('.').pop().toLowerCase();
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          const fileName = `${timestamp}-${randomId}.${fileExt}`;
          const filePath = `${formType}/${submissionId}/${fileName}`;
          const { error } = await supabase.storage.from('safety-photos').upload(filePath, photo);
          if (error) throw new Error(`Photo upload failed: ${error.message}`);
          const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(filePath);
          urls.push(publicUrl);
        }
        return urls;
      } catch (err) {
        setUploadError(err.message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    reset() { setPhotos([]); setUploadError(null); },
    hasPhotos() { return photos.length > 0; }
  }));

  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    if (photos.length + selectedFiles.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed. You have ${photos.length} already.`);
      e.target.value = ''; return;
    }
    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFiles.some(f => f.size > MAX_SIZE)) {
      alert('One or more files exceed the 10MB limit.'); e.target.value = ''; return;
    }
    const ALLOWED = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/heic','image/heif'];
    if (selectedFiles.some(f => !ALLOWED.includes(f.type))) {
      alert('Only image files are allowed (JPG, PNG, GIF, WebP, HEIC).'); e.target.value = ''; return;
    }
    setPhotos(prev => [...prev, ...selectedFiles]);
    setUploadError(null);
    e.target.value = '';
  };

  const removePhoto = (index) => { setPhotos(prev => prev.filter((_, i) => i !== index)); };

  return (
    <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '16px', marginBottom: '20px', background: '#f9fafb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: photos.length > 0 ? '12px' : '0' }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
          📸 Photos ({photos.length}/{maxPhotos})
        </span>
        {photos.length < maxPhotos && !uploading && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#6b7280', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              📁 Choose Files
              <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
            </label>
          </div>
        )}
        {uploading && <span style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Uploading photos...</span>}
      </div>
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {photos.map((photo, index) => (
            <div key={`${photo.name}-${index}`} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <img src={URL.createObjectURL(photo)} alt={`Photo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!uploading && (
                <button type="button" onClick={() => removePhoto(index)} style={{ position: 'absolute', top: '-1px', right: '-1px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {uploadError && (
        <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>{uploadError}</div>
      )}
    </div>
  );
});

export default MultiPhotoUpload;
