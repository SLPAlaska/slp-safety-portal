// THA close-out by a named person (no code). Runs the shipped rule file and
// checks the page, API route and Help Desk wiring.
// Usage: npm run check:tha-close
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { namesMatch, namedPeople, findNamedCloser, missingAar, normaliseName } from '../app/lib/thaCloser.js'

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

// Wiring
const page = readFileSync(join(root, 'app/tha-jsa/page.js'), 'utf8')
ok(!/closeoutThaCode|THA CODE|THA Code \*/.test(page), 'page: no close-out code input or code box')
ok(/findNamedCloser/.test(page) && /tha-closer-names/.test(page), 'page: named-person picker + pre-check')
ok(/AAR_REQUIRED_MESSAGE/.test(page), 'page: AAR required')
const route = readFileSync(join(root, 'app/api/closeout/route.js'), 'utf8')
ok(/closeTha\(/.test(route) && /findNamedCloser/.test(route) && /missingAar/.test(route), 'route: server enforces named person + AAR')
ok(/\.eq\('status', 'Open'\)/.test(route), 'route: does not overwrite an auto-closed / closed THA')
const help = readFileSync(join(root, 'app/lib/help/howto.js'), 'utf8') + readFileSync(join(root, 'app/lib/help/forms.js'), 'utf8')
ok(!/THA CODE|enter the THA number and THA code|with the code: what went well|Ask the crew lead for the THA code/.test(help), 'help: no "enter the code" guidance for THAs')
ok(/id: 'tha-not-named'/.test(help), 'help: not-named answer present')

if (fails) { console.log(fails + ' failure(s)'); process.exit(1) }
console.log('check:tha-close OK')
