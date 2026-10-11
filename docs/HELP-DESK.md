# Help Desk and Quick Start

## Help Desk (`/help`, module `help-desk`)

- Answer bank: `app/lib/help/howto.js` (hand-written how-to / what-does-this-mean answers) and
  `app/lib/help/forms.js` (one row per page: what it is, when to use it, search words). Every form row
  becomes a "where is / what is it for" answer with a one-tap button to the form.
- Engine: `app/lib/help/engine.js`. Pure JS, no network: lower-casing, light stemming, synonyms,
  prefix matches and typo tolerance. Critical words ("someone got hurt", "h2s alarm", "gas leak",
  "man down"...) raise a STOP WORK banner with Call 911 above the answers; paperwork words
  ("fire extinguisher inspection", "emergency drill") do not.
- Offline: the bank is bundled into the page, so search never needs signal. `public/help-sw.js` is a
  service worker registered with scope `/help` only: it keeps a copy of the Help Desk page and its
  build files so it opens with no signal after one online visit. No other page passes through it.
- No AI and no sign-in: field users are anonymous, and this repo does not add open API routes.
  Nothing typed into the Help Desk leaves the phone.
- `app/components/HelpLauncher.js`: small "Help" button bottom-left on every page (opens
  `/help?from=<page>` so answers for that page show first). It steps aside at the very bottom of a
  page where Submit buttons are, and is hidden on the game, course player, demo and when printing.
- Answers and buttons for a module that is switched off are removed automatically.

## Quick Start (module `quick-start`)

`config/quickstart.json`: one-tap buttons on the home page (top `homeCount`) and on the Help Desk
(all). Ranked by records submitted in the last 90 days from the live database, plus pinned
Incident Report and Good Catch. Re-rank by editing `last90` and the order.

## Checks

`npm run check:help`: every home link and module route has a catalog row, every answer link is a
real page, 70+ sample field questions land the right answer in the top 3, STOP WORK fires only on
critical words, module-off removes answers and links, Quick Start is ordered by use.
Add a new page? Add a row to `app/lib/help/forms.js` or the check fails.
