'use client';
import AdminGate from '@/components/AdminGate';

// Route-level gate: wraps every page in this folder (and subfolders) with
// magic-link staff authentication. The page code itself is untouched.
export default function GatedLayout({ children }) {
  return <AdminGate>{children}</AdminGate>;
}
