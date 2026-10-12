'use client';
// THA close-out sign-in (Phase 1 company lock, 11 Oct 2026).
//
// Viewing and filling a THA stays login-free. CLOSING one needs a sign-in so
// the server knows whose company it is (from the LMS account, never picked on
// the page). Same magic-link sign-in and the same lock-free singleton client
// as AdminGate / authFetch, so the session persists on the phone until the
// person taps Sign out. The server (/api/closeout) is the authority; this only
// shows who you are and gets you signed in.
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

function authClient() {
  if (typeof globalThis !== 'undefined' && globalThis.__slpAuthClient) return globalThis.__slpAuthClient;
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4',
    { auth: { lock: async (_name, _timeout, fn) => await fn() } }
  );
  if (typeof globalThis !== 'undefined') globalThis.__slpAuthClient = c;
  return c;
}

const ROLE_LABEL = { company_admin: 'Company admin', learner: 'Crew' };

export default function ThaCloseSignIn({ onIdentity, thaNumber }) {
  const [state, setState] = useState('loading'); // loading | signedout | ready | error
  const [who, setWho] = useState(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (session) => {
    const token = session?.access_token;
    if (!token) { setWho(null); setState('signedout'); onIdentity && onIdentity(null); return; }
    try {
      const res = await fetch('/api/tha-closer', { headers: { Authorization: 'Bearer ' + token } });
      if (res.status === 401) { setWho(null); setState('signedout'); onIdentity && onIdentity(null); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not check your sign-in (' + res.status + ')');
      setWho(j); setState('ready'); onIdentity && onIdentity(j);
    } catch (e) {
      setMsg(e.message || 'Could not check your sign-in.'); setState('error'); onIdentity && onIdentity(null);
    }
  }, [onIdentity]);

  useEffect(() => {
    const sb = authClient();
    let live = true;
    sb.auth.getSession().then(({ data }) => { if (live) load(data?.session); }).catch(() => { if (live) load(null); });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') load(session);
    });
    return () => { live = false; sub?.subscription?.unsubscribe(); };
  }, [load]);

  async function sendLink(e) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes('@')) { setMsg('Enter the email on your SLP training (LMS) account.'); return; }
    setBusy(true); setMsg('');
    const back = typeof window !== 'undefined'
      ? window.location.origin + '/tha-jsa?tab=closeout' + (thaNumber ? '&tha=' + encodeURIComponent(thaNumber) : '')
      : undefined;
    const { error } = await authClient().auth.signInWithOtp({ email: addr, options: { emailRedirectTo: back, shouldCreateUser: false } });
    setBusy(false);
    if (error) setMsg('Could not send the sign-in link: ' + error.message + '. Use the email on your SLP training (LMS) account.');
    else setSent(true);
  }

  async function signOut() {
    try { await authClient().auth.signOut({ scope: 'local' }); } catch (e) {}
    setSent(false); setEmail(''); load(null);
  }

  const box = { border: '2px solid #1e3a8a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', background: '#eff6ff', fontSize: '14px', color: '#1e293b' };
  const btn = { minHeight: '44px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1e3a8a', color: 'white', fontWeight: '600', fontSize: '15px', cursor: 'pointer' };
  const link = { background: 'none', border: 'none', color: '#1e3a8a', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: '4px 0' };

  if (state === 'loading') return <div data-testid="tha-close-signin" style={box}>Checking sign-in…</div>;

  if (state === 'ready' && who) {
    const noCompany = !who.isStaff && !(who.companyNames && who.companyNames.length);
    return (
      <div data-testid="tha-close-signin" style={{ ...box, ...(noCompany ? { borderColor: '#b91c1c', background: '#fef2f2' } : {}) }}>
        <div>🔒 Signed in as <strong>{who.fullName || who.email}</strong>{who.fullName ? <span style={{ color: '#64748b' }}> ({who.email})</span> : null}</div>
        <div style={{ marginTop: '4px' }}>
          {who.isStaff ? <span>SLP staff: can close any company&apos;s THA.</span>
            : noCompany ? <strong style={{ color: '#7f1d1d' }}>This sign-in is not linked to a company on the SLP training (LMS) site, so it cannot close THAs.</strong>
            : <span>Company: <strong>{who.companyName}</strong> · {ROLE_LABEL[who.role] || 'Crew'}. You can close <strong>{who.companyName}</strong> THAs only{who.role === 'company_admin' ? ' (for anyone named on them)' : ' that you are named on'}.</span>}
        </div>
        <button type="button" onClick={signOut} style={link}>Sign out</button>
      </div>
    );
  }

  return (
    <div data-testid="tha-close-signin" style={box}>
      <div style={{ fontWeight: '700', marginBottom: '6px' }}>🔒 Sign in to close a THA</div>
      <div style={{ marginBottom: '10px' }}>Anyone can view THAs. To close one, sign in with the email on your SLP training (LMS) account. You stay signed in on this phone until you tap Sign out.</div>
      {state === 'error' && msg ? <div role="alert" style={{ color: '#7f1d1d', fontWeight: '600', marginBottom: '8px' }}>{msg}</div> : null}
      {sent ? (
        <div>
          Check your email: we sent a sign-in link to <strong>{email}</strong>. Tap it on this phone and you will come back here signed in.
          <div><button type="button" onClick={() => setSent(false)} style={link}>Use a different email</button></div>
        </div>
      ) : (
        <form onSubmit={sendLink} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"
            style={{ flex: '1 1 220px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} />
          <button type="submit" disabled={busy} style={btn}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
        </form>
      )}
      {state !== 'error' && msg ? <div role="alert" style={{ color: '#7f1d1d', fontWeight: '600', marginTop: '8px' }}>{msg}</div> : null}
    </div>
  );
}
