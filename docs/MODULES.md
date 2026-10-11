# Module on/off switches

Every part of the portal belongs to a module listed in `config/modules.json`.
Every module is **on** by default. Nothing is hidden unless someone turns it off.

## Turning a module off

Either:

- set it to `false` in `config/portal.json`:
  ```json
  { "modules": { "switches": { "game": false, "demo": false } } }
  ```
- or list it in the Vercel env var `NEXT_PUBLIC_DISABLED_MODULES` (comma separated, e.g. `game,demo`).

Then redeploy. The switch is read at build time.

## What "off" does

- Home page: the module's links are hidden; a tile left with no links is hidden.
- Its pages and API routes answer 404 (`proxy.js`).
- Modules that depend on it turn off too (`incidents` off also turns off `analytics` and `truecost`; `lms` off also turns off `lms-competency` and `game`).
- Data is never touched. Turning a module back on brings everything back as it was.

## Help Desk and Quick Start

- `help-desk` off: `/help` answers 404, the home Help Desk button and the floating Help button disappear.
- `quick-start` off: the Quick Start row on the home page and Help Desk disappears. Each button also hides on its own when the module owning its form is off.

See `docs/HELP-DESK.md`.

## What it does not do

- `core` cannot be turned off. Sign-in (`/api/lms`), SafeSubmit (`/api/field-data`, `/api/closeout`) and `/api/spellcheck` are shared by every form and always stay open.
- Supabase cron jobs and Edge Functions (training reminders, weekly reports, incident alert) are not gated here.
- `ash-book` off hides the tile; the PDF file itself is still served.

## Checks

`npm run check:modules` runs the shipped gate: every manifest path exists, every home link belongs to a module,
the default config hides nothing, and switching each module off hides exactly its own links and routes.
Add any new page to a module in `config/modules.json`, or the check fails.

## Corrective-action nags (database switch, not a build switch)

Loud corrective-action reminders run from Supabase (cron `ca-loud-nags` → Edge Function `send-ca-nags`), so they are switched in the database, not here:

```sql
update public.ca_nag_settings set enabled = false where id = 1;   -- stop all nags
update public.ca_nag_settings set mode = 'dry_run' where id = 1;  -- log who would get what, send nothing
update public.ca_nag_settings set escalation_cc = '{someone@example.com}' where id = 1; -- extra cc on overdue
```

Cadence: day 0, day 7, day 14, daily for the last 7 days before due, daily while overdue (investigation lead cc'd). Only closing the action stops it. Every send is in `public.ca_nag_log`. See SQL 2026-10-11-50.
