'use client';

// Client-facing page: authentication is handled INSIDE page.js via the
// company-code + password login (COMPANY_CREDENTIALS). This route must NOT be
// wrapped in the staff magic-link AdminGate, or clients can never reach their
// own login. Pass children through untouched.
export default function ClientExportLayout({ children }) {
  return children;
}
