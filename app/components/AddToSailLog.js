'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const CATEGORIES = [
  'Equipment Deficiency',
  'Safety Hazard',
  'Environmental Concern',
  'Process Improvement',
  'Training Need',
  'Documentation Issue',
  'Compliance Gap',
  'Near Miss Follow-up',
  'Audit Finding',
  'Inspection Deficiency',
  'Other'
];

export default function AddToSailLog({ sourceForm, prefillData = {}, sourceId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    issue_description: prefillData.issue_description || ''
  });

  const handleSubmit = async () => {
    if (!formData.category || !formData.issue_description.trim()) {
      alert('Please select a category and describe the issue.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sail_log')
        .insert([{
          client_company: prefillData.company || '',
          location: prefillData.location || '',
          submitter_name: prefillData.reported_by || '',
          action_item_description: formData.issue_description,
          category: formData.category,
          priority: formData.priority,
          status: 'Open',
          date_opened: new Date().toISOString().split('T')[0],
          source_form: sourceForm,
          source_id: sourceId
        }]);

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFormData({ category: '', priority: 'Medium', issue_description: prefillData.issue_description || '' });
      }, 1500);
    } catch (error) {
      console.error('SAIL Log error:', error);
      alert('Error adding to SAIL Log: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        📝 Add to SAIL Log
      </button>
    );
  }

  if (submitted) {
    return (
      <div style={{
        background: '#dcfce7',
        border: '2px solid #16a34a',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
        <p style={{ color: '#16a34a', fontWeight: '600' }}>Added to SAIL Log!</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '2px solid #f59e0b',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#92400e', fontSize: '16px' }}>📝 Add to SAIL Log</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Category <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">-- Select Category --</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Priority
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['High', 'Medium', 'Low'].map(priority => (
            <label
              key={priority}
              onClick={() => setFormData(prev => ({ ...prev, priority }))}
              style={{
                flex: 1,
                padding: '8px',
                border: `2px solid ${formData.priority === priority ? (priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#f59e0b' : '#16a34a') : '#d1d5db'}`,
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                background: formData.priority === priority ? (priority === 'High' ? '#fef2f2' : priority === 'Medium' ? '#fffbeb' : '#f0fdf4') : 'white',
                color: priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#16a34a'
              }}
            >
              {priority === 'High' ? '🔴' : priority === 'Medium' ? '🟡' : '🟢'} {priority}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Issue Description <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={formData.issue_description}
          onChange={(e) => setFormData(prev => ({ ...prev, issue_description: e.target.value }))}
          placeholder="Describe the issue that needs follow-up..."
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px',
          background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: submitting ? 'not-allowed' : 'pointer'
        }}
      >
        {submitting ? 'Adding...' : 'Add to SAIL Log'}
      </button>
    </div>
  );
}
