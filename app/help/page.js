'use client'

// SLP Safety Portal Help Desk.
//
// Every answer lives in app/lib/help (bundled into this page), so searching
// never touches the network: it works on the Slope with no signal. No sign-in,
// no AI, nothing typed here leaves the phone.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { isModuleEnabled, isPathEnabled, moduleGate } from '@/lib/modules'
import { buildBank, search, forPage, isCritical, TOPICS, SLP_PHONE, SLP_PHONE_TEL } from '@/lib/help/engine'
import quick from '../../config/quickstart.json'

const POPULAR = ['tha-how', 'did-it-go', 'required-field', 'offline-forms', 'permit-close', 'lms-forgot', 'lms-cert', 'sail-mine', 'which-report', 'inspect-fail']

function Answer({ entry, open, onToggle }) {
  return (
    <div style={S.card}>
      <button type="button" onClick={onToggle} style={S.cardHead} aria-expanded={open}>
        <span style={{ flex: 1, textAlign: 'left' }}>{entry.kind === 'form' ? '📄 ' + entry.title : entry.q}</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={S.cardBody}>
          {entry.a.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: '0 0 10px', whiteSpace: 'pre-line' }}>{p}</p>
          ))}
          {entry.links && entry.links.length > 0 && (
            <div style={S.linkRow}>
              {entry.links.map(([label, href]) => (
                /^(tel|mailto):/.test(href) || href.endsWith('.pdf')
                  ? <a key={href} href={href} style={S.goBtn}>{label} →</a>
                  : <Link key={href} href={href} style={S.goBtn}>{label} →</Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpDesk() {
  const bank = useMemo(() => buildBank(moduleGate), [])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [openId, setOpenId] = useState(null)
  const [topic, setTopic] = useState(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const f = p.get('from') || ''
    if (f.startsWith('/') && !f.startsWith('//')) setFrom(f)
    const q = p.get('q')
    if (q) setQuery(q.slice(0, 200))
    setOnline(navigator.onLine)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    // Offline copy of this page only (scope /help). Failure is harmless.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/help-sw.js', { scope: '/help' }).catch(() => {})
    }
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const results = useMemo(() => (query.trim() ? search(bank, query, { limit: 8, context: from }) : []), [bank, query, from])
  const critical = isCritical(query)
  const pageHelp = useMemo(() => forPage(bank, from), [bank, from])
  const byId = useMemo(() => new Map(bank.map((e) => [e.id, e])), [bank])
  const popular = POPULAR.map((id) => byId.get(id)).filter(Boolean)
  const topicEntries = topic ? bank.filter((e) => e.topic === topic) : []
  const topics = TOPICS.filter((t) => bank.some((e) => e.topic === t.id))
  const quickOn = isModuleEnabled('quick-start')
  const quickItems = quickOn ? [...(quick.pinned || []), ...quick.items].filter((i) => isPathEnabled(i.href)) : []
  const fromName = from && (bank.find((e) => e.href === from)?.title || from)

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id))
  const list = (entries, prefix) => entries.map((e, i) => (
    <Answer key={prefix + e.id} entry={e} open={openId === prefix + e.id || (openId === null && prefix === 'r' && i === 0)} onToggle={() => toggle(prefix + e.id)} />
  ))

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.top}>
          <Link href={from && isPathEnabled(from) ? from : '/'} style={S.back}>← {from ? 'Back' : 'Portal'}</Link>
          <span style={{ ...S.status, background: online ? '#dcfce7' : '#fef3c7', color: online ? '#166534' : '#92400e' }}>
            {online ? '● Online' : '● No signal: answers still work'}
          </span>
        </div>

        <h1 style={S.h1}>❓ Help Desk</h1>
        <p style={S.sub}>Ask anything about the portal. Type a few words, like “close permit” or “forgot password”.</p>

        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpenId(null); setTopic(null) }}
          placeholder="🔍 What do you need help with?"
          aria-label="Ask a question"
          style={S.search}
          enterKeyHint="search"
        />

        {critical && (
          <div style={S.stop} role="alert">
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>🛑 STOP WORK</div>
            <div style={{ marginTop: 6 }}>If this is happening now: make the area safe only if you can do it without risk, <b>call 911 or your site emergency number / radio</b>, and notify your supervisor. Paperwork comes after everyone is safe.</div>
            <div style={S.linkRow}>
              <a href="tel:911" style={{ ...S.goBtn, background: '#fff', color: '#b91c1c' }}>📞 Call 911</a>
              {isPathEnabled('/incident-report') && <Link href="/incident-report" style={{ ...S.goBtn, background: '#7f1d1d' }}>Incident Report →</Link>}
            </div>
          </div>
        )}

        {query.trim() ? (
          <div style={{ marginTop: 14 }}>
            {results.length ? list(results.map((r) => r.entry), 'r') : (
              <div style={S.none}>
                <b>No answer for that yet.</b> Try fewer or different words (“THA”, “sling”, “password”), browse the topics below, or call SLP Alaska at <a href={SLP_PHONE_TEL} style={{ color: '#ea580c', fontWeight: 700 }}>{SLP_PHONE}</a>.
              </div>
            )}
          </div>
        ) : (
          <>
            {pageHelp.length > 0 && (
              <section style={S.section}>
                <h2 style={S.h2}>Help for this page{fromName ? `: ${fromName}` : ''}</h2>
                {list(pageHelp, 'p')}
              </section>
            )}

            {quickItems.length > 0 && (
              <section style={S.section}>
                <h2 style={S.h2}>⚡ Quick Start: most-used forms</h2>
                <div style={S.quickGrid}>
                  {quickItems.map((i) => (
                    <Link key={i.href} href={i.href} style={{ ...S.quick, ...((quick.pinned || []).some((p) => p.href === i.href) ? S.quickPinned : {}) }}>
                      <span style={{ fontSize: 20 }}>{i.icon}</span><span>{i.short}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section style={S.section}>
              <h2 style={S.h2}>Popular questions</h2>
              {list(popular, 'q')}
            </section>

            <section style={S.section}>
              <h2 style={S.h2}>Browse by topic</h2>
              <div style={S.topicGrid}>
                {topics.map((t) => (
                  <button key={t.id} type="button" onClick={() => { setTopic(topic === t.id ? null : t.id); setOpenId(null) }}
                    style={{ ...S.topic, ...(topic === t.id ? S.topicOn : {}) }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span> {t.title}
                  </button>
                ))}
              </div>
              {topic && <div style={{ marginTop: 10 }}>{list(topicEntries, 't')}</div>}
            </section>
          </>
        )}

        <div style={S.foot}>
          Still stuck? Ask your supervisor or call SLP Alaska: <a href={SLP_PHONE_TEL} style={{ color: '#fbbf24', fontWeight: 700 }}>{SLP_PHONE}</a>
          <div style={{ marginTop: 6, opacity: 0.7 }}>{bank.length} answers on this device. Nothing you type here is sent anywhere.</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>AnthroSafe™ Field Driven Safety © 2026 SLP Alaska, LLC</div>
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '12px 12px 40px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  wrap: { maxWidth: 760, margin: '0 auto' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  back: { color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '8px 4px', fontSize: 15 },
  status: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 },
  h1: { color: '#fff', fontSize: 26, margin: '10px 0 4px', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center', margin: '0 0 12px' },
  search: { width: '100%', padding: '15px 18px', fontSize: 17, border: 'none', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', outline: 'none' },
  stop: { marginTop: 14, background: '#b91c1c', color: '#fff', padding: 16, borderRadius: 14, border: '3px solid #fecaca', fontSize: 15, lineHeight: 1.45 },
  section: { marginTop: 18 },
  h2: { color: '#fff', fontSize: 16, margin: '0 0 8px' },
  card: { background: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' },
  cardHead: { width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#1e3a5f', cursor: 'pointer', minHeight: 48 },
  cardBody: { padding: '0 16px 14px', color: '#1f2937', fontSize: 15, lineHeight: 1.5 },
  linkRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  goBtn: { display: 'inline-block', background: '#ea580c', color: '#fff', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 },
  none: { background: '#fff', borderRadius: 12, padding: 16, fontSize: 15, color: '#1f2937' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  quick: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1e3a5f', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14, minHeight: 48 },
  quickPinned: { background: '#fee2e2', color: '#991b1b' },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 },
  topic: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.95)', color: '#1e3a5f', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', minHeight: 48 },
  topicOn: { background: '#ea580c', color: '#fff' },
  foot: { marginTop: 26, textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 13 },
}
