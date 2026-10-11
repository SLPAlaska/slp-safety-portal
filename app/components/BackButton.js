'use client'

// Floating Back: history.back() when this tab has a prior portal screen;
// otherwise go home. Steel/blue, ≥48px tap target, bottom-right (Help is
// bottom-left). Hides near the bottom of long pages so it never covers Submit.
import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STACK_KEY = 'slp_nav_stack'
const STACK_MAX = 40
const HIDE = [/^\/game(\/|$)/, /^\/lms\/course\//, /^\/lms\/competency\//, /^\/demo(\/|$)/]

function readStack() {
  try {
    const a = JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]')
    return Array.isArray(a) ? a.filter((u) => typeof u === 'string' && u.startsWith('/')).slice(-STACK_MAX) : []
  } catch {
    return []
  }
}

function writeStack(stack) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-STACK_MAX)))
  } catch { /* private mode */ }
}

function here() {
  return window.location.pathname + window.location.search
}

export default function BackButton() {
  const path = usePathname() || '/'
  const [canBack, setCanBack] = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const booted = useRef(false)

  const record = useCallback((opts = {}) => {
    const url = here()
    let stack = readStack()

    // First visit in this tab with an empty stack = no prior portal screen.
    if (stack.length === 0) {
      writeStack([url])
      setCanBack(false)
      return
    }

    const top = stack[stack.length - 1]
    if (top === url) {
      setCanBack(stack.length >= 2 && window.history.length > 1)
      return
    }

    // Browser back/forward: trim forward entries if this url is already in the stack.
    if (opts.isPop) {
      const idx = stack.lastIndexOf(url)
      if (idx !== -1) {
        stack = stack.slice(0, idx + 1)
        writeStack(stack)
        setCanBack(stack.length >= 2 && window.history.length > 1)
        return
      }
    }

    stack = stack.concat(url)
    writeStack(stack)
    setCanBack(stack.length >= 2 && window.history.length > 1)
  }, [])

  useEffect(() => {
    const isPop = booted.current === false
      ? (() => {
          try {
            const e = performance.getEntriesByType('navigation')[0]
            return !!(e && e.type === 'back_forward')
          } catch { return false }
        })()
      : false
    booted.current = true
    record({ isPop })
    const onPop = () => { setTimeout(() => record({ isPop: true }), 0) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [path, record])

  useEffect(() => {
    const check = () => {
      const doc = document.documentElement
      setAtBottom(
        doc.scrollHeight > window.innerHeight + 100 &&
        window.innerHeight + window.scrollY >= doc.scrollHeight - 90
      )
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [path])

  if (path === '/') return null
  if (HIDE.some((r) => r.test(path))) return null
  if (atBottom) return null

  const go = () => {
    const stack = readStack()
    if (stack.length >= 2 && window.history.length > 1) {
      window.history.back()
      return
    }
    window.location.href = '/'
  }

  return (
    <button
      type="button"
      onClick={go}
      className="slp-back-btn"
      aria-label={canBack ? 'Back to the previous screen' : 'Back to portal home'}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 48,
        minWidth: 48,
        padding: '10px 16px',
        background: '#1e3a5f',
        color: '#fff',
        border: '2px solid #bfdbfe',
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 15,
        cursor: 'pointer',
        boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
        opacity: 0.94,
      }}
    >
      <span aria-hidden="true">←</span> Back
    </button>
  )
}
