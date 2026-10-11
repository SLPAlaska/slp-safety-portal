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

## What it does not do

- `core` cannot be turned off. Sign-in (`/api/lms`), SafeSubmit (`/api/field-data`, `/api/closeout`) and `/api/spellcheck` are shared by every form and always stay open.
- Supabase cron jobs and Edge Functions (training reminders, weekly reports, incident alert) are not gated here.
- `ash-book` off hides the tile; the PDF file itself is still served.

## Checks

`npm run check:modules` runs the shipped gate: every manifest path exists, every home link belongs to a module,
the default config hides nothing, and switching each module off hides exactly its own links and routes.
Add any new page to a module in `config/modules.json`, or the check fails.
