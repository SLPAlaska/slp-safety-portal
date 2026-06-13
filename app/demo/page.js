'use client';
// ============================================================================
// /demo — THE CLOSER v3.
// Staff-gated demo hub. Seven experiences, all real pipelines, all hard-wired
// to Demo Energy Co: Hazard ID, BBS, Good Catch, Stop/Take 5, Sling
// Inspection, the DROPS Hunt (live physics calculator), and a Safety
// Training taste of the LMS. Reset wipes demo-session rows only.
// ============================================================================
import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import MultiPhotoUpload from '@/components/MultiPhotoUpload';
import { safeSubmit, safeInsert } from '@/components/SafeSubmit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const DASHBOARD_URL = 'https://slp-safety-dashboard.vercel.app/view/demo-energy-showcase-2026';
const CO = 'Demo Energy Co';
const LOC = 'Kuparuk Demo Pad';
const today = () => new Date().toLocaleDateString('en-CA');

const ENERGY = ['Gravity', 'Motion', 'Mechanical', 'Electrical', 'Pressure', 'Chemical', 'Temperature', 'Stored'];
const BBS_CATS = ['Line of Fire', 'Body Positioning', 'PPE', 'Housekeeping', 'Tool Use', 'Communication'];

// ── DROPS physics (mirrors the real calculator) ──
const GRAVITY = 9.81, LBS_TO_KG = 0.453592, FT_TO_M = 0.3048, J_TO_FTLBS = 0.737562, STOP_D = 0.01;
const CONSEQ = [
  { level: 1, label: 'Negligible', color: '#22c55e', maxE: 20,  desc: 'Minor bruise or no injury expected' },
  { level: 2, label: 'Minor',      color: '#84cc16', maxE: 80,  desc: 'First aid level injury likely' },
  { level: 3, label: 'Moderate',   color: '#eab308', maxE: 200, desc: 'Medical treatment injury possible' },
  { level: 4, label: 'Major',      color: '#f97316', maxE: 500, desc: 'Serious injury or permanent disability possible' },
  { level: 5, label: 'Critical',   color: '#ef4444', maxE: Infinity, desc: 'FATALITY or life-altering injury possible' },
];
const LIKELY = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const RISK_LABELS = [
  ['Low','Low','Low-Med','Medium','Medium'],
  ['Low','Low-Med','Medium','Medium','High'],
  ['Low-Med','Medium','Medium','High','Critical'],
  ['Medium','Medium','High','Critical','Critical'],
  ['Medium','High','Critical','Critical','Critical'],
];
const RISK_COLORS = [
  ['#22c55e','#22c55e','#84cc16','#eab308','#eab308'],
  ['#22c55e','#84cc16','#eab308','#eab308','#f97316'],
  ['#84cc16','#eab308','#eab308','#f97316','#ef4444'],
  ['#eab308','#eab308','#f97316','#ef4444','#ef4444'],
  ['#eab308','#f97316','#ef4444','#ef4444','#7f1d1d'],
];

// ── Micro-LMS: one lesson + quiz ──
const LESSON = {
  title: 'Line of Fire — 90-Second Refresher',
  slides: [
    { h: 'What is the Line of Fire?', t: 'The path an object, pressure, or energy will travel if something releases. If your body is in that path, you are IN the line of fire — and time is the only thing protecting you.' },
    { h: 'The Three Releases', t: '1) Dropped or falling objects.  2) Stored energy letting go — pressure, tension, springs.  3) Machinery and vehicles in motion. Before every task ask: if it lets go, where does it go — and am I standing there?' },
  ],
  quiz: [
    { q: 'A suspended load swings overhead while you walk under it. Are you in the line of fire?', a: ['Yes — gravity owns that path', 'No — it is rigged properly'], correct: 0 },
    { q: 'Best FIRST move when you spot a coworker in the line of fire?', a: ['Finish your task, mention it later', 'Stop the job and reposition them'], correct: 1 },
    { q: 'A pressurized hose is being disconnected. Where do you stand?', a: ['In line with the fitting to watch it', 'To the side, out of the discharge path'], correct: 1 },
  ],
};

const S = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '20px', fontFamily: 'system-ui,-apple-system,sans-serif' },
  card: { maxWidth: '560px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' },
  h1: { margin: '0 0 6px', fontSize: '24px', color: '#0f172a' },
  sub: { margin: '0 0 16px', color: '#475569', fontSize: '14px', lineHeight: 1.5 },
  label: { display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', margin: '14px 0 6px' },
  input: { width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box' },
  ta: { width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', minHeight: '80px', boxSizing: 'border-box' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: (on) => ({ padding: '10px 14px', borderRadius: '999px', border: '2px solid ' + (on ? '#f97316' : '#e2e8f0'), background: on ? '#fff7ed' : 'white', color: on ? '#c2410c' : '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }),
  big: { width: '100%', padding: '17px', fontSize: '17px', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '16px' },
  orange: { background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white' },
  green: { background: 'linear-gradient(135deg,#059669,#047857)', color: 'white' },
  ghost: { background: '#f1f5f9', color: '#334155' },
  menuBtn: (grad) => ({ width: '100%', textAlign: 'left', padding: '15px 16px', marginTop: '10px', border: 'none', borderRadius: '12px', cursor: 'pointer', background: grad, color: 'white' }),
  menuTitle: { fontSize: '16.5px', fontWeight: 700, margin: 0 },
  menuSub: { fontSize: '12.5px', opacity: 0.9, margin: '3px 0 0' },
  stat: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' },
  statN: { fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 },
  statL: { fontSize: '11px', color: '#64748b', margin: '2px 0 0' },
};

function Chips({ options, value, onChange, multi }) {
  const isOn = (o) => (multi ? value.includes(o) : value === o);
  const click = (o) => multi
    ? onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
    : onChange(o);
  return <div style={S.chips}>{options.map((o) => <span key={o} style={S.chip(isOn(o))} onClick={() => click(o)}>{o}</span>)}</div>;
}

export default function DemoPage() {
  const [step, setStep] = useState('intro');
  const [doneLabel, setDoneLabel] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [f, setF] = useState({});
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const photoRef = useRef(null);
  // DROPS + LMS local state
  const [drops, setDrops] = useState(null);
  const [slide, setSlide] = useState(0);
  const [answers, setAnswers] = useState([]);

  const openForm = (which) => { setF({}); setDrops(null); setSlide(0); setAnswers([]); setStep(which); };

  async function submitForm(table, data, formType, label) {
    if (!name.trim()) { alert('Add your name first — it shows on the dashboard!'); return; }
    setBusy(true);
    try {
      const result = await safeSubmit({ table, data, photoRef, formType });
      if (result.success) { setDoneLabel(label); setStep('done'); }
      else alert(result.error || 'Submission failed — try again.');
    } catch (e) { alert('Error: ' + e.message); }
    finally { setBusy(false); }
  }

  async function resetDemo() {
    if (!confirm('Reset the demo? Removes all demo-session submissions (seeded history stays).')) return;
    setBusy(true); setResetMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/demo-reset', { method: 'POST', headers: { Authorization: 'Bearer ' + (session?.access_token || '') } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Reset failed');
      setResetMsg('✅ Demo reset — ' + (j.removed ?? 0) + ' demo submission(s) cleared.');
    } catch (e) { setResetMsg('❌ ' + e.message); }
    finally { setBusy(false); }
  }

  async function logTraining(score) {
    // Writes a REAL LMS completion for the demo learner so the dashboard's
    // Training panel moves. Fire-and-forget; certificate shows regardless.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/demo-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
        body: JSON.stringify({ name: name.trim() || 'Demo Learner', score })
      });
    } catch (e) { console.error('demo-training:', e); }
  }

  function calcDrops() {
    const w = parseFloat(f.weight), h = parseFloat(f.height), lk = parseInt(f.likelihood || '0');
    if (!w || !h) { alert('Enter object weight and drop height.'); return; }
    if (!lk) { alert('Pick how likely it is to drop.'); return; }
    const mass = w * LBS_TO_KG, hm = h * FT_TO_M;
    const eJ = mass * GRAVITY * hm;
    const conseq = CONSEQ.find((c) => eJ <= c.maxE) || CONSEQ[4];
    const v_fps = Math.sqrt(2 * GRAVITY * hm) * 3.28084;
    const force_lbs = (eJ / STOP_D) * 0.224809;
    const excl_ft = (Math.sqrt(2 * hm) * 1.5) / FT_TO_M;
    setDrops({
      eJ, eFt: eJ * J_TO_FTLBS, conseq, v_fps, force_lbs, excl_ft,
      riskLabel: RISK_LABELS[lk - 1][conseq.level - 1],
      riskColor: RISK_COLORS[lk - 1][conseq.level - 1],
      lk,
    });
  }

  // ─────────── INTRO: logo, no pitch ───────────
  if (step === 'intro') return (
    <div style={S.wrap}><div style={{ ...S.card, textAlign: 'center' }}>
      <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{ maxWidth: '260px', width: '80%', margin: '18px auto 6px', display: 'block' }} />
      <p style={{ ...S.sub, marginTop: 0, fontSize: '13px', letterSpacing: '1px', color: '#64748b' }}>FIELD DRIVEN SAFETY — LIVE DEMO</p>
      <button style={{ ...S.big, ...S.orange }} onClick={() => setStep('menu')}>▶ Start Demo</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => window.open(DASHBOARD_URL, '_blank')}>📊 Demo Dashboard</button>
      <button style={{ ...S.big, ...S.ghost }} disabled={busy} onClick={resetDemo}>♻ Reset Demo</button>
      {resetMsg && <p style={{ ...S.sub, marginTop: '12px' }}>{resetMsg}</p>}
    </div></div>
  );

  // ─────────── MENU: 7 experiences ───────────
  if (step === 'menu') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>Try it yourself.</h1>
      <p style={S.sub}>Demo Energy Co · Kuparuk Demo Pad — pick anything. Everything you file lands on the live dashboard.</p>

      <label style={S.label}>Your name (shows on the dashboard)</label>
      <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" />

      <button style={S.menuBtn('linear-gradient(135deg,#f97316,#c2410c)')} onClick={() => openForm('hazard')}>
        <p style={S.menuTitle}>⚠ Hazard ID</p>
        <p style={S.menuSub}>Spot it, snap it, report it — 60 seconds</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#dc2626,#7f1d1d)')} onClick={() => openForm('drops')}>
        <p style={S.menuTitle}>🧮 DROPS Hunt — Dropped Object Calculator</p>
        <p style={S.menuSub}>Weight + height = live physics: energy, impact force, exclusion zone</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#0ea5e9,#0369a1)')} onClick={() => openForm('bbs')}>
        <p style={S.menuTitle}>👀 BBS Observation</p>
        <p style={S.menuSub}>Safe or at-risk behavior → drives the culture index</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#10b981,#047857)')} onClick={() => openForm('gc')}>
        <p style={S.menuTitle}>🎯 Good Catch / Near Miss</p>
        <p style={S.menuSub}>Almost happened → feeds SIF-potential analytics</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#8b5cf6,#6d28d9)')} onClick={() => openForm('st5')}>
        <p style={S.menuTitle}>✋ Stop / Take 5</p>
        <p style={S.menuSub}>Pre-task pause → leading-indicator gold</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#f59e0b,#b45309)')} onClick={() => openForm('sling')}>
        <p style={S.menuTitle}>🪢 Sling Inspection</p>
        <p style={S.menuSub}>12-point nylon sling check, tap-through in under a minute</p>
      </button>
      <button style={S.menuBtn('linear-gradient(135deg,#06b6d4,#0e7490)')} onClick={() => openForm('lms')}>
        <p style={S.menuTitle}>🎓 Safety Training (LMS)</p>
        <p style={S.menuSub}>90-second micro-lesson, quiz, instant certificate</p>
      </button>

      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('intro')}>↩ Back</button>
    </div></div>
  );

  // ─────────── HAZARD ───────────
  if (step === 'hazard') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>⚠ Report a Hazard</h1>
      <label style={S.label}>What did you spot?</label>
      <textarea style={S.ta} value={f.hazard || ''} onChange={(e) => set('hazard', e.target.value)} placeholder="e.g., Hose across the access road with no ramp" />
      <label style={S.label}>How serious?</label>
      <Chips options={['Low', 'Medium', 'High']} value={f.threat || ''} onChange={(v) => set('threat', v)} />
      <label style={S.label}>Energy involved (tap any)</label>
      <Chips options={ENERGY} value={f.energy || []} onChange={(v) => set('energy', v)} multi />
      <label style={S.label}>Could this have seriously hurt someone?</label>
      <Chips options={['Yes', 'No']} value={f.stky || ''} onChange={(v) => set('stky', v)} />
      <label style={S.label}>Photo (optional)</label>
      <MultiPhotoUpload ref={photoRef} formType="demo-hazard" />
      <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy}
        onClick={() => {
          if (!(f.hazard || '').trim()) { alert('Describe the hazard you spotted.'); return; }
          submitForm('hazard_id_reports', {
            submitter_name: name.trim(), company: CO, location: LOC, date: today(),
            identified_hazard: f.hazard.trim(), threat_level: f.threat || 'Medium',
            high_energy_present: (f.energy || []).length > 0 ? 'Yes' : 'No',
            energy_types: f.energy || [], stky_event: f.stky || 'No',
            direct_control_status: '', corrective_action_taken: 'Reported via AnthroSafe live demo'
          }, 'demo-hazard', 'Hazard report');
        }}>{busy ? 'Submitting…' : '✅ Submit Hazard Report'}</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
    </div></div>
  );

  // ─────────── DROPS HUNT ───────────
  if (step === 'drops') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>🧮 DROPS Hunt</h1>
      <p style={S.sub}>Found something that could fall? Feed it to the calculator.</p>
      <label style={S.label}>What's the object?</label>
      <input style={S.input} value={f.obj || ''} onChange={(e) => set('obj', e.target.value)} placeholder="e.g., 24-inch pipe wrench on scaffold" />
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Weight (lbs)</label>
          <input style={S.input} type="number" inputMode="decimal" value={f.weight || ''} onChange={(e) => set('weight', e.target.value)} placeholder="6" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Height (ft)</label>
          <input style={S.input} type="number" inputMode="decimal" value={f.height || ''} onChange={(e) => set('height', e.target.value)} placeholder="40" />
        </div>
      </div>
      <label style={S.label}>How likely is it to drop?</label>
      <Chips options={['1','2','3','4','5']} value={f.likelihood || ''} onChange={(v) => set('likelihood', v)} />
      <p style={{ ...S.sub, fontSize: '12px', margin: '6px 0 0' }}>{f.likelihood ? LIKELY[parseInt(f.likelihood) - 1] : '1 = secured & inspected … 5 = unsecured, work overhead'}</p>

      <button style={{ ...S.big, ...S.orange }} onClick={calcDrops}>⚡ Calculate</button>

      {drops && <>
        <div style={{ marginTop: '16px', borderRadius: '14px', padding: '18px', textAlign: 'center', background: drops.conseq.color, color: 'white' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>CONSEQUENCE LEVEL {drops.conseq.level}</p>
          <p style={{ margin: '4px 0', fontSize: '28px', fontWeight: 800 }}>{drops.conseq.label.toUpperCase()}</p>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.95 }}>{drops.conseq.desc}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
          <div style={S.stat}><p style={S.statN}>{drops.eFt.toFixed(0)}</p><p style={S.statL}>FT-LBS OF ENERGY</p></div>
          <div style={S.stat}><p style={S.statN}>{drops.v_fps.toFixed(0)} fps</p><p style={S.statL}>IMPACT VELOCITY</p></div>
          <div style={S.stat}><p style={S.statN}>{drops.force_lbs.toFixed(0)} lbs</p><p style={S.statL}>EST. IMPACT FORCE</p></div>
          <div style={S.stat}><p style={S.statN}>{drops.excl_ft.toFixed(0)} ft</p><p style={S.statL}>EXCLUSION ZONE RADIUS</p></div>
        </div>
        <div style={{ marginTop: '10px', borderRadius: '10px', padding: '12px', textAlign: 'center', background: drops.riskColor, color: 'white', fontWeight: 800 }}>
          RISK RATING: {drops.riskLabel.toUpperCase()}
        </div>
        <button style={{ ...S.big, ...S.green, opacity: busy ? 0.6 : 1 }} disabled={busy}
          onClick={async () => {
            if (!name.trim()) { alert('Add your name on the menu first!'); return; }
            setBusy(true);
            try {
              const { error } = await safeInsert('drops_calculations', [{
                assessor_name: name.trim(), date: today(), company: CO, location: LOC,
                work_area: 'Demo', task_description: 'DROPS hunt (live demo)',
                object_name: (f.obj || 'Unnamed object').trim(),
                weight_lbs: parseFloat(f.weight), height_ft: parseFloat(f.height),
                energy_joules: parseFloat(drops.eJ.toFixed(1)), energy_ftlbs: parseFloat(drops.eFt.toFixed(1)),
                impact_velocity_fps: parseFloat(drops.v_fps.toFixed(1)), impact_force_lbs: parseFloat(drops.force_lbs.toFixed(0)),
                consequence_level: drops.conseq.level, consequence_label: drops.conseq.label,
                likelihood_level: drops.lk, likelihood_label: LIKELY[drops.lk - 1],
                risk_rating: drops.riskLabel, exclusion_zone_ft: parseFloat(drops.excl_ft.toFixed(1)),
                controls: 'Identified during live demo', notes: ''
              }], 'demo-drops');
              if (error) throw error;
              setDoneLabel('DROPS assessment'); setStep('done');
            } catch (e) { alert('Error: ' + e.message); }
            finally { setBusy(false); }
          }}>{busy ? 'Logging…' : '📌 Log This Drop Hazard'}</button>
      </>}
      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
    </div></div>
  );

  // ─────────── BBS ───────────
  if (step === 'bbs') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>👀 BBS Observation</h1>
      <label style={S.label}>What kind of behavior did you observe?</label>
      <Chips options={['Safe', 'At-Risk']} value={f.otype || ''} onChange={(v) => set('otype', v)} />
      <label style={S.label}>Category</label>
      <Chips options={BBS_CATS} value={f.cat || ''} onChange={(v) => set('cat', v)} />
      <label style={S.label}>What did you see?</label>
      <textarea style={S.ta} value={f.saw || ''} onChange={(e) => set('saw', e.target.value)} placeholder="e.g., Crew used spotter and barricades for the lift" />
      {f.otype === 'At-Risk' && <>
        <label style={S.label}>Serious-injury potential?</label>
        <Chips options={['Yes', 'No']} value={f.stky || ''} onChange={(v) => set('stky', v)} />
        <label style={S.label}>Was the job stopped?</label>
        <Chips options={['Yes', 'No']} value={f.stop || ''} onChange={(v) => set('stop', v)} />
      </>}
      <label style={S.label}>Photo (optional)</label>
      <MultiPhotoUpload ref={photoRef} formType="demo-bbs" />
      <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy}
        onClick={() => {
          if (!f.otype) { alert('Pick Safe or At-Risk.'); return; }
          if (!(f.saw || '').trim()) { alert('Describe what you observed.'); return; }
          submitForm('bbs_observations', {
            client_company: CO, location: LOC, submitter_name: name.trim(),
            observation_date: today(), observation_type: f.otype,
            observation_category: f.cat || 'General',
            stky_event: f.stky === 'Yes', job_stop_required: f.stop === 'Yes',
            what_did_you_see: f.saw.trim(), action_taken: 'Coached on the spot (demo)'
          }, 'demo-bbs', 'BBS observation');
        }}>{busy ? 'Submitting…' : '✅ Submit Observation'}</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
    </div></div>
  );

  // ─────────── GOOD CATCH ───────────
  if (step === 'gc') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>🎯 Good Catch / Near Miss</h1>
      <label style={S.label}>Which was it?</label>
      <Chips options={['Good Catch', 'Near Miss']} value={f.rtype || ''} onChange={(v) => set('rtype', v)} />
      <label style={S.label}>What happened?</label>
      <textarea style={S.ta} value={f.desc || ''} onChange={(e) => set('desc', e.target.value)} placeholder="e.g., Caught an unrated sling before the lift started" />
      <label style={S.label}>Energy involved</label>
      <Chips options={ENERGY} value={f.energy || ''} onChange={(v) => set('energy', v)} />
      <label style={S.label}>Could it have seriously hurt someone?</label>
      <Chips options={['Yes', 'No']} value={f.stky || ''} onChange={(v) => set('stky', v)} />
      <label style={S.label}>Was a direct control in place?</label>
      <Chips options={['Yes', 'No-Alternative', 'No-Failed', 'No-None']} value={f.dc || ''} onChange={(v) => set('dc', v)} />
      <label style={S.label}>Photo (optional)</label>
      <MultiPhotoUpload ref={photoRef} formType="demo-gc" />
      <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy}
        onClick={() => {
          if (!(f.desc || '').trim()) { alert('Describe what happened.'); return; }
          submitForm('good_catch_near_miss', {
            company: CO, location: LOC, reporter_name: name.trim(), date: today(),
            report_type: f.rtype || 'Good Catch', description: f.desc.trim(),
            high_energy_present: f.energy ? 'Yes' : 'No', energy_types: f.energy || '',
            stky_event: f.stky || 'No', direct_control_present: f.dc || 'Yes',
            immediate_actions: 'Corrected on the spot (demo)'
          }, 'demo-gc', 'Good catch');
        }}>{busy ? 'Submitting…' : '✅ Submit Report'}</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
    </div></div>
  );

  // ─────────── STOP / TAKE 5 ───────────
  if (step === 'st5') return (
    <div style={S.wrap}><div style={S.card}>
      <h1 style={S.h1}>✋ Stop / Take 5</h1>
      <label style={S.label}>What task are you about to do?</label>
      <textarea style={S.ta} value={f.task || ''} onChange={(e) => set('task', e.target.value)} placeholder="e.g., Swap the pressure gauge on wellhead A-14" />
      <label style={S.label}>Biggest hazard you identified</label>
      <textarea style={S.ta} value={f.haz || ''} onChange={(e) => set('haz', e.target.value)} placeholder="e.g., Trapped pressure in the line" />
      <label style={S.label}>Main energy source</label>
      <Chips options={ENERGY} value={f.energy || ''} onChange={(v) => set('energy', v)} />
      <label style={S.label}>Risk level after controls</label>
      <Chips options={['Low', 'Medium', 'High']} value={f.risk || ''} onChange={(v) => set('risk', v)} />
      <label style={S.label}>Safe to proceed?</label>
      <Chips options={['Yes', 'No']} value={f.go || ''} onChange={(v) => set('go', v)} />
      <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy}
        onClick={() => {
          if (!(f.task || '').trim()) { alert('Describe the task.'); return; }
          submitForm('stop_take_5', {
            company: CO, location: LOC, name: name.trim(), date: today(),
            task_description: f.task.trim(), describe_hazards: (f.haz || '').trim(),
            energy_types: f.energy || '', risk_level: f.risk || 'Low',
            safe_to_proceed: f.go || 'Yes'
          }, 'demo-st5', 'Stop/Take 5');
        }}>{busy ? 'Submitting…' : '✅ Submit Take 5'}</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
    </div></div>
  );

  // ─────────── SLING INSPECTION ───────────
  if (step === 'sling') {
    const CHECKS = [
      ['cuts_tears', 'Cuts or tears'],
      ['abrasion_damage', 'Abrasion damage'],
      ['heat_damage', 'Heat / chemical damage'],
      ['broken_stitching', 'Broken stitching'],
      ['uv_degradation', 'UV degradation'],
      ['missing_tag', 'Capacity tag missing'],
    ];
    const allAnswered = CHECKS.every(([k]) => f[k]);
    const anyFail = CHECKS.some(([k]) => f[k] === 'Fail');
    return (
      <div style={S.wrap}><div style={S.card}>
        <h1 style={S.h1}>🪢 Synthetic Sling Inspection</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Sling ID</label>
            <input style={S.input} value={f.sid || ''} onChange={(e) => set('sid', e.target.value)} placeholder="SL-0042" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Capacity (WLL)</label>
            <input style={S.input} value={f.wll || ''} onChange={(e) => set('wll', e.target.value)} placeholder="2 ton" />
          </div>
        </div>
        {CHECKS.map(([k, label]) => (
          <div key={k}>
            <label style={S.label}>{label}</label>
            <Chips options={['Pass', 'Fail']} value={f[k] || ''} onChange={(v) => set(k, v)} />
          </div>
        ))}
        {allAnswered && (
          <div style={{ marginTop: '14px', borderRadius: '10px', padding: '12px', textAlign: 'center', fontWeight: 800, color: 'white', background: anyFail ? '#ef4444' : '#059669' }}>
            {anyFail ? '⛔ REMOVE FROM SERVICE' : '✅ SLING PASSES — RETURN TO SERVICE'}
          </div>
        )}
        <label style={S.label}>Photo (optional)</label>
        <MultiPhotoUpload ref={photoRef} formType="demo-sling" />
        <button style={{ ...S.big, ...S.orange, opacity: busy ? 0.6 : 1 }} disabled={busy}
          onClick={() => {
            if (!(f.sid || '').trim()) { alert('Give the sling an ID.'); return; }
            if (!allAnswered) { alert('Answer every check.'); return; }
            const data = {
              inspector_name: name.trim(), date: today(), company: CO, location: LOC,
              sling_id: f.sid.trim(), sling_type: 'Web Sling', capacity_wll: f.wll || '',
              overall_condition: anyFail ? 'Poor' : 'Good',
              inspection_result: anyFail ? 'Fail - Remove from Service' : 'Pass',
              action_taken: anyFail ? 'Removed from service (demo)' : 'Returned to service (demo)',
              comments: 'Live demo inspection'
            };
            CHECKS.forEach(([k]) => { data[k] = f[k]; });
            submitForm('synthetic_sling_inspections', data, 'demo-sling', 'Sling inspection');
          }}>{busy ? 'Submitting…' : '✅ Submit Inspection'}</button>
        <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
      </div></div>
    );
  }

  // ─────────── LMS MICRO-TRAINING ───────────
  if (step === 'lms') {
    const inQuiz = slide >= LESSON.slides.length;
    const qIdx = answers.length;
    const finished = inQuiz && qIdx >= LESSON.quiz.length;
    const score = answers.filter((a, i) => a === LESSON.quiz[i].correct).length;
    if (finished) return (
      <div style={S.wrap}><div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ fontSize: '50px' }}>🎓</div>
        <h1 style={S.h1}>Certificate of Completion</h1>
        <div style={{ border: '3px double #b45309', borderRadius: '12px', padding: '18px', margin: '12px 0', background: '#fffbeb' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e', letterSpacing: '1px' }}>ANTHROSAFE™ TRAINING</p>
          <p style={{ margin: '8px 0 2px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{name || 'Demo Learner'}</p>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{LESSON.title}</p>
          <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: 700, color: score === 3 ? '#059669' : '#b45309' }}>Score: {score}/3 {score === 3 ? '— PERFECT' : ''}</p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>{today()} · Auto-tracked to the company training matrix</p>
        </div>
        <p style={S.sub}>In the full LMS: courses, slides, quizzes, certificates, expiry tracking, and a live compliance matrix per company — all of it automatic.</p>
        <button style={{ ...S.big, ...S.green }} onClick={() => window.open(DASHBOARD_URL, '_blank')}>📊 See the live dashboard</button>
        <button style={{ ...S.big, ...S.ghost }} onClick={() => { setSlide(0); setAnswers([]); setStep('menu'); }}>↩ Back to demos</button>
      </div></div>
    );
    if (inQuiz) {
      const q = LESSON.quiz[qIdx];
      return (
        <div style={S.wrap}><div style={S.card}>
          <p style={{ ...S.sub, margin: 0, fontWeight: 700, color: '#0e7490' }}>QUIZ — {qIdx + 1} of {LESSON.quiz.length}</p>
          <h1 style={{ ...S.h1, fontSize: '20px' }}>{q.q}</h1>
          {q.a.map((opt, i) => (
            <button key={i} style={{ ...S.big, ...S.ghost, textAlign: 'left' }} onClick={() => {
              const next = [...answers, i];
              setAnswers(next);
              if (next.length === LESSON.quiz.length) {
                const sc = next.filter((a, idx) => a === LESSON.quiz[idx].correct).length;
                logTraining(sc);
              }
            }}>{opt}</button>
          ))}
        </div></div>
      );
    }
    const s = LESSON.slides[slide];
    return (
      <div style={S.wrap}><div style={S.card}>
        <p style={{ ...S.sub, margin: 0, fontWeight: 700, color: '#0e7490' }}>{LESSON.title} — slide {slide + 1} of {LESSON.slides.length}</p>
        <h1 style={{ ...S.h1, marginTop: '8px' }}>{s.h}</h1>
        <p style={{ ...S.sub, fontSize: '16px' }}>{s.t}</p>
        <button style={{ ...S.big, ...S.orange }} onClick={() => setSlide(slide + 1)}>{slide + 1 < LESSON.slides.length ? 'Next →' : 'Take the Quiz →'}</button>
        <button style={{ ...S.big, ...S.ghost }} onClick={() => setStep('menu')}>↩ Back</button>
      </div></div>
    );
  }

  // ─────────── DONE ───────────
  return (
    <div style={S.wrap}><div style={{ ...S.card, textAlign: 'center' }}>
      <div style={{ fontSize: '54px' }}>🎯</div>
      <h1 style={S.h1}>{doneLabel} filed{name ? ', ' + name.split(' ')[0] : ''}!</h1>
      <p style={S.sub}>About a minute — no app, no account, no training. It's already in the analytics.</p>
      <button style={{ ...S.big, ...S.green }} onClick={() => window.open(DASHBOARD_URL, '_blank')}>📊 See it on the live dashboard</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => { setF({}); setDrops(null); setStep('menu'); }}>➕ Try another</button>
      <button style={{ ...S.big, ...S.ghost }} onClick={() => { setF({}); setDrops(null); setStep('intro'); }}>↩ Demo control</button>
    </div></div>
  );
}
