'use client';
import AdminGate from '@/components/AdminGate';

// Route-level gate: wraps every page in this folder (and subfolders) with
// magic-link staff authentication. The page code itself is untouched.
// area="sail" also admits client company admins, whose view is scoped to their
// own company by /api/sail. Every other gated folder omits `area` and stays
// SLP-staff-only.
export default function GatedLayout({ children }) {
  return <AdminGate area="sail">{children}</AdminGate>;
}
