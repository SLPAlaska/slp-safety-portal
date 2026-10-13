'use client';

// Dev-only fixture. Not linked from the portal. 404 in production.
// INC-2026-0085: MagTec Alaska, Deadhorse, 2026-10-09 15:02 Alaska, Ched Isaac.
// THA-20261010-5905 is the next day and is not offered.

import { useState } from 'react';
import { ThaGatePanel } from '@/components/ThaGate';
import { StageTabs, StageFooter } from '@/components/InvestigationSteps';
import { ReportTextGateModal } from '@/components/ReportTextGate';

const SAME_DAY = {
  tha_number: 'THA-20261009-2594',
  date: '2026-10-09',
  created_at: '2026-10-09T14:50:07Z',
  location: 'Deadhorse',
  work_area: 'shop',
  task_description: 'Repair ev 804 133 as needed',
  crew_lead: 'Caleb Smith',
  crew_names: ['Alex Nguyen'],
};

const STAGES = [
  { id: 1, title: 'Setup & Evidence' },
  { id: 2, title: 'What Happened' },
  { id: 3, title: 'Why It Happened' },
  { id: 4, title: 'Close It Out' },
];

const SPELL = {
  status: 'fail',
  issues: [{
    key: 'witness',
    offset: 0,
    length: 4,
    word: 'Ched',
    message: 'Possible spelling mistake',
    kind: 'spelling',
    replacements: [],
  }],
  fields: [{
    key: 'witness',
    label: 'Witness statement',
    table: 'witness_statements',
    id: '1',
    column: 'statement_summary',
    text: 'Ched Isaac saw the spill.',
  }],
};

export default function Preview() {
  const [attached, setAttached] = useState('');
  const [stage, setStage] = useState(4);
  const [spellOpen, setSpellOpen] = useState(false);

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20 }}>Attach THA — INC-2026-0085</h1>
      <p style={{ fontSize: 14, color: '#374151' }}>
        MagTec Alaska · Deadhorse · 10/09/2026 15:02 Alaska · Ched Isaac.
        No name match. The next-day THA is not in this list.
      </p>
      {attached && <div data-testid="tha-attached-note" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginBottom: 12 }}>{attached}</div>}
      <ThaGatePanel
        gate={{ status: 'block', message: 'Not yet. Attach a THA PDF, or record why there is not one.' }}
        suggestions={[]}
        browse={[SAME_DAY]}
        onAttach={(id) => setAttached(`Attached ${id} as investigation evidence.`)}
        onSaveNoTha={({ reason }) => setAttached(`No THA saved: ${reason}`)}
      />

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Back from the final page</h2>
      <div data-testid="inv-nav-preview">
        <StageTabs stages={STAGES} current={stage} onJump={setStage} />
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Stage {stage} of 4</div>
        <StageFooter stage={stage} onBack={setStage} complete={false} onComplete={() => {}} nextLabel="Mark Investigation Complete" />
      </div>

      <button type="button" data-testid="open-spell" onClick={() => setSpellOpen(true)} style={{ marginTop: 24 }}>
        Show spelling gate
      </button>
      {spellOpen && (
        <ReportTextGateModal
          supabase={{ auth: { getSession: async () => ({ data: { session: null } }) }, from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) }}
          incidentId="00000000-0000-4000-8000-000000000085"
          action="mark this investigation complete"
          result={SPELL}
          onCancel={() => setSpellOpen(false)}
          onPass={() => setSpellOpen(false)}
        />
      )}
    </div>
  );
}
