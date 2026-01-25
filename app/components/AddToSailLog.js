'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const PRIORITIES = ['A - Critical', 'B - Moderate', 'C - Best Practice'];

export default function AddToSailLog({ sourceForm, prefillData = {}, sourceId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Default target date is 7 days from now
  const getDefaultTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    assigned_to: prefillData.reported_by || '',
    target_completion_date: getDefaultTargetDate(),
    priority: 'B - Moderate',
    action_item_description: prefillData.issue_description || ''
  });

  const handleSubmit = async () => {
    if (!formData.action_item_description.trim() || !formData.assigned_to.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sail_log')
        .insert([{
          submitter_name: prefillData.reported_by || 'Unknown',
          date: new Date().toISOString().split('T')[0],
          client_company: prefillData.company || '',
          location: prefillData.location || '',
          action_item_description: formData.action_item_description,
          assigned_to: formData.assigned_to,
          target_completion_date: formData.target_completion_date,
          priority: formData.priority,
          status: 'Open'
        }]);

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFormData({
          assigned_to: prefillData.reported_by || '',
          target_completion_date: getDefaultTargetDate(),
          priority: 'B - Moderate',
          action_item_description: prefillData.issue_description || ''
        });
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
          Action Item Description <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={formData.action_item_description}
          onChange={(e) => setFormData(prev => ({ ...prev, action_item_description: e.target.value }))}
          placeholder="Describe the action item that needs follow-up..."
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Assigned To <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.assigned_to}
          onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
          placeholder="Who should follow up on this?"
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Target Completion Date <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="date"
          value={formData.target_completion_date}
          onChange={(e) => setFormData(prev => ({ ...prev, target_completion_date: e.target.value }))}
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          Priority <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
          style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
          <span>🔴 A = Safety/OSHA</span>
          <span>🟡 B = Operational</span>
          <span>🟢 C = Improvement</span>
        </div>
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
