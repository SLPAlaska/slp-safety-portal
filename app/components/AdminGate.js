'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

/**
 * AdminGate — wraps management pages with magic-link authentication.
 *
 * Access is granted to anyone whose email exists in the portal_staff table
 * (SLP staff AND client action-owners you add). No passwords — users enter
 * their email, click the link they receive, and they're in. Sessions persist
 * on the device, so this is a one-time step per device, not per visit.
 *
 * Field forms are NOT wrapped by this and remain login-free.
 */
export default function AdminGate({ children }) {
  const [status, setStatus] = useState('loading'); // loading | signedout | unauthorized | ready
  const [userEmail, setUserEmail] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => evaluate(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => evaluate(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function evaluate(session) {
    if (!session?.user?.email) { setStatus('signedout'); return; }
    setUserEmail(session.user.email);
    try {
      const { data, error } = await supabase
        .from('portal_staff')
        .select('email')
        .eq('email', session.user.email.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      setStatus(data ? 'ready' : 'unauthorized');
    } catch (e) {
      console.error('Staff check failed:', e.message);
      setStatus('unauthorized');
    }
  }

  async function sendLink(e) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes('@')) { alert('Enter a valid email address.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined }
    });
    setBusy(false);
    if (error) alert('Could not send sign-in link: ' + error.message);
    else setSent(true);
  }

  async function signOut() {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('Sign-out error (clearing local session anyway):', e?.message);
    }
    setUserEmail('');
    setEmail('');
    setSent(false);
    setStatus('signedout');
  }

  if (status === 'ready') return children;

  const S = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '20px' },
    card: { background: '#fff', borderRadius: '12px', padding: '36px', maxWidth: '420px', width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', textAlign: 'center' },
    h: { margin: '0 0 6px', fontSize: '22px', color: '#1a1a2e' },
    sub: { margin: '0 0 24px', fontSize: '13px', color: '#64748b' },
    input: { width: '100%', padding: '12px 14px', fontSize: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#fff', background: '#ea580c', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    note: { fontSize: '12px', color: '#94a3b8', marginTop: '18px' },
    link: { background: 'none', border: 'none', color: '#ea580c', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', marginTop: '10px' }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h}>Management Access</h2>
        {status === 'loading' && <p style={S.sub}>Checking access…</p>}

        {status === 'signedout' && (sent ? (
          <>
            <p style={S.sub}>Check your email — we sent a sign-in link to <strong>{email}</strong>. Click it and this page will unlock automatically.</p>
            <button style={S.link} onClick={() => setSent(false)}>Use a different email</button>
          </>
        ) : (
          <>
            <p style={S.sub}>This page is for SLP staff and assigned action owners. Enter your email to receive a one-time sign-in link — no password needed.</p>
            <form onSubmit={sendLink}>
              <input style={S.input} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              <button style={S.btn} type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
            </form>
          </>
        ))}

        {status === 'unauthorized' && (
          <>
            <p style={S.sub}>You're signed in as <strong>{userEmail}</strong>, but that address isn't on the access list for management pages. Contact SLP Alaska if you believe this is an error.</p>
            <button style={S.btn} onClick={signOut}>Sign out</button>
          </>
        )}

        <p style={S.note}>AnthroSafe™ Field Driven Safety | © 2026 SLP Alaska, LLC</p>
      </div>
    </div>
  );
}
