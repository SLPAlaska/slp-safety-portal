// app/lib/game/engine.js
//
// Run the Job — game engine.
//
// Ported from the run-the-job.html prototype with the scoring, timing and
// feedback behavior unchanged. Two things are deliberately NOT in here:
//
//   * the decks — they live in app/lib/game/decks.json, so adding an SOP is a
//     content edit, not a code change
//   * the network — the host passes in onRunComplete / loadStandings, so the
//     engine has no idea how a player was authenticated
//
// The engine drives the DOM shell rendered by app/game/page.js directly rather
// than through React state. The run loop is imperative and animation-heavy
// (coin flights, shake, overlays); re-rendering a React tree on every tap would
// fight it for no benefit. React owns the shell, the engine owns what is
// inside it, and the two never touch the same nodes.
//
// SCORING (unchanged from the prototype)
//   right call     +25, doubled at a 3 streak, tripled at 6
//   wrong call     -25, coins floor at 0
//   phase clear    +100
//   clean run      +500
//   time bonus     +2 per second under the deck's par
//
// createGame returns { destroy } — call it on unmount so the clock interval
// and the click listeners do not outlive the page.

export function createGame({ root, decks, onRunComplete, loadStandings }) {
  const $ = (id) => root.querySelector('#' + id)

  // ── state
  let deck = null, phase = 0, idx = 0, order = []
  let coins = 0, streak = 0, bestStreak = 0, rights = 0, wrongs = 0
  let t0 = 0, timer = null, destroyed = false

  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
  const mult = () => (streak >= 6 ? 3 : streak >= 3 ? 2 : 1)
  const reduceMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function show(id) {
    root.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'))
    $(id).classList.add('active')
  }
  function setCoins(v) {
    coins = Math.max(0, v)
    $('coins').textContent = coins.toLocaleString()
  }

  // ── audio (WebAudio beeps, no assets to ship)
  let AC = null, muted = false
  function beep(f, dur, type, vol, when) {
    if (muted) return
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)()
      const o = AC.createOscillator(), g = AC.createGain()
      o.type = type
      o.frequency.value = f
      g.gain.setValueAtTime(vol, AC.currentTime + (when || 0))
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + (when || 0) + dur)
      o.connect(g); g.connect(AC.destination)
      o.start(AC.currentTime + (when || 0))
      o.stop(AC.currentTime + (when || 0) + dur)
    } catch (e) { /* no audio context — the game plays fine silent */ }
  }
  function ding() {
    const f = 880 + Math.min(streak, 8) * 55
    beep(f, 0.09, 'square', 0.12)
    beep(f * 1.5, 0.14, 'square', 0.10, 0.07)
  }
  const buzz = () => {
    beep(196, 0.12, 'square', 0.18)
    beep(147, 0.14, 'square', 0.18, 0.11)
    beep(82, 0.4, 'sawtooth', 0.2, 0.24)
  }
  const jingle = () =>
    [660, 880, 990, 1320, 880, 1320, 1760].forEach((f, i) => beep(f, 0.12, 'square', 0.10, i * 0.09))

  // ── home
  function buildHome() {
    const dl = $('decklist')
    dl.innerHTML = ''
    decks.forEach((d) => {
      const n = d.phases.reduce((a, p) => a + p.steps.length, 0)
      const b = document.createElement('button')
      b.className = 'deck'
      b.innerHTML = '<div class="dt"></div><div class="ds"></div><div class="dm"></div>'
      b.querySelector('.dt').textContent = d.title
      b.querySelector('.ds').textContent = d.sub + ' · ' + d.meta.split('·')[0].trim()
      b.querySelector('.dm').textContent = d.phases.length + ' PHASES · ' + n + ' STEPS'
      b.addEventListener('click', () => {
        deck = d
        $('bTitle').textContent = d.title
        $('bSub').textContent = d.sub
        $('bMeta').textContent = d.meta + ' · ' + n + ' steps'
        show('brief')
      })
      dl.appendChild(b)
    })
  }

  // ── run
  function startRun() {
    if (!deck) return
    phase = 0; coins = 0; streak = 0; bestStreak = 0; rights = 0; wrongs = 0
    setCoins(0)
    t0 = Date.now()
    clearInterval(timer)
    timer = setInterval(() => { $('clock').textContent = fmt((Date.now() - t0) / 1000) }, 250)
    loadPhase()
    show('game')
  }

  function loadPhase() {
    idx = 0
    const P = deck.phases[phase]
    $('phasename').textContent = (phase + 1) + '/' + deck.phases.length + ' · ' + P.name
    order = P.steps.map((s, i) => i).sort(() => Math.random() - 0.5)
    $('track').innerHTML = '<div class="empty">Nothing run yet. First move is yours.</div>'
    fb('idle', phase === 0 ? 'What comes first?' : 'Next phase. What comes first?')
    updStreak(); updCount()
    const hand = $('hand')
    hand.innerHTML = ''
    order.forEach((i) => {
      const b = document.createElement('button')
      b.className = 'card'
      b.textContent = P.steps[i].t
      b.addEventListener('click', () => play(i, b))
      hand.appendChild(b)
    })
  }

  function updCount() {
    $('phasecount').textContent = 'STEP ' + (idx + 1) + ' / ' + deck.phases[phase].steps.length
  }
  function updStreak() {
    const el = $('streak')
    el.textContent = streak >= 3
      ? 'STREAK ×' + mult() + ' — ' + streak + ' straight'
      : (streak > 0 ? streak + ' straight' : '')
    el.classList.toggle('hot', mult() >= 2)
  }
  function fb(cls, msg) {
    const f = $('feedback')
    f.className = cls
    f.textContent = msg
  }

  function coinFly(btn) {
    if (reduceMotion()) return
    const a = btn.getBoundingClientRect(), b = $('coins').getBoundingClientRect()
    const c = document.createElement('div')
    c.className = 'flycoin'
    c.style.left = (a.left + a.width / 2) + 'px'
    c.style.top = (a.top + a.height / 2) + 'px'
    document.body.appendChild(c)
    requestAnimationFrame(() => {
      c.style.transform = 'translate(' + (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px,'
        + (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px) scale(.5)'
      c.style.opacity = '0.2'
    })
    setTimeout(() => c.remove(), 550)
  }

  function play(i, btn) {
    const P = deck.phases[phase]
    if (i === idx) {
      rights++; streak++; bestStreak = Math.max(bestStreak, streak)
      const pay = 25 * mult()
      setCoins(coins + pay)
      ding()
      if (navigator.vibrate) navigator.vibrate(18)
      coinFly(btn)
      btn.classList.add('out')
      const tr = $('track')
      if (idx === 0) tr.innerHTML = ''
      const d = document.createElement('div')
      d.className = 'done'
      d.innerHTML = '<span class="n"></span><span class="s"></span>'
      d.querySelector('.n').textContent = idx + 1
      d.querySelector('.s').textContent = P.steps[i].t
      tr.appendChild(d)
      tr.scrollTop = tr.scrollHeight
      fb('good', '+' + pay + ' — right call.')
      idx++
      if (idx >= P.steps.length) { phaseClear() } else { updCount(); updStreak() }
    } else {
      wrongs++; streak = 0
      setCoins(coins - 25)
      buzz(); updStreak()
      btn.classList.remove('err'); void btn.offsetWidth; btn.classList.add('err')
      if (navigator.vibrate) navigator.vibrate([80, 50, 120])
      wrongOverlay(P.steps[i].w)
    }
  }

  function wrongOverlay(msg) {
    const ov = document.createElement('div')
    ov.className = 'wrongov'
    ov.innerHTML = '<div class="wt">WRONG CALL</div><div class="wc"></div>'
      + '<div class="wp">−25</div><button class="bigbtn">BACK TO IT</button>'
    ov.querySelector('.wc').textContent = msg
    ov.querySelector('button').addEventListener('click', () => {
      ov.remove()
      fb('idle', 'Same question. What comes next?')
    })
    $('rtj-app').appendChild(ov)
  }

  function phaseClear() {
    const bonus = 100
    setCoins(coins + bonus)
    const ov = document.createElement('div')
    ov.className = 'phaseclear'
    ov.innerHTML = '<div class="pc"></div><div class="pb">Phase bonus +' + bonus + '</div>'
    ov.querySelector('.pc').textContent = deck.phases[phase].name + ' CLEAR'
    $('rtj-app').appendChild(ov)
    setTimeout(() => {
      ov.remove()
      if (destroyed) return
      phase++
      if (phase >= deck.phases.length) { endRun() } else { loadPhase() }
    }, 1300)
  }

  async function endRun() {
    clearInterval(timer)
    const secs = (Date.now() - t0) / 1000
    const timeBonus = Math.max(0, Math.round(deck.par - secs)) * 2
    const cleanBonus = wrongs === 0 ? 500 : 0
    setCoins(coins + timeBonus + cleanBonus)
    jingle()

    const finishedDeck = deck
    $('stamp').innerHTML = (wrongs === 0 ? 'CLEAN RUN' : 'RUN COMPLETE') + '<small></small>'
    $('stamp').querySelector('small').textContent = finishedDeck.sub
    $('fTime').textContent = fmt(secs)
    $('fAcc').textContent = rights + ' / ' + (rights + wrongs)
    $('fStreak').textContent = bestStreak
    $('fBonus').textContent = '+' + (timeBonus + cleanBonus).toLocaleString()
      + (cleanBonus ? ' (CLEAN +500)' : '')
    $('fPay').textContent = coins.toLocaleString()
    show('end')

    if (!reduceMotion()) {
      for (let k = 0; k < 34; k++) {
        const c = document.createElement('div')
        c.className = 'coin'
        c.style.left = (Math.random() * 100) + '%'
        c.style.animation = 'drop ' + (1.1 + Math.random() * 1.4) + 's '
          + (Math.random() * 0.9) + 's cubic-bezier(.3,.1,.7,1) forwards'
        $('rtj-app').appendChild(c)
        setTimeout(() => c.remove(), 3400)
      }
    }

    // Post the run, then show the board it just changed. A failed post is said
    // out loud on the board — a player who beat the crew and silently did not
    // make the list would rightly stop trusting the whole thing.
    const run = {
      deck_id: finishedDeck.id,
      coins,
      time_seconds: Math.round(secs),
      rights,
      wrongs,
      best_streak: bestStreak,
    }
    let saved = false
    try { saved = !!(await onRunComplete(run)) } catch (e) { saved = false }
    if (!destroyed) renderStandings(finishedDeck, saved)
  }

  // ── standings
  function boardRow(rank, name, coinsVal, secs, isYou) {
    const r = document.createElement('div')
    r.className = 'brow' + (isYou ? ' you' : '')
    const left = document.createElement('span')
    left.textContent = (rank ? rank + '. ' : '') + name
    const right = document.createElement('span')
    right.className = 'bn'
    right.textContent = fmt(secs) + ' · ' + Number(coinsVal).toLocaleString()
    r.appendChild(left); r.appendChild(right)
    return r
  }

  async function renderStandings(d, saved) {
    const box = $('board')
    box.innerHTML = ''
    const h = document.createElement('h3')
    h.textContent = 'CREW STANDINGS — ' + d.title
    box.appendChild(h)

    const loading = document.createElement('div')
    loading.className = 'note'
    loading.textContent = 'Pulling the board…'
    box.appendChild(loading)

    let board = null
    try { board = await loadStandings(d.id) } catch (e) { board = null }
    if (destroyed) return

    loading.remove()

    if (!board) {
      const n = document.createElement('div')
      n.className = 'note'
      n.textContent = saved
        ? 'Your run was recorded, but the board would not load. Try again in a minute.'
        : 'Board unavailable.'
      box.appendChild(n)
    } else {
      const top = board.top || []
      if (top.length === 0) {
        const n = document.createElement('div')
        n.className = 'note'
        n.textContent = 'No runs on this deck yet. Yours is the first — set the bar.'
        box.appendChild(n)
      } else {
        top.forEach((row, i) =>
          box.appendChild(boardRow(i + 1, row.name, row.coins, row.time_seconds, !!row.is_you)))
      }
      if (board.you) {
        const label = board.you.rank ? 'YOUR BEST (#' + board.you.rank + ')' : 'YOUR BEST'
        box.appendChild(boardRow(null, label, board.you.coins, board.you.time_seconds, true))
      }
      const n = document.createElement('div')
      n.className = 'note'
      n.textContent = 'Top 10 by payout, ties broken by the faster run. MagTec crews only.'
      box.appendChild(n)
    }

    if (!saved) {
      const warn = document.createElement('div')
      warn.className = 'note warn'
      warn.textContent = 'This run did not save — you were offline or your link expired. '
        + 'The score above is yours, it just did not reach the board.'
      box.appendChild(warn)
    }
  }

  // ── wiring
  buildHome()
  const onStart = () => startRun()
  const onAgain = () => startRun()
  const onBack = () => show('home')
  const onHome = () => show('home')
  const onMute = () => { muted = !muted; $('mute').textContent = muted ? 'SND OFF' : 'SND ON' }
  $('startBtn').addEventListener('click', onStart)
  $('againBtn').addEventListener('click', onAgain)
  $('backBtn').addEventListener('click', onBack)
  $('homeBtn').addEventListener('click', onHome)
  $('mute').addEventListener('click', onMute)

  return {
    destroy() {
      destroyed = true
      clearInterval(timer)
      $('startBtn').removeEventListener('click', onStart)
      $('againBtn').removeEventListener('click', onAgain)
      $('backBtn').removeEventListener('click', onBack)
      $('homeBtn').removeEventListener('click', onHome)
      $('mute').removeEventListener('click', onMute)
    },
  }
}
