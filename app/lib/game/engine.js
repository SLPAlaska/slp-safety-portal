// app/lib/game/engine.js
//
// Run the Job — game engine.
//
// Ported from the run-the-job.html prototype with the scoring, timing and
// feedback behavior unchanged. Two things are deliberately NOT in here:
//
//   * the content — decks live in decks.json, the ASH question bank in
//     quickhits.json, so new SOPs and new questions are content edits
//   * the network — the host passes in the onComplete / loadStandings hooks,
//     so the engine has no idea how a player was authenticated
//
// The engine drives the DOM shell rendered by app/game/page.js directly rather
// than through React state. The run loop is imperative and animation-heavy
// (coin flights, shake, overlays); re-rendering a React tree on every tap would
// fight it for no benefit. React owns the shell, the engine owns what is
// inside it, and the two never touch the same nodes.
//
// SCORING — RUNS (unchanged from the prototype)
//   right call     +25, doubled at a 3 streak, tripled at 6
//   wrong call     -25, coins floor at 0
//   phase clear    +100
//   clean run      +500
//   time bonus     +2 per second under the deck's par
//
// SCORING — QUICK HITS
//   right answer   +25, plus 5 per whole second left on the 15s clock
//   perfect pull   +250
//
// createGame returns { destroy } — call it on unmount so the clocks and the
// click listeners do not outlive the page.

import { QH_PER_RUN, QH_SECS, QH_RIGHT_PAY, QH_SECOND_PAY, QH_PERFECT_BONUS } from './scoring'

export function createGame({
  root,
  decks,
  quickhits,
  featuredDeckId = null,
  // Which board opens first. Today every crew is a drilling crew, so drilling
  // is the default; once crews carry a board this comes from the player's crew.
  defaultBoard = 'drilling',
  onRunComplete,
  onPullComplete,
  loadStandings,
  autoStart = null,          // 'pull' to open straight into Quick Hits
}) {
  const $ = (id) => root.querySelector('#' + id)

  // ── run state
  let deck = null, phase = 0, idx = 0, order = []
  let coins = 0, streak = 0, bestStreak = 0, rights = 0, wrongs = 0
  let t0 = 0, timer = null, destroyed = false

  // ── quick hits state
  let qIdx = 0, qSet = [], qRight = 0, qTimer = null, qLeft = 0

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

  function coinDrop(n) {
    if (reduceMotion()) return
    for (let k = 0; k < n; k++) {
      const c = document.createElement('div')
      c.className = 'coin'
      c.style.left = (Math.random() * 100) + '%'
      c.style.animation = 'drop ' + (1.1 + Math.random() * 1.4) + 's '
        + (Math.random() * 0.9) + 's cubic-bezier(.3,.1,.7,1) forwards'
      $('rtj-app').appendChild(c)
      setTimeout(() => c.remove(), 3400)
    }
  }

  function coinFly(btn) {
    if (reduceMotion() || !btn) return
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

  // ── home
  //
  // Decks are grouped into boards — drilling support and the Kenai fab shop —
  // and only one board's decks are listed at a time. Shop hands and drilling
  // crews run different SOPs entirely, and a single 24-deck list on a phone
  // buries whichever half you are not there for.
  const BOARD_LABELS = { drilling: 'DRILLING SUPPORT', kenai: 'KENAI FAB SHOP' }
  const boardOf = (d) => d.board || 'drilling'
  const boards = [...new Set(decks.map(boardOf))]
  let activeBoard = boards.includes(defaultBoard) ? defaultBoard : boards[0]

  function buildHome() {
    const dl = $('decklist')
    dl.innerHTML = ''

    if (boards.length > 1) {
      const bar = document.createElement('div')
      bar.className = 'boardbar'
      boards.forEach((bd) => {
        const t = document.createElement('button')
        t.className = 'boardtab' + (bd === activeBoard ? ' on' : '')
        const n = decks.filter((d) => boardOf(d) === bd).length
        t.innerHTML = '<span class="bl"></span><span class="bc"></span>'
        t.querySelector('.bl').textContent = BOARD_LABELS[bd] || bd.toUpperCase()
        t.querySelector('.bc').textContent = n + ' RUNS'
        t.addEventListener('click', () => {
          if (bd === activeBoard) return
          activeBoard = bd
          buildHome()
        })
        bar.appendChild(t)
      })
      dl.appendChild(bar)
    }

    decks.filter((d) => boardOf(d) === activeBoard).forEach((d) => {
      const n = d.phases.reduce((a, p) => a + p.steps.length, 0)
      const featured = d.id === featuredDeckId
      const b = document.createElement('button')
      b.className = 'deck' + (featured ? ' featured' : '')
      b.innerHTML = '<div class="dt"></div><div class="ds"></div><div class="dm"></div>'
      b.querySelector('.dt').textContent = d.title
      b.querySelector('.ds').textContent = d.sub + ' · ' + d.meta.split('·')[0].trim()
      b.querySelector('.dm').textContent = (featured ? 'FEATURED THIS WEEK · ' : '')
        + d.phases.length + ' PHASES · ' + n + ' STEPS'
      b.addEventListener('click', () => {
        deck = d
        $('bTitle').textContent = d.title
        $('bSub').textContent = d.sub
        $('bMeta').textContent = d.meta + ' · ' + n + ' steps'
        show('brief')
      })
      dl.appendChild(b)
    })
    qhHomeTile()
  }

  function qhHomeTile() {
    const b = document.createElement('button')
    b.className = 'deck qhdeck'
    b.innerHTML = '<div class="dt">QUICK HITS — ASH PULL</div><div class="ds"></div><div class="dm"></div>'
    b.querySelector('.ds').textContent = QH_PER_RUN
      + ' rapid-fire questions from the 2026 Alaska Safety Handbook · '
      + QH_SECS + ' seconds each · faster pays more'
    b.querySelector('.dm').textContent = 'SEPARATE GAME · ' + quickhits.length + '-QUESTION ASH BANK'
    b.addEventListener('click', startQH)
    $('decklist').appendChild(b)
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
    const clean = wrongs === 0
    $('stamp').innerHTML = (clean ? 'CLEAN RUN' : 'RUN COMPLETE') + '<small></small>'
    $('stamp').querySelector('small').textContent = finishedDeck.sub
    $('fTime').textContent = fmt(secs)
    $('fAcc').textContent = rights + ' / ' + (rights + wrongs)
    $('fStreak').textContent = bestStreak
    $('fBonus').textContent = '+' + (timeBonus + cleanBonus).toLocaleString()
      + (cleanBonus ? ' (CLEAN +500)' : '')
    $('fPay').textContent = coins.toLocaleString()
    $('runNote').innerHTML = ''
    show('end')
    coinDrop(34)

    // Post the run, then show the board it just changed. A failed post is said
    // out loud — a player who beat the crew and silently did not make the list
    // would rightly stop trusting the whole thing.
    const run = {
      deck_id: finishedDeck.id,
      coins,
      time_seconds: Math.round(secs),
      rights,
      wrongs,
      best_streak: bestStreak,
    }
    let result = null
    try { result = await onRunComplete(run) } catch (e) { result = null }
    if (destroyed) return

    renderRunNote(result, clean)
    renderBoards(finishedDeck, !!result)
  }

  function renderRunNote(result, clean) {
    const box = $('runNote')
    box.innerHTML = ''
    if (!result) return

    if (result.is_first_attempt) {
      box.appendChild(note('First run on this deck — this one is the score that goes in the '
        + 'knowledge report. Every run after it is practice, and practice is the point.'))
    } else if (result.attempt_number) {
      box.appendChild(note('Attempt ' + result.attempt_number + ' on this deck. Run it as many '
        + 'times as you like — your best is what stands.'))
    }
    if (result.drawing_entry) {
      box.appendChild(note('CLEAN RUN — that is a drawing entry for this week. One per deck, '
        + 'per week.', 'win'))
    } else if (clean) {
      box.appendChild(note('Clean run. You already have this week\'s entry for this deck.'))
    }
  }

  function note(text, kind) {
    const d = document.createElement('div')
    d.className = 'runnote' + (kind ? ' ' + kind : '')
    d.textContent = text
    return d
  }

  // ── QUICK HITS
  function startQH() {
    qIdx = 0; qRight = 0; coins = 0
    setCoins(0)
    clearInterval(timer)
    $('clock').textContent = '—'
    qSet = [...quickhits].sort(() => Math.random() - 0.5).slice(0, QH_PER_RUN)
    $('qEnd').innerHTML = ''
    show('qh')
    qNext()
  }

  function qNext() {
    clearInterval(qTimer)
    const Q = qSet[qIdx]
    $('qCount').textContent = (qIdx + 1) + ' / ' + QH_PER_RUN
    $('qQ').textContent = Q.q
    $('qWhy').innerHTML = ''
    const box = $('qOpts')
    box.innerHTML = ''
    Q.o.forEach((opt, i) => {
      const b = document.createElement('button')
      b.className = 'card'
      b.textContent = opt
      b.addEventListener('click', () => qAnswer(i, b))
      box.appendChild(b)
    })
    qLeft = QH_SECS
    $('qFill').style.width = '100%'
    qTimer = setInterval(() => {
      qLeft -= 0.1
      $('qFill').style.width = Math.max(0, (qLeft / QH_SECS) * 100) + '%'
      if (qLeft <= 0) { clearInterval(qTimer); qAnswer(-1, null) }
    }, 100)
  }

  function qAnswer(i, btn) {
    clearInterval(qTimer)
    const Q = qSet[qIdx]
    const opts = [...$('qOpts').children]
    opts.forEach((o, k) => { o.classList.add(k === Q.a ? 'qright' : 'qdim') })
    const w = $('qWhy')
    w.innerHTML = ''

    const why = document.createElement('div')
    if (i === Q.a) {
      qRight++
      const pay = QH_RIGHT_PAY + Math.ceil(qLeft) * QH_SECOND_PAY
      setCoins(coins + pay)
      ding()
      if (navigator.vibrate) navigator.vibrate(18)
      coinFly(btn)
      why.className = 'qwhy right'
      why.innerHTML = '<b></b><span></span>'
      why.querySelector('b').textContent = '+' + pay
      why.querySelector('span').textContent = ' — ' + Q.why
    } else {
      if (btn) btn.classList.add('qwrong')
      buzz()
      if (navigator.vibrate) navigator.vibrate([80, 50, 120])
      why.className = 'qwhy wrong'
      why.innerHTML = '<b></b><span></span>'
      why.querySelector('b').textContent = i < 0 ? 'TIME.' : 'WRONG.'
      why.querySelector('span').textContent = ' ' + Q.why
    }
    w.appendChild(why)

    qIdx++
    const nb = document.createElement('button')
    nb.className = 'bigbtn'
    nb.style.marginTop = '14px'
    nb.textContent = qIdx >= QH_PER_RUN ? 'SEE THE DAMAGE' : 'NEXT ONE'
    nb.addEventListener('click', () => { qIdx >= QH_PER_RUN ? qEnd() : qNext() })
    w.appendChild(nb)
  }

  async function qEnd() {
    jingle()
    const perfect = qRight === QH_PER_RUN
    if (perfect) setCoins(coins + QH_PERFECT_BONUS)
    const score = coins

    $('qQ').textContent = ''
    $('qOpts').innerHTML = ''
    $('qWhy').innerHTML = ''
    $('qFill').style.width = '0%'
    $('qCount').textContent = 'DONE'

    const end = $('qEnd')
    end.innerHTML = ''

    const stamp = document.createElement('div')
    stamp.className = 'stamp'
    stamp.style.marginTop = '10px'
    stamp.innerHTML = '<small>SAFETY QUICK HITS</small>'
    stamp.insertBefore(document.createTextNode(perfect ? 'PERFECT PULL' : 'PULL COMPLETE'), stamp.firstChild)
    end.appendChild(stamp)

    const stats = document.createElement('div')
    stats.className = 'stats'
    stats.innerHTML = '<div class="row"><span>Right</span><span class="v" id="qfRight"></span></div>'
      + '<div class="row"><span>Payout</span><span class="v pay" id="qfPay"></span></div>'
    end.appendChild(stats)
    end.querySelector('#qfRight').textContent = qRight + ' / ' + QH_PER_RUN
    end.querySelector('#qfPay').textContent = score.toLocaleString() + (perfect ? ' (PERFECT +' + QH_PERFECT_BONUS + ')' : '')

    if (perfect) coinDrop(24)

    const pending = note('Logging the pull…')
    end.appendChild(pending)

    let result = null
    try {
      result = await onPullComplete({
        score, right_count: qRight, total_count: QH_PER_RUN,
      })
    } catch (e) { result = null }
    if (destroyed) return
    pending.remove()

    if (!result) {
      end.appendChild(note('This pull did not save — you were offline or your link expired. '
        + 'The score above is yours, it just did not reach the board.', 'warn'))
    } else if (result.is_scored) {
      end.appendChild(note('This was your scored pull for the week. Pull again as often as you '
        + 'like — the rest are practice.'))
    } else {
      end.appendChild(note('Practice pull. Your scored pull for this week is already in.'))
    }
    if (result?.drawing_entry) {
      end.appendChild(note('PERFECT PULL — that is a drawing entry for this week.', 'win'))
    } else if (perfect && result && !result.is_scored) {
      end.appendChild(note('Perfect, but the entry goes with the scored pull — you already had '
        + 'your shot this week.'))
    }

    const again = document.createElement('button')
    again.className = 'bigbtn'
    again.textContent = 'PULL AGAIN'
    again.addEventListener('click', startQH)
    const home = document.createElement('button')
    home.className = 'ghostbtn'
    home.textContent = 'BACK TO THE BOARD'
    home.addEventListener('click', () => show('home'))
    end.appendChild(again)
    end.appendChild(home)
  }

  // ── standings
  function boardRow(rank, name, right, isYou) {
    const r = document.createElement('div')
    r.className = 'brow' + (isYou ? ' you' : '')
    const left = document.createElement('span')
    left.textContent = (rank ? rank + '. ' : '') + name
    const rt = document.createElement('span')
    rt.className = 'bn'
    rt.textContent = right
    r.appendChild(left); r.appendChild(rt)
    return r
  }

  async function renderBoards(d, saved) {
    const box = $('board')
    box.innerHTML = ''
    const loading = document.createElement('div')
    loading.className = 'note'
    loading.textContent = 'Pulling the boards…'
    box.appendChild(loading)

    let data = null
    try { data = await loadStandings(d.id) } catch (e) { data = null }
    if (destroyed) return
    box.innerHTML = ''

    if (!data) {
      box.appendChild(head('CREW STANDINGS'))
      box.appendChild(noteIn(saved
        ? 'Your run was recorded, but the boards would not load. Try again in a minute.'
        : 'Boards unavailable.'))
      if (!saved) box.appendChild(noteIn('This run did not save — you were offline or your link '
        + 'expired. The score above is yours, it just did not reach the board.', 'warn'))
      return
    }

    // 1. Individual — all-time personal bests on the deck just played
    box.appendChild(head('INDIVIDUAL — ' + d.title))
    const top = data.individual?.top || []
    if (top.length === 0) {
      box.appendChild(noteIn('No runs on this deck yet. Yours is the first — set the bar.'))
    } else {
      top.forEach((r, i) => box.appendChild(
        boardRow(i + 1, r.name, fmt(r.time_seconds) + ' · ' + Number(r.coins).toLocaleString(), r.is_you)))
    }
    const you = data.individual?.you
    if (you) {
      box.appendChild(boardRow(null, you.rank ? 'YOUR BEST (#' + you.rank + ')' : 'YOUR BEST',
        fmt(you.time_seconds) + ' · ' + Number(you.coins).toLocaleString(), true))
    }
    box.appendChild(noteIn('All-time personal bests. Payout ranks, faster run breaks the tie.'))

    // 2. Crew — this week, featured deck only
    const crew = data.crew
    if (crew) {
      box.appendChild(head('CREW — WEEK OF ' + crew.week_label))
      box.appendChild(noteIn('Featured deck: ' + crew.featured_deck_title
        + '. Crew score is skill × participation — every rostered member counts, '
        + 'and anyone who has not run it this week counts as a zero.'))
      const rows = crew.rows || []
      if (rows.length === 0) {
        box.appendChild(noteIn('No crew has put a run on the featured deck yet this week.'))
      } else {
        rows.forEach((c, i) => {
          const r = boardRow(i + 1, c.name, Math.round(c.score).toLocaleString(), c.is_yours)
          box.appendChild(r)
          const sub = document.createElement('div')
          sub.className = 'bsub' + (c.is_yours ? ' you' : '')
          sub.textContent = Math.round(c.skill_avg).toLocaleString() + ' avg × '
            + Math.round(c.participation_rate * 100) + '% in ('
            + c.participants + '/' + c.roster_size + ') · ' + c.runs
            + ' run' + (c.runs === 1 ? '' : 's') + ' this week'
          box.appendChild(sub)
        })
      }
      if (crew.your_crew_name === null) {
        box.appendChild(noteIn('You are not on a crew yet, so your runs are not counted on this '
          + 'board. Pick one from the board screen.'))
      }
    }

    // 3. the hat
    const draw = data.drawing
    if (draw) {
      box.appendChild(head('YOUR DRAWING ENTRIES'))
      if (draw.entries === 0) {
        box.appendChild(noteIn('None this week yet. A clean run on any deck earns one, and so '
          + 'does a perfect scored Safety Pull.'))
      } else {
        const bits = []
        if (draw.clean_runs) {
          bits.push(draw.clean_runs + ' clean run' + (draw.clean_runs === 1 ? '' : 's'))
        }
        if (draw.perfect_pull) bits.push('a perfect pull')
        box.appendChild(boardRow(null, 'IN THE HAT THIS WEEK', String(draw.entries), true))
        box.appendChild(noteIn('From ' + bits.join(' and ') + '. Winners are drawn after the '
          + 'week closes.'))
      }
    }

    if (!saved) {
      box.appendChild(noteIn('This run did not save — you were offline or your link expired. '
        + 'The score above is yours, it just did not reach the board.', 'warn'))
    }
  }

  function head(text) {
    const h = document.createElement('h3')
    h.textContent = text
    return h
  }
  function noteIn(text, kind) {
    const n = document.createElement('div')
    n.className = 'note' + (kind ? ' ' + kind : '')
    n.textContent = text
    return n
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

  if (autoStart === 'pull') startQH()

  return {
    destroy() {
      destroyed = true
      clearInterval(timer)
      clearInterval(qTimer)
      $('startBtn').removeEventListener('click', onStart)
      $('againBtn').removeEventListener('click', onAgain)
      $('backBtn').removeEventListener('click', onBack)
      $('homeBtn').removeEventListener('click', onHome)
      $('mute').removeEventListener('click', onMute)
    },
  }
}
