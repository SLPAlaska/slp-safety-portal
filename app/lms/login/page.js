'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { isSuperAdmin } from '@/lib/superAdmins'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LmsLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setError('Invalid email or password. Please try again.')
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

    const res = await fetch('/api/lms/learner/check-user', {
      headers: { 'Authorization': `Bearer ${data.session.access_token}` }
    })
    const userData = await res.json()

    if (!res.ok) {
      await supabase.auth.signOut()
      setError(userData.error || 'Account not found. Contact your administrator.')
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
