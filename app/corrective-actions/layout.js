'use client';
import AdminGate from '@/components/AdminGate';

// Route-level gate: wraps every page in this folder (and subfolders) with
// magic-link authentication. Any signed-in person gets in; the data is
// scoped server-side by /api/corrective-actions (app/lib/caAccess.js).
export default function GatedLayout({ children }) {
  return <AdminGate area="corrective-actions">{children}</AdminGate>;
}
