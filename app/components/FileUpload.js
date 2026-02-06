'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

export default function FileUpload({ onFilesChange, maxFiles = 6 }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Check max files
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check file sizes (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const oversized = selectedFiles.filter(f => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      alert('Some files exceed 10MB limit');
      return;
    }

    // Check file types
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const invalidFiles = selectedFiles.filter(f => !ALLOWED_TYPES.includes(f.type));
    if (invalidFiles.length > 0) {
      alert('Only images (jpg, png, gif, webp) and videos (mp4, mov, avi) are allowed');
      return;
    }

    setUploading(true);
    const newUrls = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('form-attachments')
          .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const updatedFiles = [...files, ...selectedFiles];
      const updatedUrls = [...uploadedUrls, ...newUrls];
      
      setFiles(updatedFiles);
      setUploadedUrls(updatedUrls);
      
      // Pass URLs to parent
      if (onFilesChange) {
        onFilesChange(updatedUrls);
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedUrls = uploadedUrls.filter((_, i) => i !== index);
    
    setFiles(updatedFiles);
    setUploadedUrls(updatedUrls);
    
    if (onFilesChange) {
      onFilesChange(updatedUrls);
    }
  };

  return (
    <div style={{
      border: '2px dashed #d1d5db',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      background: '#f9fafb'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
          📸 Photos & Videos ({files.length}/{maxFiles})
        </h3>
        {files.length < maxFiles && (
          <label style={{
            background: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'inline-block'
          }}>
            {uploading ? 'Uploading...' : '+ Add Files'}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {files.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '10px'
        }}>
          {files.map((file, index) => (
            <div key={index} style={{
              position: 'relative',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              background: 'white'
            }}>
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f3f4f6',
                  fontSize: '40px'
                }}>
                  🎥
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
              <div style={{
                padding: '8px',
                fontSize: '11px',
                color: '#6b7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          No files uploaded yet. Click "Add Files" to upload photos or videos.
        </div>
      )}

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        Max {maxFiles} files • Images & Videos • 10MB per file
      </div>
    </div>
  );
}
