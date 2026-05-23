'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const BRAND_RED = '#D71919';
const BRAND_DARK = '#A80A0A';

const CRIT_COLORS = {
  Critical: { bg: '#D71919', color: '#fff' },
  High:     { bg: '#F59E0B', color: '#fff' },
  Standard: { bg: '#FEF3C7', color: '#78350F' }
};
const STATUS_COLORS = {
  'open':         { bg: '#FEE2E2', color: '#991B1B', label: 'Open'         },
  'in-progress':  { bg: '#FEF3C7', color: '#92400E', label: 'In Progress'  },
  'closed':       { bg: '#D1FAE5', color: '#065F46', label: 'Closed'       },
  'verified':     { bg: '#A7F3D0', color: '#064E3B', label: 'Verified'     },
  'cancelled':    { bg: '#E5E7EB', color: '#374151', label: 'Cancelled'    }
};

export default function CampCorrectiveActionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Loading…</div>}>
      <CampCorrectiveActions />
    </Suspense>
  );
}

function CampCorrectiveActions() {
  const sp = useSearchParams();
  const lockedInspectionId = sp ? sp.get('inspection_id') : null;

  const [loading, setLoading] = useState(true);
  const [cas, setCas] = useState([]);
  const [filters, setFilters] = useState({
    company: '', camp: '', status: 'open-active', criticality: '', overdueOnly: false, owner: ''
  });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadData(); }, [lockedInspectionId]);

  async function loadData() {
    setLoading(true);
    try {
      let q = supabase.from('camp_corrective_actions').select('*').order('due_date', { ascending: true, nullsLast: true }).order('created_at', { ascending: false });
      if (lockedInspectionId) q = q.eq('inspection_id', lockedInspectionId);
      const { data, error } = await q;
      if (error) throw error;
      setCas(data || []);
    } catch (e) {
      alert('Failed to load corrective actions: ' + e.message);
    } finally { setLoading(false); }
  }

  const today = new Date().toISOString().split('T')[0];

  const companies = useMemo(() => [...new Set(cas.map(c => c.company).filter(Boolean))].sort(), [cas]);
  const camps     = useMemo(() => [...new Set(cas.map(c => c.camp_name).filter(Boolean))].sort(), [cas]);

  const filtered = useMemo(() => {
    let arr = cas;
    if (filters.company) arr = arr.filter(c => c.company === filters.company);
    if (filters.camp) arr = arr.filter(c => c.camp_name === filters.camp);
    if (filters.criticality) arr = arr.filter(c => c.criticality === filters.criticality);
    if (filters.owner) {
      const q = filters.owner.toLowerCase();
      arr = arr.filter(c => (c.owner_name || '').toLowerCase().includes(q) || (c.owner_email || '').toLowerCase().includes(q));
    }
    if (filters.status === 'open-active') arr = arr.filter(c => c.status === 'open' || c.status === 'in-progress');
    else if (filters.status !== 'all') arr = arr.filter(c => c.status === filters.status);
    if (filters.overdueOnly) {
      arr = arr.filter(c => c.due_date && c.due_date < today && (c.status === 'open' || c.status === 'in-progress'));
    }
    return arr;
  }, [cas, filters, today]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, open: 0, inProgress: 0, closed: 0, verified: 0, cancelled: 0, overdue: 0, critical: 0 };
    filtered.forEach(c => {
      if (c.status === 'open') s.open++;
      else if (c.status === 'in-progress') s.inProgress++;
      else if (c.status === 'closed') s.closed++;
      else if (c.status === 'verified') s.verified++;
      else if (c.status === 'cancelled') s.cancelled++;
      if (c.due_date && c.due_date < today && (c.status === 'open' || c.status === 'in-progress')) s.overdue++;
      if (c.criticality === 'Critical' && (c.status === 'open' || c.status === 'in-progress')) s.critical++;
    });
    return s;
  }, [filtered, today]);

  async function updateCA(id, patch) {
    const { error } = await supabase.from('camp_corrective_actions').update(patch).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return false; }
    setCas(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    return true;
  }

  function resetFilters() {
    setFilters({ company: '', camp: '', status: 'open-active', criticality: '', overdueOnly: false, owner: '' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#fff' }}>
          <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{ height: 60, marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Camp Corrective Actions</h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            {lockedInspectionId ? `Filtered to inspection ${lockedInspectionId.slice(0, 8)}…` : 'Track and close out findings from camp inspections'}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Link href="/" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to Portal</Link>
          {' · '}
          <Link href="/camp-inspection-dashboard" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Inspection Dashboard</Link>
          {lockedInspectionId && (
            <>
              {' · '}
              <Link href="/camp-corrective-actions" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Clear inspection filter</Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 14 }}>
          <Stat label="Total" value={stats.total} bg="#fff" color="#1e3a5f" />
          <Stat label="Open" value={stats.open} bg="#FEE2E2" color="#991B1B" />
          <Stat label="In Progress" value={stats.inProgress} bg="#FEF3C7" color="#92400E" />
          <Stat label="Closed" value={stats.closed} bg="#D1FAE5" color="#065F46" />
          <Stat label="Verified" value={stats.verified} bg="#A7F3D0" color="#064E3B" />
          <Stat label="Overdue" value={stats.overdue} bg={stats.overdue > 0 ? '#FEE2E2' : '#fff'} color={stats.overdue > 0 ? '#991B1B' : '#374151'} />
          <Stat label="Critical Open" value={stats.critical} bg={stats.critical > 0 ? '#FEE2E2' : '#fff'} color={stats.critical > 0 ? '#991B1B' : '#374151'} />
        </div>

        {/* Filter bar */}
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Filter label="Client">
              <select value={filters.company} onChange={e => setFilters({ ...filters, company: e.target.value })} style={selectStyle()}>
                <option value="">All clients</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Filter>
            <Filter label="Camp">
              <select value={filters.camp} onChange={e => setFilters({ ...filters, camp: e.target.value })} style={selectStyle()}>
                <option value="">All camps</option>
                {camps.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Filter>
            <Filter label="Status">
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={selectStyle()}>
                <option value="open-active">Open + In Progress</option>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
                <option value="verified">Verified</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Filter>
            <Filter label="Criticality">
              <select value={filters.criticality} onChange={e => setFilters({ ...filters, criticality: e.target.value })} style={selectStyle()}>
                <option value="">Any</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Standard">Standard</option>
              </select>
            </Filter>
            <Filter label="Owner">
              <input type="text" placeholder="Name or email…" value={filters.owner} onChange={e => setFilters({ ...filters, owner: e.target.value })} style={selectStyle()} />
            </Filter>
            <Filter label="Overdue Only">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, fontSize: 13 }}>
                <input type="checkbox" checked={filters.overdueOnly} onChange={e => setFilters({ ...filters, overdueOnly: e.target.checked })} />
                Show only overdue
              </label>
            </Filter>
            <Filter label=" ">
              <button type="button" onClick={resetFilters} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Reset</button>
            </Filter>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            Showing <strong>{filtered.length}</strong> of {cas.length}
          </div>
        </div>

        {/* CA list */}
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading corrective actions…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
            No corrective actions match those filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(ca => (
              <CACard key={ca.id} ca={ca} today={today}
                      isExpanded={expanded === ca.id}
                      onToggle={() => setExpanded(expanded === ca.id ? null : ca.id)}
                      updateCA={updateCA} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, padding: 12, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
          AnthroSafe™ Field Driven Safety  •  © 2026 SLP Alaska, LLC
        </div>
      </div>
    </div>
  );
}

function CACard({ ca, today, isExpanded, onToggle, updateCA }) {
  const overdue = ca.due_date && ca.due_date < today && (ca.status === 'open' || ca.status === 'in-progress');
  const crit = CRIT_COLORS[ca.criticality] || CRIT_COLORS.Standard;
  const stat = STATUS_COLORS[ca.status] || STATUS_COLORS.open;

  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${overdue ? BRAND_RED : (ca.criticality === 'Critical' ? BRAND_RED : '#10B981')}` }}>
      <div onClick={onToggle} style={{ padding: 12, cursor: 'pointer' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ background: '#111', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{ca.question_id}</span>
          <span style={{ ...badge(crit.bg, crit.color), fontSize: 10, textTransform: 'uppercase' }}>{ca.criticality}</span>
          <span style={{ ...badge(stat.bg, stat.color), fontSize: 11, fontWeight: 700 }}>{stat.label}</span>
          {overdue && <span style={{ ...badge('#FEE2E2', '#991B1B'), fontSize: 11, fontWeight: 700, border: '1px solid #EF4444' }}>OVERDUE</span>}
          <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 'auto' }}>{isExpanded ? '▲ collapse' : '▼ edit'}</span>
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
          <strong>{ca.company}</strong> · {ca.camp_name} · {ca.subsection}
        </div>
        <div style={{ fontSize: 14, color: '#111', marginBottom: 6 }}>{ca.finding}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#374151' }}>
          <div><strong>Owner:</strong> {ca.owner_name || '— unassigned'}</div>
          <div><strong>Due:</strong> {ca.due_date || '— not set'}</div>
          {ca.risk_rank && <div><strong>Risk:</strong> {ca.risk_rank}</div>}
        </div>
      </div>

      {isExpanded && <CAEditor ca={ca} updateCA={updateCA} onClose={onToggle} />}
    </div>
  );
}

function CAEditor({ ca, updateCA, onClose }) {
  const [form, setForm] = useState({
    owner_name: ca.owner_name || '',
    owner_email: ca.owner_email || '',
    owner_company: ca.owner_company || '',
    due_date: ca.due_date || '',
    status: ca.status,
    risk_rank: ca.risk_rank || '',
    closeout_evidence: ca.closeout_evidence || '',
    closeout_notes: ca.closeout_notes || '',
    closed_by_name: ca.closed_by_name || '',
    closed_by_email: ca.closed_by_email || ''
  });
  const [photos, setPhotos] = useState(ca.closeout_photo_urls || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleUploadPhotos(fileList) {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    try {
      const newPhotos = [...photos];
      for (const file of Array.from(fileList)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `camp-inspection-ca/${ca.id}/${Date.now()}-${safe}`;
        const { error: ue } = await supabase.storage.from('safety-photos').upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: file.type
        });
        if (ue) throw ue;
        const { data: pub } = supabase.storage.from('safety-photos').getPublicUrl(path);
        newPhotos.push(pub.publicUrl);
      }
      setPhotos(newPhotos);
    } catch (e) {
      alert('Photo upload failed: ' + e.message);
    } finally { setUploading(false); }
  }

  function removePhoto(u) { setPhotos(p => p.filter(x => x !== u)); }

  async function handleSave() {
    setSaving(true);
    try {
      const patch = {
        owner_name: form.owner_name || null,
        owner_email: form.owner_email || null,
        owner_company: form.owner_company || null,
        due_date: form.due_date || null,
        status: form.status,
        risk_rank: form.risk_rank || null,
        closeout_evidence: form.closeout_evidence || null,
        closeout_notes: form.closeout_notes || null,
        closeout_photo_urls: photos.length ? photos : null,
        closed_by_name: form.closed_by_name || null,
        closed_by_email: form.closed_by_email || null
      };
      // Auto-stamp closed_at when transitioning to closed/verified
      if ((form.status === 'closed' || form.status === 'verified') && !ca.closed_at) {
        patch.closed_at = new Date().toISOString();
      }
      const ok = await updateCA(ca.id, patch);
      if (ok) onClose();
    } finally { setSaving(false); }
  }

  return (
    <div style={{ borderTop: '1px solid #E5E7EB', padding: 12, background: '#FAFAFA' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
        <Field label="Owner Name">
          <input style={inputStyle()} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="e.g. Mary Smith" />
        </Field>
        <Field label="Owner Email">
          <input type="email" style={inputStyle()} value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="owner@company.com" />
        </Field>
        <Field label="Owner Company">
          <input style={inputStyle()} value={form.owner_company} onChange={e => set('owner_company', e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Due Date">
          <input type="date" style={inputStyle()} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </Field>
        <Field label="Risk Rank">
          <select style={inputStyle()} value={form.risk_rank} onChange={e => set('risk_rank', e.target.value)}>
            <option value="">—</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={inputStyle()} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="closed">Closed</option>
            <option value="verified">Verified</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </div>

      <Field label="Closeout Evidence">
        <textarea rows={2} style={{ ...inputStyle(), resize: 'vertical' }} value={form.closeout_evidence} onChange={e => set('closeout_evidence', e.target.value)}
          placeholder="e.g. Replaced extinguisher; new tag attached 5/24/26" />
      </Field>

      <Field label="Closeout Notes">
        <textarea rows={2} style={{ ...inputStyle(), resize: 'vertical' }} value={form.closeout_notes} onChange={e => set('closeout_notes', e.target.value)}
          placeholder="Additional context for review" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
        <Field label="Closed By (Name)">
          <input style={inputStyle()} value={form.closed_by_name} onChange={e => set('closed_by_name', e.target.value)} placeholder="Person verifying closure" />
        </Field>
        <Field label="Closed By (Email)">
          <input type="email" style={inputStyle()} value={form.closed_by_email} onChange={e => set('closed_by_email', e.target.value)} />
        </Field>
      </div>

      {/* Closeout photos */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>Closeout Photos</div>
        <label style={{ display: 'inline-block', padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          📷 Add Photos
          <input type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { handleUploadPhotos(e.target.files); e.target.value = ''; }} />
        </label>
        {uploading && <span style={{ marginLeft: 8, fontSize: 12, color: '#6B7280' }}>Uploading…</span>}
        {photos.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {photos.map((u, i) => (
              <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 4, overflow: 'hidden', border: '1px solid #D1D5DB' }}>
                <img src={u} alt={`closeout ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removePhoto(u)}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {ca.closed_at && (
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
          First closed at: <strong>{new Date(ca.closed_at).toLocaleString()}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: BRAND_RED, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: 10, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#374151', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}
function Filter({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}
function selectStyle() {
  return { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 4, border: '1px solid #D1D5DB', boxSizing: 'border-box', background: '#fff' };
}
function inputStyle() {
  return { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 4, border: '1px solid #D1D5DB', boxSizing: 'border-box', background: '#fff' };
}
function badge(bg, color) {
  return { background: bg, color, padding: '2px 8px', borderRadius: 10, fontWeight: 600, display: 'inline-block' };
}
