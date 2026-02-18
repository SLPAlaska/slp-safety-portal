'use client';
import { useState, useImperativeHandle, forwardRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

/**
 * Compress an image file using canvas
 * Target: ~800KB max, 1920px max dimension, JPEG quality 0.7
 * This turns 3-5MB phone photos into ~300-800KB uploads
 */
async function compressImage(file) {
  // Skip if already small enough (under 500KB)
  if (file.size < 500 * 1024) return file;

  // Skip non-compressible formats
  if (file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (max 1920px on longest side)
      const MAX_DIM = 1920;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob - JPEG at 0.7 quality
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            // Compression helped - use compressed version
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressed);
          } else {
            // Compression didn't help - use original
            resolve(file);
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fall back to original on error
    };

    img.src = url;
  });
}

/**
 * Upload a single file with retry logic
 * Retries up to 3 times with increasing delay
 */
async function uploadWithRetry(filePath, fileData, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.storage.from('safety-photos').upload(filePath, fileData);
      if (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Wait before retry: 1s, 2s, 4s
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
          continue;
        }
      } else {
        return { success: true };
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}

const MultiPhotoUpload = forwardRef(function MultiPhotoUpload({ formType, maxPhotos = 6 }, ref) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState(null);

  useImperativeHandle(ref, () => ({
    async uploadAll(submissionId) {
      if (photos.length === 0) return { urls: [], failedCount: 0 };
      setUploading(true);
      setUploadError(null);
      const urls = [];
      let failedCount = 0;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          setUploadProgress(`Compressing photo ${i + 1} of ${photos.length}...`);

          // Compress the image before upload
          const compressed = await compressImage(photo);
          const sizeMB = (compressed.size / (1024 * 1024)).toFixed(1);

          setUploadProgress(`Uploading photo ${i + 1} of ${photos.length} (${sizeMB}MB)...`);

          const fileExt = compressed.name.split('.').pop().toLowerCase();
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          const fileName = `${timestamp}-${randomId}.${fileExt}`;
          const filePath = `${formType}/${submissionId}/${fileName}`;

          // Upload with retry logic (3 attempts)
          const result = await uploadWithRetry(filePath, compressed);

          if (!result.success) {
            console.warn(`Photo upload failed for ${photo.name} after 3 retries: ${result.error?.message}`);
            failedCount++;
            continue;
          }

          const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(filePath);
          urls.push(publicUrl);
        } catch (err) {
          console.warn(`Photo upload error for ${photo.name}: ${err.message}`);
          failedCount++;
          continue;
        }
      }

      setUploadProgress('');

      if (failedCount > 0 && failedCount < photos.length) {
        setUploadError(`${failedCount} of ${photos.length} photos failed to upload. The rest were saved.`);
      } else if (failedCount === photos.length) {
        setUploadError('All photos failed to upload. Your form data was still saved.');
      }

      setUploading(false);
      return { urls, failedCount };
    },
    reset() { setPhotos([]); setUploadError(null); setUploadProgress(''); },
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
        {uploading && <span style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: '500' }}>{uploadProgress || 'Uploading...'}</span>}
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
        <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', fontSize: '13px' }}>{uploadError}</div>
      )}
    </div>
  );
});

export default MultiPhotoUpload;
