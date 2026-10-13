'use client';

// Stage tabs and Back for the investigation workbench.
// These controls are never disabled. Spelling, quality and export gates do not
// reach this file.

const C = {
  navy: '#1e3a5f', steel: '#2d5a87', card: '#ffffff', text: '#111827',
  muted: '#6b7280', border: '#d1d5db', borderL: '#e5e7eb', success: '#16a34a', blueL: '#dbeafe',
};

const btnGhostDark = {
  background: C.card, color: C.text,
  padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
  fontSize: 13, cursor: 'pointer',
};
const btnPrimaryDark = {
  background: C.navy, color: 'white',
  padding: '10px 16px', borderRadius: 8, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export function StageTabs({ stages, current, onJump }) {
  return (
    <div role="tablist" aria-label="Investigation steps" data-testid="inv-step-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {stages.map(stage => {
        const on = stage.id === current;
        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={on}
            data-testid="inv-step"
            data-stage={stage.id}
            onClick={() => onJump(stage.id)}
            style={{
              padding: '8px 12px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${on ? C.navy : C.border}`,
              background: on ? C.navy : C.card,
              color: on ? 'white' : C.text,
              fontSize: 13, fontWeight: 700,
            }}
          >
            {stage.id}. {stage.title}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ stages, current, incident, onJump }) {
  return (
    <aside style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
      <div style={{ background: C.card, border: `1px solid ${C.borderL}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Investigation Path
        </div>
        {stages.map(stage => {
          const isCurrent = stage.id === current;
          const isComplete = incident[`stage_${stage.id}_complete`];
          const dotColor = isComplete ? C.success : isCurrent ? C.steel : C.border;
          return (
            <button
              key={stage.id}
              type="button"
              data-testid="inv-step"
              data-stage={stage.id}
              onClick={() => onJump(stage.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                padding: '12px 8px', border: 'none', background: isCurrent ? C.blueL : 'transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 4,
              }}
            >
              <div style={{
                minWidth: 28, height: 28, borderRadius: '50%', background: dotColor,
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
              }}>
                {isComplete ? '✓' : stage.id}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? C.navy : C.text }}>{stage.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stage.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function StageFooter({ stage, onBack, complete, onComplete, nextLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 }}>
      {stage > 1 && onBack ? (
        <button type="button" data-testid="inv-back" onClick={() => onBack(stage - 1)} style={btnGhostDark}>← Back</button>
      ) : <span />}
      <button type="button" onClick={onComplete} style={{ ...btnPrimaryDark, fontSize: 14, padding: '12px 20px' }}>
        {complete ? '✓ Stage Complete — Re-mark Complete' : nextLabel}
      </button>
    </div>
  );
}
