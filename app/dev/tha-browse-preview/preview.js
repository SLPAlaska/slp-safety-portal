'use client';

// Dev-only fixture. Not linked from the portal. 404 in production.
// INC-2026-0085: MagTec Alaska, Deadhorse, 2026-10-09, person Ched Isaac.
// The matching THA is the next day and lists the crew member as "Ched I".

import { useState } from 'react';
import { ThaGatePanel } from '@/components/ThaGate';

const MATCH = {
  tha_number: 'THA-20261010-5905',
  date: '2026-10-10',
  created_at: '2026-10-10T16:00:00Z',
  location: 'Deadhorse',
  work_area: 'heavy shop',
  task_description: 'General automotive and equipment Maintenance',
  crew_lead: 'Shop lead',
  crew_names: ['Ched I'],
  steps: [{ step_number: 1, task_step: 'Service the equipment', potential_hazards: 'Stored energy' }],
};

export default function Preview() {
  const [attached, setAttached] = useState('');

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20 }}>Attach THA — INC-2026-0085</h1>
      <p style={{ fontSize: 14, color: '#374151' }}>
        MagTec Alaska · Deadhorse · 10/09/2026 · Ched Isaac. One match on the next day.
      </p>
      {attached && <div data-testid="tha-attached-note" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginBottom: 12 }}>{attached}</div>}
      <ThaGatePanel
        gate={{ status: 'block', message: 'Not yet. Attach a THA, or record why there is not one.' }}
        suggestions={[MATCH]}
        onAttach={(id) => setAttached(`Attached ${id} as investigation evidence.`)}
      />

      <h2 style={{ fontSize: 18, marginTop: 28 }}>When nothing matches</h2>
      <ThaGatePanel
        gate={{ status: 'block', message: 'Not yet. Attach a THA, or record why there is not one.' }}
        suggestions={[]}
        onSearch={async ({ thaNumber, date }) => {
          if (String(thaNumber).includes('5905') || date === '2026-10-10') return [MATCH];
          return [];
        }}
        onSaveNoTha={({ reason }) => setAttached(`No THA saved: ${reason}`)}
      />
    </div>
  );
}
