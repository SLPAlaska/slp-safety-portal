# SLP Safety Portal

Next.js (App Router) portal for SLP Alaska: safety field forms, investigations,
and the AnthroSafe LMS. Supabase is the database, auth provider, and Edge
Function host. Deployed on Vercel at https://portal.slpalaska.com.

## Security policy for all work in this repo
- This portal holds safety training records for multiple client companies. Treat every endpoint, secret, and permission accordingly.
- Never ship a new API route or edge function without an auth check appropriate to its caller (session, signed token, or shared-secret header). "The existing route was open" is never a reason to add another open one.
- If you discover a security issue while doing unrelated work, always report it. If the fix is small and self-contained (adding an auth check, removing a leaked secret, tightening RLS), fix it in the same session as a separate commit. If the fix changes a contract other systems depend on (cron bodies, token formats, API shapes), report it with a proposed fix and wait for approval.
- Secrets never go in the transcript, in git, in migrations, or in cron job bodies. Use Supabase secrets/Vault and scratchpad files for handoff.
- Company data isolation is load-bearing: any query serving one company must be scoped by company_id, and cross-company access is super-admin only.
- New tables get RLS enabled from the first migration.

### How that policy is implemented today

Reference these when adding something new, rather than inventing a fourth way:

| Caller | Mechanism | Example |
| --- | --- | --- |
| Logged-in learner or admin | Supabase session; `Authorization: Bearer <access_token>`, verified server-side with the service-role client | `app/api/lms/learner/*`, `app/lib/game-auth.js` |
| Emailed link, no password | HS256 JWT signed with a server-held secret, scoped and short-lived | `GAME_LINK_SECRET`, `app/lib/game-auth.js` |
| Machine caller (cron, webhook) | Shared-secret header, constant-time compare, fails closed when unset | `x-training-reminder-secret`, `x-weekly-reports-secret`, `x-incident-alert-secret` |
| Platform staff | Exact email match, never domain match | `app/lib/superAdmins.js` |

Super admins are identified by **exact email address**, never by `@slpalaska.com`
domain — real learners hold that domain too, and a domain check would hand them
the platform.

Cron jobs resolve every credential from Vault inside the job body
(`select decrypted_secret from vault.decrypted_secrets where name = ...`), so
nothing sensitive is stored in `cron.job`, which is readable by any role that
can query it. The setup functions are `security definer` and granted to
`service_role` only.

### Driver identification data (CDL numbers, dates of birth)

`da_drivers.cdl_number_enc` and `da_drivers.dob_enc` are encrypted at rest with
pgcrypto, keyed from Vault (`da_cdl_key`), and readable only through
service-role functions. Both columns are revoked from `authenticated` outright:
even a DER reads the driver list without them.

**That encryption protects the database. It does not protect anything you
print.** The moment `da_reveal_cdl` or `da_reveal_dob` hands back a value and
it reaches tool output, it can land on disk in the clear and outlive the
session — see the sweep below for how. So:

- **Never print a decrypted CDL number or date of birth.** Not in a table, not
  in a debug line, not "just this once to check the import worked".
- **Counts, CDL last four, and birth year only.** `cdl_last4` and `dob_year`
  exist precisely so a list can be rendered and a record matched without
  decrypting anything. A birth year alone is not identification; a full date is.
- **Never background a command that touches driver data** (`run_in_background`),
  whatever the output size. Backgrounding writes the complete stdout to a file
  on its own, with no size threshold involved.
- **Keep any output touching driver data under ~40KB.** Measured on this
  machine: 54KB stayed in the conversation, 112KB was written to disk, and two
  real spills happened at 88KB and 90KB. 40KB is inside the margin. For 75
  drivers that means summarising, not listing.
- **Need a full listing?** Write it to a scratchpad file you then delete, rather
  than printing it.

Generating the FMCSA bulk upload file is already safe and does not need special
handling: `/api/da?view=bulk_file` decrypts inside the route and returns the
content straight to the browser, so the cleartext never passes through tool
output at all. The exposure is verification queries that print what they read.

### End-of-session sweep

**Any session that touches driver data ends with a sweep, reported without
being asked.** This is not optional and does not wait for a prompt.

Three places persist tool output automatically, unredacted:

| Location | Written when | Lifetime |
| --- | --- | --- |
| `<scratchpad>/` | you put it there | until deleted |
| `<session>/tasks/*.output` | ANY background command, any size | Temp |
| `~/.claude/projects/<project>/<session>/tool-results/` | output over roughly 60–90KB, and every binary fetch | **not temporary — a normal user directory** |

The third is the one that matters. It sits under the home directory, which on
this machine is inside a OneDrive-synced tree, and nothing there expires on its
own. A 90KB query result containing 79 CDL numbers lived there for hours in
September 2026 purely as a side effect of ordinary verification work — nothing
unusual happened, which is the point.

Sweep all three for secrets, credentials and driver identification data,
**report what was found before deleting anything**, then delete on
instruction. Overwrite with random bytes and fsync before unlinking, so the
contents are not merely de-linked.

`npm run sweep:secrets` does the scan. It reports file names and the kind of
match only — never the matched value, because a sweep that prints what it
found has just recreated the problem it was looking for.

### Known gaps

Open security items. Each is a decision waiting on a person, not a bug to fix
blind — read the note before changing the surrounding code.

*(none open)*

#### Closed

- **Investigation workbench access was domain-gated, not role-gated.**
  Opened and closed 2026-09-18. The workbench authorised on an `@slpalaska.com`
  email suffix, and `/api/spellcheck` only checked that the caller was *a*
  signed-in portal user. Real LMS learners hold `@slpalaska.com` addresses, so
  any learner with a portal account could have signed into the workbench and
  read incident and investigation records — the same trap
  `app/lib/superAdmins.js` warns about, one layer down.

  Closed by replacing the suffix test with a role test in both places. The rule
  and the password policy live in `app/lib/investigatorAuth.js`, imported by the
  workbench page and the route so the two cannot drift. The workbench signs out
  anyone without the role; `/api/spellcheck` returns a structured 403
  (`code: 'forbidden'`).

  **The role is stored in `app_metadata`, and must stay there.** `user_metadata`
  is writable by the signed-in user — `supabase.auth.updateUser({ data: ... })`
  — so a role kept there is self-granted privilege, and reading it server-side
  does not help, because the value the server reads is the value the client
  wrote. Only the service role can write `app_metadata`. `must_change_password`
  is deliberately in `user_metadata`: the user has to clear it themselves after
  choosing a password, and clearing it early grants no access. The harness has a
  case asserting a role found only in `user_metadata` is refused — keep it.

## Conventions worth knowing

**Paginate every bulk Supabase read.** PostgREST caps a response at 1000 rows
and enforces it server-side — `.range()` past it does not return more. Several
LMS tables are well over that. An unpaginated read fails silently and produces
wrong answers rather than errors: a completion past row 1000 looks exactly like
a course the employee never took. Use `pageAll` / `pageAllIn` from
`app/lib/supabasePage.js`.

**Create service-role clients lazily.** Build them inside the request handler,
not at module load, or `next build`'s page-data collection breaks.

**`@/*` maps to `./app/*`** (see `jsconfig.json`), so shared code lives in
`app/lib/`, not the root `lib/`.

**Edge Functions bundle from their own directory** and cannot import from
`app/lib`. Where logic is duplicated across that boundary (week boundaries,
token signing), both copies say so in a comment. Change them together.

**Week boundaries are Alaska Mondays,** not UTC ones — `app/lib/game/week.js`.
A run played 9pm Sunday on the Slope belongs to the week that just ended.

## Verifying changes

- `npm run build` — must compile clean before any commit.
- `npx deno check supabase/functions/<name>/index.ts` — type-check an Edge
  Function without deploying.
- Prefer testing the **shipped source** over a retyped copy of it: the email and
  token checks in this repo's history lift functions out of the real file and
  run them, which is what catches a change that only exists in one of two
  places.
- `send-training-reminders` accepts `{"dry_run": true}` and sends nothing —
  always use it before a real run. `send-weekly-reports` has no dry-run mode, so
  any successful call to it mails real clients.

**Calling a function by hand needs TWO headers.** The Supabase gateway rejects a
request with `UNAUTHORIZED_NO_AUTH_HEADER` before the handler ever runs unless it
carries an `Authorization: Bearer` JWT, so the anon key satisfies the *platform*
and the shared secret satisfies the *function*. Neither one alone works, which is
exactly the intent: the anon key ships in the browser bundle and must never be
enough to mail every employee of every client company.

```bash
# Dry run over the whole roster. Sends nothing; writes the response to a file
# because it carries employee names and addresses.
# tr -d '\r\n' is not decoration: .env.local has CRLF line endings on Windows and
# a stray \r in a header value gets the request rejected.
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | sed 's/^[^=]*=//' | tr -d '\r\n')
SECRET=$(grep '^TRAINING_REMINDER_SECRET=' <secret-env-file> | sed 's/^[^=]*=//' | tr -d '\r\n')
curl -s -X POST https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders \
  -H "Authorization: Bearer $ANON" \
  -H "x-training-reminder-secret: $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"dry_run":true}' -o dryrun.json -w 'http %{http_code}\n'
unset ANON SECRET
```

The shared secrets are **not readable back** from Supabase: `secrets set` is
write-only and `secrets list` returns a SHA-256 digest of each value, with no
decrypt flag. Get the value from Vault or from the scratchpad handoff file, and
confirm it is still the live one by hashing it and comparing against the digest
`secrets list` reports — that verifies it without printing it.

## Deploying

```bash
npx supabase db push --linked                         # migrations (check --dry-run first)
npx supabase functions deploy <name> --project-ref iypezirwdlqpptjpeeyf
npx supabase secrets set --env-file <file> --project-ref iypezirwdlqpptjpeeyf
```

`supabase functions deploy` reads the **working tree**, not HEAD — check
`git status` first so an unrelated uncommitted edit does not ride along.

When a change spans a cron job and the function it calls, update the **cron
first**: an extra header a function ignores is harmless, a required header the
cron does not send yet is a silently broken Monday.
