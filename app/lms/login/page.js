'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LmsLoginPage() {
  const router = useRouter()
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

    // Check if learner account exists and is active
    const { data: lmsUser, error: userError } = await supabase
      .from('lms_users')
      .select('id, must_change_pw, active')
      .eq('auth_user_id', data.user.id)
      .single()

    if (userError || !lmsUser) {
      await supabase.auth.signOut()
      setError('Your account was not found. Please contact your administrator.')
      setLoading(false)
      return
    }

    if (!lmsUser.active) {
      await supabase.auth.signOut()
      setError('Your account has been deactivated. Please contact your administrator.')
      setLoading(false)
      return
    }

    // Force password change on first login
    if (lmsUser.must_change_pw) {
      router.push('/lms/change-password')
      return
    }

    router.push('/lms/dashboard')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <img
            src="/slp-logo.png"
            alt="SLP Alaska"
            style={styles.logo}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 style={styles.title}>SLP Alaska Training Portal</h1>
          <p style={styles.subtitle}>Sign in to access your assigned training courses</p>
        </div>

        {/* Form */}
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="your@email.com"
              style={styles.input}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={styles.input}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              ...styles.button,
              opacity: (loading || !email || !password) ? 0.6 : 1,
              cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Having trouble signing in? Contact your SLP Alaska administrator.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: '24px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    height: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: '#fff0f0',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
  },
  button: {
    background: '#b71c1c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '700',
    marginTop: '4px',
    transition: 'background 0.2s',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    marginTop: '24px',
    marginBottom: 0,
  },
}
