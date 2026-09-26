'use client'
// app/lms/competency/ui.js
// Shared look for the AnthroSafe Competency system: mobile-first, Barlow, hi-vis amber, hang-tag feedback.
// AnthroSafe(TM) Field Driven Safety | (c) 2026 SLP Alaska, LLC

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@600;700&display=swap');
.cp { --bg:#F3F5F7; --card:#FFFFFF; --ink:#14181D; --soft:#5B6770; --line:#D5DBE0; --amber:#F5A300; --amberDk:#8A5A00; --good:#2E7D32; --goodBg:#E3F1E4; --ok:#8A5A00; --okBg:#FFF3D6; --bad:#B3261E; --badBg:#FBE3E3; --focus:#1F5F8B;
  min-height:100vh; background:var(--bg); color:var(--ink); font:400 17px/1.5 Barlow, Arial, Helvetica, sans-serif; padding: env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px); }
@media (prefers-color-scheme: dark) { .cp { --bg:#101419; --card:#1B2128; --ink:#EEF1F4; --soft:#AEB6BD; --line:#333C45; --amberDk:#F5C04A; --goodBg:#16301A; --okBg:#3A2E10; --badBg:#3A1714; --good:#7BC47F; --bad:#FF8A80; --ok:#F5C04A; --focus:#7FB8E0; } }
.cp *, .cp *::before, .cp *::after { box-sizing: border-box; }
.cp main { max-width: 680px; margin: 0 auto; padding: 16px 16px 40px; }
.cp h1, .cp h2 { font-family:'Barlow Semi Condensed', Barlow, Arial, sans-serif; font-weight:700; line-height:1.15; margin:0 0 10px; }
.cp h1 { font-size:30px; } .cp h2 { font-size:23px; } .cp p { margin:0 0 12px; }
.cp .bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:4px 0 14px; }
.cp .brand { font-family:'Barlow Semi Condensed', Arial, sans-serif; font-weight:700; font-size:18px; }
.cp .muted { color:var(--soft); font-size:15px; }
.cp .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; margin-bottom:14px; }
.cp .unit { display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:10px; color:var(--ink); font:inherit; cursor:pointer; }
.cp .unit:disabled { opacity:.5; cursor:default; }
.cp .unit b { font-family:'Barlow Semi Condensed', Arial, sans-serif; font-size:19px; display:block; }
.cp .num { flex:0 0 44px; height:44px; border-radius:50%; background:var(--ink); color:var(--bg); display:grid; place-items:center; font-weight:700; font-size:18px; }
.cp .done { color:var(--good); font-weight:600; } .cp .lock { color:var(--bad); font-weight:600; }
.cp .choice { display:block; width:100%; text-align:left; min-height:56px; padding:14px 16px; margin:0 0 10px; border:2px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); font:500 17px/1.4 Barlow, Arial, sans-serif; cursor:pointer; }
.cp .choice[aria-pressed="true"] { border-color:var(--amber); background:var(--okBg); }
.cp .choice:disabled { cursor:default; opacity:.55; } .cp .choice.picked { opacity:1; border-color:var(--ink); }
.cp button:focus-visible, .cp select:focus-visible, .cp textarea:focus-visible { outline:3px solid var(--focus); outline-offset:2px; }
.cp .primary { display:block; width:100%; min-height:54px; border:0; border-radius:12px; background:var(--amber); color:#14181D; font:700 18px/1 'Barlow Semi Condensed', Arial, sans-serif; cursor:pointer; margin-top:6px; }
.cp .primary:disabled { opacity:.45; cursor:default; }
.cp .ghost { background:none; border:0; color:var(--soft); font:500 15px Barlow, Arial, sans-serif; text-decoration:underline; cursor:pointer; padding:8px 0; }
.cp .tag { position:relative; border-radius:10px; padding:16px 16px 16px 46px; margin:4px 0 14px; border:2px solid; }
.cp .tag::before { content:''; position:absolute; left:16px; top:20px; width:14px; height:14px; border-radius:50%; background:var(--bg); border:2px solid currentColor; }
.cp .tag.best { background:var(--goodBg); border-color:var(--good); color:var(--good); }
.cp .tag.ok { background:var(--okBg); border-color:var(--amber); color:var(--ok); }
.cp .tag.poor { background:var(--badBg); border-color:var(--bad); color:var(--bad); }
.cp .tag strong { display:block; font-family:'Barlow Semi Condensed', Arial, sans-serif; font-size:18px; margin-bottom:4px; }
.cp .tag p { color:var(--ink); margin:0; }
.cp .progress { height:6px; background:var(--line); border-radius:6px; overflow:hidden; margin-bottom:16px; }
.cp .progress i { display:block; height:100%; background:var(--amber); }
.cp .slide { width:100%; border-radius:10px; border:1px solid var(--line); display:block; background:#000; }
.cp .row2 { display:flex; gap:10px; } .cp .row2 > * { flex:1; }
.cp .secondary { display:block; width:100%; min-height:54px; border:2px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); font:700 17px/1 'Barlow Semi Condensed', Arial, sans-serif; cursor:pointer; margin-top:6px; }
.cp .secondary:disabled { opacity:.45; cursor:default; }
.cp .seq { display:flex; flex-wrap:wrap; gap:8px; min-height:48px; padding:10px; border:2px dashed var(--line); border-radius:12px; margin-bottom:12px; }
.cp .pill { border:2px solid var(--line); border-radius:999px; padding:10px 14px; background:var(--card); color:var(--ink); font:500 16px Barlow, Arial, sans-serif; cursor:pointer; min-height:44px; }
.cp label.field { display:block; font-weight:600; margin:0 0 6px; }
.cp select, .cp textarea { width:100%; font:16px Barlow, Arial, sans-serif; border:2px solid var(--line); border-radius:10px; background:var(--card); color:var(--ink); padding:10px; }
.cp select { min-height:48px; } .cp textarea { min-height:96px; margin-bottom:14px; }
.cp .check { display:flex; gap:12px; align-items:flex-start; padding:10px 0; font-size:16px; }
.cp .check input { width:22px; height:22px; margin-top:2px; flex:0 0 22px; }
.cp .result { font-family:'Barlow Semi Condensed', Arial, sans-serif; font-size:44px; font-weight:700; }
.cp .err { background:var(--badBg); color:var(--bad); border-radius:10px; padding:12px 14px; margin:10px 0; font-weight:600; }
.cp .stages { display:flex; gap:6px; margin:0 0 16px; flex-wrap:wrap; }
.cp .stage { flex:1 1 0; min-width:74px; min-height:44px; border:2px solid var(--line); border-radius:999px; background:var(--card); color:var(--ink); font:600 14px/1.1 'Barlow Semi Condensed', Arial, sans-serif; cursor:pointer; padding:6px 8px; }
.cp .stage.done { border-color:var(--good); color:var(--good); }
.cp .stage.on { background:var(--amber); border-color:var(--amber); color:#14181D; }
.cp .stage:disabled { opacity:.4; cursor:default; }
.cp .grid { width:100%; border-collapse:collapse; font-size:14px; }
.cp .grid th, .cp .grid td { border-bottom:1px solid var(--line); padding:8px 6px; text-align:left; vertical-align:top; }
.cp .grid th { font-family:'Barlow Semi Condensed', Arial, sans-serif; font-size:13px; color:var(--soft); }
.cp .chip { display:inline-block; border-radius:999px; padding:2px 8px; font-size:12px; font-weight:600; margin:1px 2px 1px 0; }
.cp .chip.g { background:var(--goodBg); color:var(--good); } .cp .chip.a { background:var(--okBg); color:var(--ok); } .cp .chip.r { background:var(--badBg); color:var(--bad); } .cp .chip.n { background:var(--line); color:var(--soft); }
.cp .rowbtn { background:none; border:0; color:var(--ink); font:600 15px Barlow, Arial, sans-serif; text-decoration:underline; cursor:pointer; padding:0; text-align:left; }
.cp .fine { font-size:13px; color:var(--soft); margin-top:28px; text-align:center; }
@media (prefers-reduced-motion: no-preference) { .cp .tag { animation: cpdrop .28s ease-out; } @keyframes cpdrop { from { transform: translateY(-8px) rotate(-1.5deg); opacity:0; } to { transform:none; opacity:1; } } }
`

export function Shell({ children }) {
  return (
    <div className="cp">
      <style>{CSS}</style>
      <main>
        {children}
        <p className="fine">AnthroSafe&trade; Field Driven Safety &nbsp;|&nbsp; &copy; 2026 SLP Alaska, LLC</p>
      </main>
    </div>
  )
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Player chrome in both languages. Spanish is a draft pending documented bilingual verification.
const DICT = {
  en: {
    brand: 'AnthroSafe\u2122 Competency', dashboard: 'Dashboard', loading: 'Loading\u2026', complete: 'Complete',
    locked: 'Knowledge check locked: review required', startLesson: 'Start with the narrated lesson', startScenario: 'Start with the decision scenario',
    practiceNext: 'Practice step next', checkNext: 'Knowledge check next', allDone: 'All units complete',
    allDoneText: 'Your results are recorded. Any field verification or final assessment is scheduled by your supervisor or evaluator.',
    opensAfter: 'Opens when the unit before it is complete', revision: 'Controlled content revision {r}', loadFail: 'Could not load this page.',
    signIn: 'Your sign-in was not found. Open this from Training & Competence on the portal home page after signing in to the Online Training Portal.',
    allUnits: 'All units', unit: 'Unit {n}', unitComplete: 'Unit complete', unitCompleteText: 'Your lesson, decisions, practice and knowledge check are recorded.',
    reviewLesson: 'Review the narrated lesson', backAll: 'Back to all units', loadingLesson: 'Loading the lesson\u2026', lessonFail: 'Could not load the lesson.',
    startNarrated: 'Start the narrated lesson', slideOf: 'Slide {a} of {b}', listenToEnd: ' Listen to the end to continue.', back: 'Back',
    nextSlide: 'Next slide', goScenario: 'Go to the decision scenario', showTx: 'Show transcript', hideTx: 'Hide transcript', noAudio: 'Narration not added yet.',
    scenarioDone: 'Scenario complete', replayReq: 'Replay required', yourCalls: 'Your calls:', strong: 'strong', workable: 'workable', poor: 'poor',
    poorCalls: 'You made {n} poor call(s).', replayText: 'Replay the scenario. The options will be in a different order.', continue: 'Continue',
    replay: 'Replay the scenario', decisionOf: 'Decision {a} of {b}', strongCall: 'Strong call', workableCall: 'Workable, not the strongest call',
    poorCall: 'Poor call', seeDebrief: 'See the debrief', nextDecision: 'Next decision',
    loadingWs: 'Loading your worksheet\u2026', practiceIntro: 'Build it on a real task. Your worksheet is saved to your record and your evaluator may ask you about it.',
    checkWork: 'Check your work', saved: 'Saved. You can come back and finish later.', saveFailed: 'Save failed.', saveLater: 'Save and finish later',
    submitContinue: 'Submit and continue', needFields: 'Every field needs a real answer before you can submit.',
    kcTitle: 'Knowledge check', lockedErr: 'Locked: review required before another attempt.', lockedHelp: 'Review the narrated lesson, then ask your supervisor or administrator to reopen the check.',
    startFailed: 'Could not start the knowledge check.', drawing: 'Drawing your questions\u2026', passed: 'Passed', reviewRequired: 'Review required', notYet: 'Not yet',
    unitDone: 'Unit complete.', attemptsUsed: 'Attempts used. Review the lesson before the check is reopened.',
    needPct: 'You need {p}% to pass. You will get a different set of questions.', correct: 'Correct', incorrect: 'Incorrect', tryAgain: 'Try again',
    questionOf: 'Question {a} of {b}', selectAll: 'Select all that apply.', choose: 'Choose', tapOrder: 'Tap the items in order. Tap a placed item to remove it.',
    nextQ: 'Next question', submitAnswers: 'Submit answers', scoring: 'Scoring\u2026', submitFailed: 'Submit failed.',
    results: 'Results', resultsTitle: 'Learner results', noActivity: 'No learner activity yet.', learner: 'Learner', lastActivity: 'Last activity', stComplete: 'Complete',
    lessonScenario: 'Scenario', practiceShort: 'Practice', checkShort: 'Check', lockedChip: 'Locked', attempts: 'attempts', poorCalls2: 'poor calls', best: 'best',
    reopen: 'Reopen check', reopenReason: 'Reason for reopening (required, recorded with your name)', reopenDone: 'Check reopened.', cancel: 'Cancel', save: 'Reopen',
    worksheet: 'Practice worksheet', notSubmitted: 'Not submitted', scenarioHistory: 'Scenario attempts', checkHistory: 'Check attempts', reopenHistory: 'Reopens', back2: 'Back to results', inProgress: 'In progress', notStarted: 'Not started',
    stLesson: 'Lesson', stScenario: 'Scenario', stPractice: 'Practice', stCheck: 'Check', stLocked: 'Locked until the stage before it is complete',
  },
  es: {
    brand: 'Competencia AnthroSafe\u2122', dashboard: 'Panel', loading: 'Cargando\u2026', complete: 'Completo',
    locked: 'Verificación de conocimientos bloqueada: requiere revisión', startLesson: 'Empiece con la lección narrada', startScenario: 'Empiece con el escenario de decisiones',
    practiceNext: 'Sigue el paso de práctica', checkNext: 'Sigue la verificación de conocimientos', allDone: 'Todas las unidades completas',
    allDoneText: 'Sus resultados quedaron registrados. Cualquier verificación en campo o evaluación final la programa su supervisor o evaluador.',
    opensAfter: 'Se abre cuando la unidad anterior esté completa', revision: 'Revisión de contenido controlado {r}', loadFail: 'No se pudo cargar esta página.',
    signIn: 'No se encontró su inicio de sesión. Abra esto desde Capacitación y Competencia en la página principal del portal después de iniciar sesión en el Portal de Capacitación en Línea.',
    allUnits: 'Todas las unidades', unit: 'Unidad {n}', unitComplete: 'Unidad completa', unitCompleteText: 'Su lección, decisiones, práctica y verificación de conocimientos quedaron registradas.',
    reviewLesson: 'Repasar la lección narrada', backAll: 'Volver a todas las unidades', loadingLesson: 'Cargando la lección\u2026', lessonFail: 'No se pudo cargar la lección.',
    startNarrated: 'Iniciar la lección narrada', slideOf: 'Diapositiva {a} de {b}', listenToEnd: ' Escuche hasta el final para continuar.', back: 'Atrás',
    nextSlide: 'Siguiente diapositiva', goScenario: 'Ir al escenario de decisiones', showTx: 'Mostrar transcripción', hideTx: 'Ocultar transcripción', noAudio: 'La narración aún no está agregada.',
    scenarioDone: 'Escenario completo', replayReq: 'Debe repetirlo', yourCalls: 'Sus decisiones:', strong: 'sólida', workable: 'aceptable', poor: 'deficiente',
    poorCalls: 'Tomó {n} decisión(es) deficiente(s).', replayText: 'Repita el escenario. Las opciones estarán en otro orden.', continue: 'Continuar',
    replay: 'Repetir el escenario', decisionOf: 'Decisión {a} de {b}', strongCall: 'Decisión sólida', workableCall: 'Aceptable, pero no la mejor decisión',
    poorCall: 'Decisión deficiente', seeDebrief: 'Ver el resumen', nextDecision: 'Siguiente decisión',
    loadingWs: 'Cargando su hoja de trabajo\u2026', practiceIntro: 'Hágalo sobre una tarea real. Su hoja de trabajo se guarda en su registro y su evaluador puede preguntarle sobre ella.',
    checkWork: 'Revise su trabajo', saved: 'Guardado. Puede volver y terminar después.', saveFailed: 'No se pudo guardar.', saveLater: 'Guardar y terminar después',
    submitContinue: 'Enviar y continuar', needFields: 'Cada campo necesita una respuesta real antes de poder enviar.',
    kcTitle: 'Verificación de conocimientos', lockedErr: 'Bloqueada: requiere revisión antes de otro intento.', lockedHelp: 'Repase la lección narrada y luego pida a su supervisor o administrador que reabra la verificación.',
    startFailed: 'No se pudo iniciar la verificación de conocimientos.', drawing: 'Seleccionando sus preguntas\u2026', passed: 'Aprobado', reviewRequired: 'Requiere revisión', notYet: 'Todavía no',
    unitDone: 'Unidad completa.', attemptsUsed: 'Intentos agotados. Repase la lección antes de que se reabra la verificación.',
    needPct: 'Necesita {p}% para aprobar. Recibirá un grupo diferente de preguntas.', correct: 'Correcta', incorrect: 'Incorrecta', tryAgain: 'Intentar de nuevo',
    questionOf: 'Pregunta {a} de {b}', selectAll: 'Seleccione todas las que apliquen.', choose: 'Elija', tapOrder: 'Toque los elementos en orden. Toque un elemento colocado para quitarlo.',
    nextQ: 'Siguiente pregunta', submitAnswers: 'Enviar respuestas', scoring: 'Calificando\u2026', submitFailed: 'No se pudo enviar.',
    results: 'Resultados', resultsTitle: 'Resultados de los participantes', noActivity: 'Todavía no hay actividad de participantes.', learner: 'Participante', lastActivity: 'Última actividad', stComplete: 'Completo',
    lessonScenario: 'Escenario', practiceShort: 'Práctica', checkShort: 'Verificación', lockedChip: 'Bloqueada', attempts: 'intentos', poorCalls2: 'decisiones deficientes', best: 'mejor',
    reopen: 'Reabrir verificación', reopenReason: 'Razón para reabrir (obligatoria, se registra con su nombre)', reopenDone: 'Verificación reabierta.', cancel: 'Cancelar', save: 'Reabrir',
    worksheet: 'Hoja de práctica', notSubmitted: 'No enviada', scenarioHistory: 'Intentos del escenario', checkHistory: 'Intentos de la verificación', reopenHistory: 'Reaperturas', back2: 'Volver a resultados', inProgress: 'En curso', notStarted: 'Sin empezar',
    stLesson: 'Lección', stScenario: 'Escenario', stPractice: 'Práctica', stCheck: 'Verificación', stLocked: 'Bloqueado hasta completar la etapa anterior',
  },
}
export function t(lang, key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v)
  return s
}
