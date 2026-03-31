'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = '/lms/login'
    })
  }, [])

  function validate() {
    if (newPassword.length < 8) return 'Password must be at least 8 characters.'
    if (newPassword !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleChangePassword() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) { setError('Failed to update password. Please try again.'); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('lms_users').update({ must_change_pw: false }).eq('auth_user_id', user.id)
    }

    window.location.href = '/lms/dashboard'
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔒</div>
          <h1 style={styles.title}>Set Your Password</h1>
          <p style={styles.subtitle}>Your account was created with a temporary password. Please set a new one to continue.</p>
        </div>
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters" style={styles.input} disabled={loading} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              placeholder="Re-enter your password" style={styles.input} disabled={loading} />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button onClick={handleChangePassword} disabled={loading || !newPassword || !confirmPassword}
            style={{ ...styles.button, opacity: (loading || !newPassword || !confirmPassword) ? 0.6 : 1 }}>
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif' },
  card: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '48px 40px', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '32px' },
  icon: { fontSize: '40px', marginBottom: '12px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' },
  subtitle: { fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', outline: 'none' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  button: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
}
