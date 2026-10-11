'use client'

// Re-sends forms that were saved on this phone with no signal, and says so.
//
// Mounted once in the root layout so it runs on every page. Starts the
// SafeSubmit flush (online / focus / visibility / timer / page load) and shows
// a bar at the top of the screen while anything is waiting:
//   amber  "N form(s) saved on this phone - NOT sent yet"
//   blue   "Sending N saved form(s)..."
//   green  "N saved form(s) sent" (a few seconds, then gone)
// The bar never says "sent" until the server has accepted the row.
import { useEffect, useState } from 'react'
import { initOfflineSync, processOfflineQueue, getOfflineQueueCount, OFFLINE_QUEUE_EVENT } from '@/components/SafeSubmit'

const BAR_ID = 'slp-offline-bar'

export default function OfflineSync() {
  const [count, setCount] = useState(0)
  const [sending, setSending] = useState(false)
  const [online, setOnline] = useState(true)
  const [done, setDone] = useState(null) // { sent, review }
  // A form was just saved on the phone. Most forms still show their own
  // success screen, so the bar says plainly that this one did NOT go in.
  const [justQueued, setJustQueued] = useState(false)

  useEffect(() => {
    setCount(getOfflineQueueCount())
    setOnline(navigator.onLine !== false)
    let doneTimer = null
    const onQueue = (e) => {
      const d = (e && e.detail) || {}
      setCount(typeof d.count === 'number' ? d.count : getOfflineQueueCount())
      if (typeof d.sending === 'boolean') setSending(d.sending)
      const r = d.result
      if (r && (r.processed || r.toBackup)) {
        setDone({ sent: r.processed || 0, review: r.toBackup || 0 })
        clearTimeout(doneTimer)
        doneTimer = setTimeout(() => setDone(null), 8000)
      }
      if (d.queued) { setDone(null); setJustQueued(true) }
      if (d.count === 0) setJustQueued(false)
    }
    const onStorage = (e) => { if (e.key === null || e.key === 'offline_submission_queue') setCount(getOfflineQueueCount()) }
    const onNet = () => setOnline(navigator.onLine !== false)
    window.addEventListener(OFFLINE_QUEUE_EVENT, onQueue)
    window.addEventListener('storage', onStorage)
    window.addEventListener('online', onNet)
    window.addEventListener('offline', onNet)
    const stop = initOfflineSync()
    return () => {
      stop()
      clearTimeout(doneTimer)
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onQueue)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('online', onNet)
      window.removeEventListener('offline', onNet)
    }
  }, [])

  const visible = count > 0 || !!done

  // Push the page down while the bar shows so it never covers a header,
  // a Yes/No row or a Submit button.
  useEffect(() => {
    if (!visible) return
    const bar = document.getElementById(BAR_ID)
    const h = bar ? bar.offsetHeight : 48
    const prev = document.body.style.paddingTop
    document.body.style.paddingTop = `${h}px`
    return () => { document.body.style.paddingTop = prev }
  }, [visible, count, sending, done])

  if (!visible) return null

  const plural = (n) => (n === 1 ? 'form' : 'forms')
  let bg = '#92400e', border = '#f59e0b', text
  if (count > 0 && sending) {
    bg = '#1e3a5f'; border = '#93c5fd'
    text = `Sending ${count} saved ${plural(count)}… keep this page open.`
  } else if (count > 0 && justQueued) {
    text = `No signal: the form you just submitted was NOT sent. It is saved on this phone${count > 1 ? ` (${count} waiting)` : ''} and sends automatically when you have signal. Do not clear browser data.`
  } else if (count > 0) {
    text = `${count} ${plural(count)} saved on this phone — NOT sent yet. ${online ? 'Will keep trying.' : 'Sends automatically when you have signal.'} Do not clear browser data.`
  } else {
    bg = '#166534'; border = '#86efac'
    const parts = []
    if (done.sent) parts.push(`${done.sent} saved ${plural(done.sent)} sent`)
    if (done.review) parts.push(`${done.review} reached SLP for review`)
    text = `✓ ${parts.join(', ')}.`
  }

  return (
    <div
      id={BAR_ID}
      className="slp-offline-bar"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: bg, color: '#fff', borderBottom: `3px solid ${border}`,
        padding: '8px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1.3,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      <span aria-hidden="true">{count > 0 ? (sending ? '📤' : '📵') : '✅'}</span>
      <span style={{ flex: '1 1 200px' }}>{text}</span>
      {count > 0 && !sending && online && (
        <button
          type="button"
          onClick={() => processOfflineQueue()}
          style={{
            background: '#fff', color: '#1e3a5f', border: 'none', borderRadius: 6,
            padding: '6px 12px', fontWeight: 800, fontSize: 14, cursor: 'pointer', minHeight: 36,
          }}
        >
          Send now
        </button>
      )}
    </div>
  )
}
