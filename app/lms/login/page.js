'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/superAdmins'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Maps GoTrue sign-in failures to messages that tell the user what actually
// happened. Previously every failure collapsed into "Invalid email or
// password", which made a fixable account state (unconfirmed email) look
// identical to a wrong password.
function describeSignInError(signInError) {
  const code = (signInError?.code || '').toLowerCase()
  const msg  = (signInError?.message || '').toLowerCase()
  const has  = (...needles) => needles.some(n => msg.includes(n))

  if (code === 'email_not_confirmed' || has('not confirmed', 'email not confirmed')) {
    return 'This account has not been activated yet. Contact your SLP Alaska administrator to finish setup.'
  }
  if (code === 'user_banned' || has('banned')) {
    return 'This account is locked. Contact your SLP Alaska administrator.'
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || has('rate limit')) {
    return 'Too many sign-in attempts. Wait about a minute, then try again.'
  }
  if (code === 'email_provider_disabled' || has('logins are disabled', 'signups not allowed')) {
    return 'Email sign-in is currently disabled. Contact your SLP Alaska administrator.'
  }
  if (code === 'invalid_credentials' || has('invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  return 'Unable to sign in. Contact your SLP Alaska administrator.'
}

export default function LmsLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)

    let data, signInError
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      data = result.data
      signInError = result.error
    } catch (err) {
      console.error('[lms/login] sign-in threw:', err)
      setError('Could not reach the sign-in service. Check your connection and try again.')
      setLoading(false)
      return
    }

    if (signInError) {
      // Raw code/message kept in the console so an admin can diagnose without
      // guessing, while the learner sees plain language.
      console.warn('[lms/login] sign-in failed:', signInError.code, signInError.message)
      setError(describeSignInError(signInError))
      setLoading(false)
      return
    }

    if (!data?.session?.access_token) {
      console.warn('[lms/login] sign-in returned no session')
      setError('Sign-in did not complete. Contact your SLP Alaska administrator.')
      setLoading(false)
      return
    }

    // Super Admins (brian@ / britney@) don't have an lms_users row, so the
    // learner check-user call below would 404 and sign them out. Route them
    // straight to the Super Admin page BEFORE that check runs.
    if (isSuperAdmin(data.session.user.email)) {
      window.location.href = '/admin/lms'
      return
    }

    let res, userData
    try {
      res = await fetch('/api/lms/learner/check-user', {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` }
      })
      userData = await res.json()
    } catch (err) {
      console.error('[lms/login] check-user failed:', err)
      await supabase.auth.signOut()
      setError('Could not load your training profile. Contact your SLP Alaska administrator.')
      setLoading(false)
      return
    }

    if (!res.ok) {
      console.warn('[lms/login] check-user rejected:', res.status, userData)
      await supabase.auth.signOut()

      let profileMsg = userData?.error
      if (!profileMsg) {
        if (res.status === 403) {
          profileMsg = 'This account is inactive. Contact your SLP Alaska administrator.'
        } else if (res.status === 404) {
          profileMsg = 'No training profile is linked to this login. Contact your SLP Alaska administrator.'
        } else {
          profileMsg = 'Account not found. Contact your administrator.'
        }
      }

      setError(profileMsg)
      setLoading(false)
      return
    }

    if (userData.must_change_pw) {
      window.location.href = '/lms/change-password'
      return
    }

    // Route based on role
    if (userData.role === 'company_admin') {
      window.location.href = '/lms/company-dashboard'
    } else {
      window.location.href = '/lms/dashboard'
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={styles.logo}
            onError={e => { e.target.style.display = 'none' }} />
          <h1 style={styles.title}>SLP Alaska Training Portal</h1>
          <p style={styles.subtitle}>Sign in to access your assigned training courses</p>
        </div>
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="your@email.com" style={styles.input}
              autoComplete="email" disabled={loading} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••" style={styles.input}
              autoComplete="current-password" disabled={loading} />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button onClick={handleLogin} disabled={loading || !email || !password}
            style={{ ...styles.button, opacity: (loading || !email || !password) ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
        <p style={styles.footer}>Having trouble signing in? Contact your SLP Alaska administrator.</p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif' },
  card: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '48px 40px', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '32px' },
  logo: { height: '64px', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' },
  subtitle: { fontSize: '14px', color: '#666', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', outline: 'none' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  button: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  footer: { textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '24px', marginBottom: 0 },
}
