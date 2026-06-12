'use client';
// ============================================================================
// /demo — THE CLOSER.
// Staff-gated (AdminGate via layout.js). You start it, then hand the phone
// to the prospect. Their thumb files a hazard report against Demo Energy Co
// in under a minute, then one tap shows it live on the analytics dashboard.
// Reset wipes demo-session submissions (never the seeded history).
// ============================================================================
import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import MultiPhotoUpload from '@/components/MultiPhotoUpload';
import { safeSubmit } from '@/components/SafeSubmit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const DASHBOARD_URL = 'https://slp-safety-dashboard.vercel.app/view/demo-energy-showcase-2026';

const ENERGY = ['Gravity', 'Motion', 'Mechanical', 'Electrical', 'Pressure', 'Chemical', 'Temperature', 'Stored'];

const S = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '20px', fontFamily: 'system-ui,-apple-system,sans-serif' },
  card: { maxWidth: '560px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' },
  h1: { margin: '0 0 6px', fontSize: '26px', color: '#0f172a' },
  sub: { margin: '0 0 18px', color: '#475569', fontSize: '14px', lineHeight: 1.5 },
  label: { display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', margin: '14px 0 6px' },
  input: { width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box' },
  ta: { width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', minHeight: '90px', boxSizing: 'border-box' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: (on) => ({ padding: '10px 14px', borderRadius: '999px', border: '2px solid ' + (on ? '#f97316' : '#e2e8f0'), background: on ? '#fff7ed' : 'white', color: on ? '#c2410c' : '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }),
  big: { width: '100%', padding: '18px', fontSize: '18px', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '18px' },
  orange: { background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white' },
  green: { background: 'linear-gradient(135deg,#059669,#047857)', color: 'white' },
  ghost: { background: '#f1f5f9', color: '#334155' },
  badge: { display: 'inline-block', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, marginBottom: '12px' },
};

export default function DemoPage() {
  const [step, setStep] = useState('intro'); // intro | form | done
  const [name, setName] = useState('');
  const [hazard, setHazard] = useState('');
  const [threat, setThreat] = useState('');
  const [energy, setEnergy] = useState([]);
  const [stky, setStky] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const photoRef = useRef(null);

  const toggleEnergy = (e) =>
    setEnergy((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  async function submit() {
    if (!name.trim()) { alert('Add your name — it shows up on the dashboard!'); return; }
    if (!hazard.trim()) { alert('Describe the hazard you spotted.'); return; }
    setBusy(true);
    try {
      const result = await safeSubmit({
        table: 'hazard_id_reports',
        data: {
          submitter_name: name.trim(),
          company: 'Demo Energy Co',
          location: 'Kuparuk Demo Pad',
          date: new Date().toLocaleDateString('en-CA'),
          identified_hazard: hazard.trim(),
          threat_level: threat || 'Medium',
          high_energy_present: energy.length > 0 ? 'Yes' : 'No',
          energy_types: energy,
          stky_event: stky || 'No',
          direct_control_status: '',
          corrective_action_taken: 'Reported via AnthroSafe live demo'
        },
        photoRef,
        formType: 'demo-hazard'
      });
      if (result.success) setStep('done');
      else alert(result.error || 'Submission failed — try again.');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetDemo() {
    if (!confirm('Reset the demo? This removes submissions made during demos (seeded history stays).')) return;
    setBusy(true); setResetMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/demo-reset', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (session?.access_token || '') }
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Reset failed');
      setResetMsg('✅ Demo reset — ' + (j.removed ?? 0) + ' demo submission(s) cleared.');
    } catch (e) {
      setResetMsg('❌ ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  // ───────────────────────── INTRO (staff sees this) ─────────────────────────
  if (step === 'intro') return (
    <div style={S.wrap}><div style={S.card}>
      <span style={S.badge}>SLP STAFF — DEMO CONTROL</span>
      <h1 style={S.h1}>AnthroSafe™ Live Demo</h1>
      <p style={S.sub}>
        <strong>The pitch:</strong> tap Start, hand your phone to the prospect, and say
        <em> “You just spotted a hazard on your site. Report it.”</em> They fill one
        60-second form — no login, no training — then one tap shows their report
        already counted on a live analytics dashboard. Their thumb closes the deal.
      </p>
      <button style={{ ...S.big, ...S.orange }} onClick={() => setStep('form')}>▶ Start Demo</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => window.open(DASHBOARD_URL, '_blank')}>📊 Open Demo Dashboard</button>
      <button style={{ ...S.big, ...S.ghost }} disabled={busy} onClick={resetDemo}>♻ Reset Demo</button>
      {resetMsg && <p style={{ ...S.sub, marginTop: '12px' }}>{resetMsg}</p>}
    </div></div>
  );

  // ───────────────────────── FORM (the prospect's 60 seconds) ─────────────────────────
  if (step === 'form') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>⚠ Report a Hazard</h1>
      <p style={S.sub}>Demo Energy Co · Kuparuk Demo Pad — see something, say something. No login needed.</p>

      <label style={S.label}>Your name</label>
      <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" />

      <label style={S.label}>What did you spot?</label>
      <textarea style={S.ta} value={hazard} onChange={(e) => setHazard(e.target.value)} placeholder="e.g., Hose across the access road with no ramp" />

      <label style={S.label}>How serious?</label>
      <div style={S.chips}>
        {['Low', 'Medium', 'High'].map((t) => (
          <span key={t} style={S.chip(threat === t)} onClick={() => setThreat(t)}>{t}</span>
        ))}
      </div>

      <label style={S.label}>Energy involved (tap any)</label>
      <div style={S.chips}>
        {ENERGY.map((e) => (
          <span key={e} style={S.chip(energy.includes(e))} onClick={() => toggleEnergy(e)}>{e}</span>
        ))}
      </div>

      <label style={S.label}>Could this have seriously hurt someone?</label>
      <div style={S.chips}>
        {['Yes', 'No'].map((o) => (
          <span key={o} style={S.chip(stky === o)} onClick={() => setStky(o)}>{o}</span>
        ))}
      </div>

      <label style={S.label}>Photo (optional)</label>
      <MultiPhotoUpload ref={photoRef} formType="demo-hazard" />

      <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
        {busy ? 'Submitting…' : '✅ Submit Hazard Report'}
      </button>
    </div></div>
  );

  // ───────────────────────── DONE → dashboard ─────────────────────────
  return (
    <div style={S.wrap}><div style={{ ...S.card, textAlign: 'center' }}>
      <div style={{ fontSize: '54px' }}>🎯</div>
      <h1 style={S.h1}>Report filed{name ? ', ' + name.split(' ')[0] : ''}!</h1>
      <p style={S.sub}>
        That took about a minute, with no app install, no account, and no training.
        Your report is already in the analytics — go see it count.
      </p>
      <button style={{ ...S.big, ...S.green }} onClick={() => window.open(DASHBOARD_URL, '_blank')}>
        📊 See it on the live dashboard
      </button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => { setName(''); setHazard(''); setThreat(''); setEnergy([]); setStky(''); setStep('intro'); }}>
        ↩ Back to demo control
      </button>
    </div></div>
  );
}
