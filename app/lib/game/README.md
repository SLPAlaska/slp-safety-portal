# Run the Job — content files

Two data files hold everything the game says. Adding an SOP or a handbook
question is an edit to one of them: no engine change, no route change, no
migration.

| File | What it holds |
| --- | --- |
| `decks.json` | The SOP-order decks (the main game) |
| `quickhits.json` | The ASH question bank (the Safety Pull) |

Both are read by the page, by the score validators in `app/api/game/*`, and by
the featured-deck rotation. `engine.js` never hardcodes either one.

---

## decks.json

```jsonc
{
  "id": "offload",                    // stable key — see the warning below
  "title": "ACB OFFLOAD",             // deck button, standings heading, email
  "sub": "DS 1B G&I FACILITY",        // one line under the title
  "meta": "SOP v5.0 · Rev. 11/18/2025 · Approved D. Redick · Drill site to demob",
  "par": 300,                         // seconds; each second under par pays +2
  "phases": [
    {
      "name": "ROLL OUT",
      "steps": [
        {
          "t": "Get the North Slope Manifest from the mud engineer …",
          "w": "You left the rig with no manifest. DS 1B turns you around …"
        }
      ]
    }
  ]
}
```

- **`t`** is the step as the player taps it. Steps are shuffled and must be
  played in written order, so the array order IS the answer key.
- **`w`** is what shows on the WRONG CALL overlay when this step is played out
  of turn. Write the consequence, not a scolding — it is the only teaching the
  game does.
- **`par`** sets the time bonus and the score ceiling the API will accept. Time
  a realistic clean run and round up; too low just means nobody earns the bonus.

### Rules that matter

- **`id` is permanent.** It is written into `lms_game_runs.deck_id` and
  `lms_game_drawing_entries.deck_id` on every completed run. Rename one and that
  deck's standings silently start over with the history stranded under the old
  key. Retiring a deck is fine — pull it from this file and old rows simply stop
  being read.
- **Ids must be unique.** Nothing enforces it; a duplicate makes the second deck
  unreachable and mixes its scores into the first one's board.
- **Deck order is the rotation order.** The featured deck of the week is
  `week index modulo deck count` into this array, so inserting a deck in the
  middle reshuffles which deck is featured in which future week. Appending at
  the end is the low-surprise move.
- **The API re-derives the score ceiling from this file.** A deck with more
  steps or a higher par automatically allows a higher payout — no second place
  to update.
- **The prose is the training.** These decks are transcribed from MagTec's
  controlled SOPs. When an SOP is revised, update `meta` along with the steps so
  a player can tell which revision they were graded against.

---

## quickhits.json

```jsonc
{
  "q": "Noise in your work area exceeds 100 dBA. Required hearing protection:",
  "o": ["Earplugs OR muffs", "Earplugs AND muffs — double protection",
        "Muffs only", "Limit exposure to 2 hours"],
  "a": 1,                             // index into "o" of the right answer
  "why": "Over 82 dBA takes single protection; over 100 dBA takes double — plugs
          and muffs together. (ASH — Industrial Hygiene)"
}
```

- **Exactly four options.** The engine renders whatever is in `o`, but the
  layout and the 15-second clock are built around four.
- **`a` is an index, not a label.** Reordering `o` without moving `a` silently
  makes the question wrong — and a wrong answer in a safety quiz is worse than
  no question at all. Check `a` after any edit to `o`.
- **`why` shows on every answer, right or wrong**, so it has to teach on its
  own. Name the ASH section in it, the way every existing entry does: that
  citation is what lets someone go read the actual rule.
- Five questions are drawn at random per pull, so the bank only needs to be
  bigger than five — but the wider it is, the less the pull repeats.

---

## After editing

`npm run build` is enough — both files are bundled, not fetched.

One thing to know about a **new deck**: the reminder email names the featured
deck, and an Edge Function cannot import this directory. The portal publishes
the id+title roster into `lms_game_config.deck_rotation` whenever anyone opens
the game, and the email reads it from there. So a deck added on Friday with
nobody playing over the weekend could have Monday's email naming the old
rotation. Open `/game` once after adding a deck and that is settled.
