'use client';

// Dev-only fixture for the THA browse list. Not linked from the portal.
// Shows the no-name-match state: company THAs on the incident date ±1 day,
// with View, Attach, a crew/job/location filter, and No THA last.

import { useState } from 'react';
import { ThaGatePanel } from '@/components/ThaGate';

const BROWSE = [
  {
    tha_number: 'THA-HIDDEN-1',
    date: '2026-10-12',
    created_at: '2026-10-12T18:30:00Z',
    location: 'Pad A-12',
    work_area: 'Wellhead',
    task_description: 'Change the glycol filter',
    crew_lead: 'Dana Cole',
    crew_names: ['Ched Isaac', 'Dana Cole'],
    steps: [{ step_number: 1, task_step: 'Isolate the filter', potential_hazards: 'Pressure' }],
  },
  {
    tha_number: 'THA-HIDDEN-2',
    date: '2026-10-11',
    created_at: '2026-10-11T15:00:00Z',
    location: 'Pad A-12',
    work_area: 'Manifold',
    task_description: 'Pressure test the line',
    crew_lead: 'Sam Ortiz',
    crew_names: ['Sam Ortiz'],
    steps: [],
  },
];

export default function Preview() {
  const [days, setDays] = useState(1);
  const [otherLocations, setOtherLocations] = useState(false);
  const [attached, setAttached] = useState('');
  const [saved, setSaved] = useState('');

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20 }}>Attach a THA</h1>
      <p style={{ fontSize: 14, color: '#374151' }}>
        No name match. Browse this company’s THAs from the incident date, plus or minus one day.
      </p>
      {attached && <div data-testid="tha-attached-note" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginBottom: 12 }}>{attached}</div>}
      {saved && <div data-testid="tha-saved-note" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10, marginBottom: 12 }}>{saved}</div>}
      <ThaGatePanel
        gate={{ status: 'block', message: 'Not yet. Attach a THA, or record why there is not one.' }}
        suggestions={[]}
        browse={BROWSE}
        dateWindowDays={days}
        otherLocations={otherLocations}
        onBrowseChange={({ days: nextDays, otherLocations: nextLoc }) => {
          setDays(nextDays);
          setOtherLocations(nextLoc);
        }}
        onAttach={(id) => {
          const row = BROWSE.find((t) => t.tha_number === id);
          setAttached(`Attached the THA for ${row?.task_description || 'this job'}.`);
        }}
        onSaveNoTha={({ reason, detail }) => setSaved(`No THA saved: ${reason}${detail ? ` — ${detail}` : ''}`)}
      />
    </div>
  );
}
