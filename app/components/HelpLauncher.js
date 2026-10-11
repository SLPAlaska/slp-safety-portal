'use client'

// Small "Help" button on every portal page, bottom-left so it stays clear of
// Submit buttons. Opens the Help Desk with the current page as context.
// Hidden at the very bottom of a long page, when the help-desk module is off, on the Help Desk itself, on
// full-screen pages (game, course player) and when printing.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isModuleEnabled } from '@/lib/modules'

const HIDE = [/^\/help(\/|$)/, /^\/game(\/|$)/, /^\/lms\/course\//, /^\/lms\/competency\//, /^\/demo(\/|$)/, /^\/camp-inspection-report\//]

export default function HelpLauncher() {
  const path = usePathname() || '/'
  // Step aside at the very bottom of a page, where Submit buttons live.
  const [atBottom, setAtBottom] = useState(false)
  useEffect(() => {
    const check = () => {
      const doc = document.documentElement
      setAtBottom(doc.scrollHeight > window.innerHeight + 100 && window.innerHeight + window.scrollY >= doc.scrollHeight - 90)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [path])
  if (!isModuleEnabled('help-desk')) return null
  if (atBottom) return null
  if (HIDE.some((r) => r.test(path))) return null
  return (
    <Link
      href={path === '/' ? '/help' : `/help?from=${encodeURIComponent(path)}`}
      className="slp-help-launcher"
      aria-label="Help Desk"
      style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#1e3a5f', color: '#fff', textDecoration: 'none',
        padding: '9px 13px', borderRadius: 999, fontWeight: 700, fontSize: 14,
        boxShadow: '0 3px 12px rgba(0,0,0,0.35)', border: '2px solid #bfdbfe', opacity: 0.92,
      }}
    >
      <span aria-hidden="true">❓</span> Help
    </Link>
  )
}
