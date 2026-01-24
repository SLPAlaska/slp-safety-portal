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
  'Procedure Violation',
  'Training Need',
  'PPE Issue',
  'Housekeeping',
  'Documentation',
  'Near Miss',
  'Good Catch',
  'Other'
];

/**
 * AddToSailLog Component
 * 
 * Usage in any form's success screen:
 * 
 * import AddToSailLog from '@/components/AddToSailLog';
 * 
 * <AddToSailLog
 *   sourceForm="shackle-inspection"
 *   sourceId={submittedRecordId}  // optional
 *   prefillData={{
 *     company: formData.company,
 *     location: formData.location,
 *     reported_by: formData.inspector_name,
 *     issue_description: formData.comments
 *   }}
 *   onComplete={() => console.log('Added to SAIL!')}
 * />
 */

export default function AddToSailLog({ 
  sourceForm = '', 
  sourceId = null, 
  prefillData = {}, 
  onComplete = () => {} 
}) {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const defaultTargetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [sailData, setSailData] = useState({
    client_company: prefillData.company || '',
    location: prefillData.location || '',
    submitter_name: prefillData.reported_by || '',
    category: '',
    action_item_description: prefillData.issue_description || '',
    priority: 'Medium',
    assigned_to: '',
    target_completion_date: defaultTargetDate,
    immediate_action: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSailData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sail_log')
        .insert([{
          date: today,
          client_company: sailData.client_company,
          location: sailData.location,
          submitter_name: sailData.submitter_name,
          category: sailData.category,
          action_item_description: sailData.action_item_description,
          immediate_action: sailData.immediate_action || null,
          priority: sailData.priority,
          assigned_to: sailData.assigned_to,
          target_completion_date: sailData.target_completion_date,
          status: 'Open',
          date_opened: today,
          source_form: sourceForm || null,
          source_id: sourceId
        }]);

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        setShowModal(false);
        onComplete();
      }, 1500);
      
    } catch (error) {
      console.error('Error adding to SAIL Log:', error);
      alert('Error adding to SAIL Log: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Button to trigger modal
  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
      >
        📝 Add to SAIL Log
      </button>
    );
  }

  // Modal
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '20px',
          borderRadius: '16px 16px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>📝 Add to SAIL Log</h2>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0 0', fontSize: '14px' }}>
            Track this item for follow-up and resolution
          </p>
        </div>

        {/* Form Content */}
        {submitted ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>✅</div>
            <h3 style={{ color: '#16a34a', marginBottom: '10px' }}>Added to SAIL Log!</h3>
            <p style={{ color: '#6b7280' }}>This item is now being tracked.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Pre-filled info display */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Source</div>
              <div style={{ fontSize: '14px', color: '#1e293b' }}>
                <strong>{sourceForm || 'Manual Entry'}</strong>
                {prefillData.company && ` • ${prefillData.company}`}
                {prefillData.location && ` • ${prefillData.location}`}
              </div>
            </div>

            {/* Company (if not prefilled) */}
            {!prefillData.company && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                  Company *
                </label>
                <input
                  type="text"
                  name="client_company"
                  value={sailData.client_company}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
            )}

            {/* Location (if not prefilled) */}
            {!prefillData.location && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={sailData.location}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Category *
              </label>
              <select
                name="category"
                value={sailData.category}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="">Select Category...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Action Item Description */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Action Item Description *
              </label>
              <textarea
                name="action_item_description"
                value={sailData.action_item_description}
                onChange={handleChange}
                required
                placeholder="Describe the issue, deficiency, or item that needs follow-up..."
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            {/* Immediate Action */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Immediate Action Taken (optional)
              </label>
              <input
                type="text"
                name="immediate_action"
                value={sailData.immediate_action}
                onChange={handleChange}
                placeholder="Any immediate steps taken..."
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>

            {/* Priority */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Priority *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['High', 'Medium', 'Low'].map(p => (
                  <label
                    key={p}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      border: `2px solid ${sailData.priority === p ? (p === 'High' ? '#dc2626' : p === 'Medium' ? '#f59e0b' : '#16a34a') : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: sailData.priority === p ? (p === 'High' ? '#fef2f2' : p === 'Medium' ? '#fffbeb' : '#f0fdf4') : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={sailData.priority === p}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '16px' }}>
                      {p === 'High' ? '🔴' : p === 'Medium' ? '🟡' : '🟢'}
                    </span>
                    <span style={{ fontWeight: '500', color: '#374151' }}>{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assigned To */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Assigned To *
              </label>
              <input
                type="text"
                name="assigned_to"
                value={sailData.assigned_to}
                onChange={handleChange}
                required
                placeholder="Name of person responsible for resolution"
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>

            {/* Target Completion Date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>
                Target Completion Date *
              </label>
              <input
                type="date"
                name="target_completion_date"
                value={sailData.target_completion_date}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Adding...' : '📝 Add to SAIL Log'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
