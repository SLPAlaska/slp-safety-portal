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
