// CA owner / company-admin access rules for /api/corrective-actions.
// Usage: npm run check:ca-access
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caAccessReason, OWNER_STATUSES, STAFF_STATUSES } from '../app/lib/caRules.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } }

const staff = { isStaff: true, email: 'brian@slpalaska.com', companyNames: [] }
const owner = { isStaff: false, email: 'wlsup@acsalaska.net', companyNames: [] }
const pollardAdmin = { isStaff: false, email: 'markleon.pollard@gmail.com', companyNames: ['pollard wireline', 'pollard', 'pollard wireline llc'] }
const magtecAdmin = { isStaff: false, email: 'x@magtec.com', companyNames: ['magtec alaska', 'magtec'] }
const pollardCa = { action_owner_email: 'WLSUP@acsalaska.net' }
const pollardInc = { company_name: 'Pollard Wireline' }
const magtecCa = { action_owner_email: 'someone@magtec.com' }
const magtecInc = { company_name: 'MagTec Alaska' }

ok(caAccessReason(staff, magtecCa, magtecInc) === 'staff', 'staff sees every company')
ok(caAccessReason(owner, pollardCa, pollardInc) === 'owner', 'owner sees own CA (case-insensitive email)')
ok(caAccessReason(owner, magtecCa, magtecInc) === null, 'owner does NOT see another company CA')
ok(caAccessReason(owner, { action_owner_email: 'wlsupXacsalaska.net' }, null) === null, 'no wildcard email match')
ok(caAccessReason(pollardAdmin, pollardCa, pollardInc) === 'company_admin', 'Pollard admin sees Pollard CA owned by someone else')
ok(caAccessReason(pollardAdmin, magtecCa, magtecInc) === null, 'Pollard admin does NOT see MagTec CA')
ok(caAccessReason(magtecAdmin, pollardCa, pollardInc) === null, 'MagTec admin does NOT see Pollard CA')
ok(caAccessReason(pollardAdmin, pollardCa, null) === null, 'company admin: no incident -> no company match')
ok(caAccessReason({ ...owner, email: '' }, { action_owner_email: '' }, null) === null, 'blank email never matches blank owner')
ok(caAccessReason({ ...owner, email: 'markleon.pollard@gmail.com' }, { action_owner_email: 'markleon.pollard@gmail.com jackmorris_pollard@yahoo.com' }, null) === 'owner', 'multi-address owner field matches each address')
ok(caAccessReason({ ...owner, email: 'mark@x.com' }, { action_owner_email: 'bigmark@x.com' }, null) === null, 'substring of another address does not match')
ok(!OWNER_STATUSES.includes('Verified') && !OWNER_STATUSES.includes('Void'), 'owners cannot Verify or Void')
ok(STAFF_STATUSES.includes('Verified') && STAFF_STATUSES.includes('Void'), 'staff can Verify / Void')

const layout = readFileSync(join(root, 'app/corrective-actions/layout.js'), 'utf8')
ok(/area="corrective-actions"/.test(layout), 'layout opens the corrective-actions area')
const page = readFileSync(join(root, 'app/corrective-actions/page.js'), 'utf8')
ok(!/createClient|\.from\(/.test(page), 'page has no direct table access (API only)')
ok(!/localStorage/.test(page), 'page has no typed-email localStorage login')
const route = readFileSync(join(root, 'app/api/corrective-actions/route.js'), 'utf8')
ok(/resolveCaScope\(request/.test(route) && (route.match(/resolveCaScope\(request/g) || []).length === 2, 'GET and POST both resolve scope from the session')
ok(/caAccessReason\(scope, ca, inc\)/.test(route), 'POST re-checks access on the target row')

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1) }
console.log('check:ca-access OK')
