// THA close-out by a named person (no code). Runs the shipped rule file and
// checks the page, API route and Help Desk wiring.
// Usage: npm run check:tha-close
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { namesMatch, namedPeople, findNamedCloser, missingAar, normaliseName, decideThaClose, companyIn, filterThasForScope } from '../app/lib/thaCloser.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } }

// Name matching
ok(normaliseName("  O'Brien, José M. ") === 'jose m obrien', 'normalise: comma order, accents, punctuation')
for (const [t, l] of [
  ['John Smith', 'John Smith'], ['john smith', 'JOHN SMITH'], ['Mike Jones', 'Michael Jones'], ['Michael Jones', 'Mike Jones'],
  ['Smith, John', 'John Smith'], ['John A. Smith', 'John Smith'], ['Jon Thompson', 'Jon Thomson'], ['Matthew Lee', 'Mathew Lee'],
  ['Mike Jones', 'Mike'], ['Jose Garcia Jr', 'José García'], ['Mary-Ann Price', 'Mary Ann Price'], ['Gonzalez Gerardo', 'Gerardo Gonzalez'],
]) ok(namesMatch(t, l), `should match: "${t}" vs "${l}"`)
for (const [t, l] of [
  ['John Smith', 'Jane Smith'], ['John Smith', 'John Smythe-Jones'], ['John', 'John Smith'], ['Bob Lee', 'Bill Lee'],
  ['', 'John Smith'], ['J S', 'John Smith'], ['Dan Moe', 'Dan Rowe'],
]) ok(!namesMatch(t, l), `should NOT match: "${t}" vs "${l}"`)

// Named list = crew lead + crew sign-on, de-duplicated
const people = namedPeople({ crew_lead: 'Mike Jones' }, [{ crew_member_name: 'Michael Jones ' }, { crew_member_name: 'Ana Ruiz' }, { crew_member_name: 'ana ruiz' }, { crew_member_name: '' }])
ok(people.length === 3, 'crew lead + 2 unique crew (exact dup removed), got ' + people.length)
ok(people[0].role === 'Crew lead', 'crew lead first')
ok(findNamedCloser('ana ruiz', people)?.name === 'Ana Ruiz', 'closer stored as the name on the THA')
ok(findNamedCloser('Mike Jones', people)?.name === 'Mike Jones', 'exact match preferred over nickname match')
ok(findNamedCloser('Pete Other', people) === null, 'outsider cannot close')
ok(findNamedCloser('', people) === null, 'blank closer cannot close')

// After-action review is required
ok(missingAar({ aar_went_well: 'ok', aar_didnt_go_as_planned: 'nothing', aar_how_improve: 'n/a' }).length === 0, 'short answers accepted')
ok(missingAar({ aar_went_well: 'good', aar_didnt_go_as_planned: ' ', aar_how_improve: '' }).length === 2, 'blank AAR answers rejected')

// Phase 1 company lock: sign-in + LMS company (decideThaClose)
const POLLARD = ['Pollard Wireline', 'Pollard', 'Pollard Wireline LLC']
const mark = { email: 'markleon.pollard@gmail.com', fullName: 'Mark Leon', isStaff: false, role: 'company_admin', companyName: 'Pollard Wireline', companyNames: POLLARD }
const steve = { email: 'wlsup@acsalaska.net', fullName: 'Steven Barrow', isStaff: false, role: 'learner', companyName: 'Pollard Wireline', companyNames: POLLARD }
const brian = { email: 'brian@slpalaska.com', fullName: 'Brian Walden', isStaff: true, role: null, companyName: null, companyNames: [] }
const nobody = { email: 'x@example.com', fullName: null, isStaff: false, role: null, companyName: null, companyNames: [] }
const magtecTha = { tha_number: 'THA-20261011-0001', company: 'MagTec Alaska' }
const chosenTha = { tha_number: 'THA-20261011-0002', company: 'Chosen Construction' }
const pollardTha = { tha_number: 'THA-20261011-0003', company: 'Pollard Wireline' }
const pPeople = namedPeople({ crew_lead: 'Zach Smith' }, [{ crew_member_name: 'Steve Barrow' }, { crew_member_name: 'Ana Ruiz' }])
const mPeople = namedPeople({ crew_lead: 'Steven Barrow' }, [])
const d = (scope, tha, people, tapped) => decideThaClose({ scope, tha, people, tapped })

ok(d(null, pollardTha, pPeople, 'Zach Smith').reason === 'signed_out', 'signed out cannot close')
ok(d(null, pollardTha, pPeople, 'Zach Smith').status === 401, 'signed out = 401')
ok(d(mark, magtecTha, mPeople, 'Steven Barrow').reason === 'company_mismatch', 'Pollard admin cannot close MagTec (even if a name matches)')
ok(d(mark, chosenTha, mPeople, 'Steven Barrow').reason === 'company_mismatch', 'Pollard admin cannot close Chosen')
ok(d(steve, magtecTha, mPeople, 'Steven Barrow').reason === 'company_mismatch', 'Pollard crew named on a MagTec THA still cannot close it')
const mk = d(mark, pollardTha, pPeople, 'Zach Smith')
ok(mk.ok && mk.closedBy === 'Zach Smith' && mk.onBehalf === true, 'Mark closes a Pollard THA for a named crew member (logged on behalf)')
ok(d(mark, pollardTha, pPeople, 'Pete Other').reason === 'not_named', 'Mark cannot close for someone not named on it')
ok(d(mark, pollardTha, pPeople, '').reason === 'not_named', 'Mark must tap a named person')
const st = d(steve, pollardTha, pPeople, 'Steve Barrow')
ok(st.ok && st.closedBy === 'Steve Barrow' && !st.onBehalf, 'named crew closes as themselves (nickname/LMS name match)')
ok(d(steve, pollardTha, pPeople, 'Ana Ruiz').reason === 'not_you', 'crew cannot close as someone else')
ok(d(steve, { tha_number: 'THA-20261011-0004', company: 'Pollard' }, namedPeople({ crew_lead: 'Zach Smith' }, []), 'Zach Smith').reason === 'not_named_self', 'unnamed crew (own company) cannot close')
ok(d(steve, { tha_number: 'THA-20261011-0005', company: 'Pollard Wireline, LLC' }, pPeople, 'Steve Barrow').ok, 'company spelling variants match')
ok(d(nobody, pollardTha, pPeople, 'Zach Smith').reason === 'no_company', 'signed in with no LMS company cannot close')
ok(d(brian, magtecTha, mPeople, 'Steven Barrow').ok, 'SLP staff can close any company')
ok(d(brian, chosenTha, mPeople, '').ok && d(brian, chosenTha, mPeople, '').closedBy === 'Brian Walden', 'SLP staff blank closer = themselves')
ok(d(brian, chosenTha, mPeople, 'Pete Other').reason === 'not_named', 'SLP staff typed name must still be on the THA')
ok(companyIn('MagTec Alaska, LLC', ['MagTec Alaska LLC']) && !companyIn('MagTec Alaska', POLLARD) && !companyIn('', POLLARD), 'companyIn')

// Signed-in list = own company only (11 Oct 2026)
const openRows = [pollardTha, magtecTha, chosenTha, { tha_number: 'THA-20261011-0006', company: 'Pollard Wireline, LLC' }]
const markSees = filterThasForScope(openRows, mark).map((r) => r.tha_number)
ok(markSees.length === 2 && !markSees.includes(magtecTha.tha_number) && !markSees.includes(chosenTha.tha_number), 'Mark sees only Pollard THAs, got ' + markSees.join(','))
ok(filterThasForScope(openRows, steve).every((r) => companyIn(r.company, POLLARD)), 'Pollard crew sees only Pollard')
ok(filterThasForScope(openRows, brian).length === 4, 'SLP staff sees every company')
ok(filterThasForScope(openRows, null).length === 4, 'signed out: public list unchanged')
ok(filterThasForScope(openRows, nobody).length === 0, 'signed in with no LMS company sees none')
const fd = readFileSync(join(root, 'app/api/field-data/route.js'), 'utf8')
ok(/resolveThaCloser\(request, admin\)/.test(fd) && /filterThasForScope\(/.test(fd), 'field-data open_thas filters by the signed-in LMS company')

// Wiring
const page = readFileSync(join(root, 'app/tha-jsa/page.js'), 'utf8')
ok(!/closeoutThaCode|THA CODE|THA Code \*/.test(page), 'page: no close-out code input or code box')
ok(/findNamedCloser/.test(page) && /tha-closer-names/.test(page), 'page: named-person picker + pre-check')
ok(/AAR_REQUIRED_MESSAGE/.test(page), 'page: AAR required')
const route = readFileSync(join(root, 'app/api/closeout/route.js'), 'utf8')
ok(/closeTha\(/.test(route) && /findNamedCloser/.test(route) && /missingAar/.test(route), 'route: server enforces named person + AAR')
ok(/\.eq\('status', 'Open'\)/.test(route), 'route: does not overwrite an auto-closed / closed THA')
ok(/resolveThaCloser\(req, admin\)/.test(route) && /decideThaClose\(/.test(route) && /tha_close_log/.test(route), 'route: session company lock + audit log')
ok(!/jobBar|close_company/.test(route), 'route: company never taken from the request body')
ok(/ThaCloseSignIn/.test(page) && /authFetch\('\/api\/closeout'/.test(page), 'page: sign-in panel + token on close')
ok(/authFetch\('\/api\/field-data\?view=open_thas'\)/.test(page) && /visibleOpenTHAs\.map\(/.test(page) && !/\{openTHAs\.map\(/.test(page), 'page: open-THA lists carry the token and render only the filtered list')
const help = readFileSync(join(root, 'app/lib/help/howto.js'), 'utf8') + readFileSync(join(root, 'app/lib/help/forms.js'), 'utf8')
ok(!/THA CODE|enter the THA number and THA code|with the code: what went well|Ask the crew lead for the THA code/.test(help), 'help: no "enter the code" guidance for THAs')
ok(/id: 'tha-not-named'/.test(help), 'help: not-named answer present')

if (fails) { console.log(fails + ' failure(s)'); process.exit(1) }
console.log('check:tha-close OK')
