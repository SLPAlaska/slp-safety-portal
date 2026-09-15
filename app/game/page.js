'use client'

// /game — Run the Job
//
// Two ways in, one game:
//   * ?t=<signed token> from the weekly training reminder email — one tap from
//     the phone, no password, which is the entire point on a rig floor
//   * an already logged-in LMS session, for anyone who is on the portal anyway
//
// Both are checked server side by /api/game/session. This page never decides
// for itself who may play; it asks, and renders one of three answers.
//
// The shell below is the prototype's markup. Once it is on the screen the
// engine takes over and React stops re-rendering it — see app/lib/game/engine.js
// for why the run loop is imperative rather than state-driven.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createGame } from '@/lib/game/engine'
import DECKS from '@/lib/game/decks.json'
import './game.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Tab-scoped storage for the link token. Every access is wrapped: a locked-down
// browser throws on the property itself, and the game must still be playable
// for someone signed into the portal when that happens.
const TOKEN_KEY = 'rtj.t'
const sessionRead = () => { try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null } }
const sessionWrite = (t) => { try { sessionStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ } }
const sessionClear = () => { try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

export default function GamePage() {
  // loading | ready | signedout | expired | company | error
  const [status, setStatus] = useState('loading')
  const [player, setPlayer] = useState(null)
  const [company, setCompany] = useState(null)

  // The credentials every later request re-presents. Held in a ref, not state:
  // changing them must never re-render the shell out from under the engine.
  const creds = useRef({ t: null, bearer: null })
  const rootRef = useRef(null)
  const gameRef = useRef(null)

  // ── authenticate
  useEffect(() => {
    let cancelled = false

    async function go() {
      const params = new URLSearchParams(window.location.search)
      // The token is taken out of the address bar once it has been used (see
      // below), so a refresh would otherwise strand a player who came in from
      // email with no portal password to fall back on. sessionStorage carries
      // it for the life of the tab and dies with it.
      const t = params.get('t') || sessionRead()
      const arrivedWithLink = !!t
      creds.current.t = t

      // Both credentials are collected and both are sent. The server prefers a
      // valid link token, and falls through to the portal session when the
      // token is missing or stale — so an expired link in a tab that is also
      // logged in just plays on, labelled 'portal', instead of dead-ending.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        creds.current.bearer = session?.access_token || null
      } catch { creds.current.bearer = null }

      let res
      try {
        res = await fetch('/api/game/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(creds.current.bearer ? { Authorization: `Bearer ${creds.current.bearer}` } : {}),
          },
          body: JSON.stringify({ t }),
        })
      } catch {
        if (!cancelled) setStatus('error')
        return
      }
      if (cancelled) return

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setPlayer(data.player)
        setStatus('ready')
        // Drop the token out of the address bar now that it has been used.
        // It stays live for the rest of the visit, but it no longer rides along
        // in a screenshot, a shared link, or the browser history.
        if (arrivedWithLink) {
          sessionWrite(t)
          window.history.replaceState({}, '', window.location.pathname)
        }
        return
      }

      sessionClear()
      if (data.error === 'company') { setCompany(data.company); setStatus('company'); return }
      if (data.error === 'config') { setStatus('error'); return }
      setStatus(arrivedWithLink ? 'expired' : 'signedout')
    }

    go()
    return () => { cancelled = true }
  }, [])

  // ── start the engine once the shell is on the screen
  useEffect(() => {
    if (status !== 'ready' || !rootRef.current || gameRef.current) return

    const auth = () => ({
      'Content-Type': 'application/json',
      ...(creds.current.bearer ? { Authorization: `Bearer ${creds.current.bearer}` } : {}),
    })

    gameRef.current = createGame({
      root: rootRef.current,
      decks: DECKS,
      async onRunComplete(run) {
        const res = await fetch('/api/game/run', {
          method: 'POST',
          headers: auth(),
          body: JSON.stringify({ ...run, t: creds.current.t }),
        })
        return res.ok
      },
      async loadStandings(deckId) {
        const res = await fetch('/api/game/standings', {
          method: 'POST',
          headers: auth(),
          body: JSON.stringify({ deck_id: deckId, t: creds.current.t }),
        })
        if (!res.ok) throw new Error('standings unavailable')
        return res.json()
      },
    })

    return () => {
      gameRef.current?.destroy()
      gameRef.current = null
    }
  }, [status])

  if (status !== 'ready') {
    return (
      <div id="rtj-root">
        <div id="rtj-app">
          <header>
            <div className="brand">RUN THE JOB<small>MAGTEC · DRILLING SUPPORT</small></div>
          </header>
          <Gate status={status} company={company} />
        </div>
      </div>
    )
  }

  return (
    <div id="rtj-root" ref={rootRef}>
      <div id="rtj-app">
        <header>
          <div className="brand">RUN THE JOB<small>MAGTEC · DRILLING SUPPORT</small></div>
          <div className="hud">
            <span className="clock" id="clock">0:00</span>
            <span className="coins" id="coins">0</span>
            <button id="mute" aria-label="toggle sound">SND ON</button>
          </div>
        </header>

        <section className="screen active" id="home">
          <h1>PICK YOUR <span>RUN</span></h1>
          <p className="sub">
            {DECKS.length} jobs. You know the work — prove the order. Fastest clean runs take
            the pot.
          </p>
          <div id="decklist"></div>
          <p className="proto">
            Signed in as <b>{player?.name}</b> · {player?.company}. Every finished run posts to
            the crew standings.<br />
            Training aid only. The controlled SOPs govern the work.
          </p>
        </section>

        <section className="screen" id="brief">
          <h1 className="briefhead">THIS RUN:<br /><span id="bTitle"></span></h1>
          <div className="runcard">
            <div className="rt" id="bSub"></div>
            <div className="rs" id="bMeta"></div>
          </div>
          <p className="rules">
            Tap the steps in the order you&apos;d run them. Right call pays <b>+25</b>, streaks
            multiply it. Wrong call costs <b>−25</b> and shows you why it bites. Clean run pays
            <b> +500</b>. Beat the clock — every second under par is money.
          </p>
          <button className="bigbtn" id="startBtn">START THE RUN</button>
          <button className="ghostbtn" id="backBtn">BACK TO THE BOARD</button>
        </section>

        <section className="screen" id="game">
          <div className="phasebar">
            <div className="phasename" id="phasename"></div>
            <div className="phasecount" id="phasecount"></div>
          </div>
          <div className="streak" id="streak"></div>
          <div className="track" id="track"></div>
          <div id="feedback" className="idle">What comes first?</div>
          <div className="hand" id="hand"></div>
        </section>

        <section className="screen" id="end">
          <div className="stamp" id="stamp">RUN COMPLETE<small id="stampSub"></small></div>
          <div className="stats">
            <div className="row"><span>Time</span><span className="v" id="fTime">—</span></div>
            <div className="row"><span>Clean calls</span><span className="v" id="fAcc">—</span></div>
            <div className="row"><span>Best streak</span><span className="v" id="fStreak">—</span></div>
            <div className="row"><span>Bonuses</span><span className="v" id="fBonus">—</span></div>
            <div className="row"><span>Payout</span><span className="v pay" id="fPay">—</span></div>
          </div>
          <div className="board" id="board"></div>
          <button className="bigbtn" id="againBtn">RUN IT AGAIN</button>
          <button className="ghostbtn" id="homeBtn">BACK TO THE BOARD</button>
        </section>
      </div>
    </div>
  )
}

function Gate({ status, company }) {
  if (status === 'loading') {
    return (
      <div className="gate">
        <p>Checking your crew…</p>
      </div>
    )
  }

  if (status === 'company') {
    return (
      <div className="gate">
        <h2>NOT AVAILABLE FOR <span>YOUR COMPANY</span> YET</h2>
        <p>
          Run the Job is built on MagTec Alaska&apos;s controlled SOPs, so right now it is open
          to MagTec crews only.
        </p>
        <p>
          {company ? `${company} decks aren't written yet.` : "Your company's decks aren't written yet."}
          {' '}When they are, the link will show up in your training email — nothing to sign up for.
        </p>
        <a className="bigbtn" href="/lms/dashboard">BACK TO TRAINING</a>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="gate">
        <h2>THAT LINK IS <span>USED UP</span></h2>
        <p>
          Game links expire a couple of weeks after they are sent. Your next training email
          carries a fresh one.
        </p>
        <p>You can also sign in to the portal and play from there.</p>
        <a className="bigbtn" href="/lms/login">SIGN IN</a>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="gate">
        <h2>THE GAME IS <span>DOWN</span></h2>
        <p>Something on our end is not answering. Try again in a few minutes.</p>
        <a className="bigbtn" href="/lms/dashboard">BACK TO TRAINING</a>
      </div>
    )
  }

  return (
    <div className="gate">
      <h2>SIGN IN TO <span>RUN IT</span></h2>
      <p>
        Runs post to the crew standings, so the game needs to know whose run it is. Sign in
        with your training portal account, or tap the link in your weekly training email.
      </p>
      <a className="bigbtn" href="/lms/login">SIGN IN</a>
    </div>
  )
}
