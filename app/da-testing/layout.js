// No AdminGate here on purpose.
//
// AdminGate admits portal_staff and, for named areas, a portal company_admin.
// Neither is the rule for this module: access is SLP staff or the client's
// named DER, and a general company_admin must never reach pending selections,
// instant results, Clearinghouse records or CDL numbers.
//
// The page asks /api/da who the caller is and renders accordingly, so the
// decision is made server-side against da_client_ders rather than in the
// browser.
export default function Layout({ children }) {
  return children;
}
