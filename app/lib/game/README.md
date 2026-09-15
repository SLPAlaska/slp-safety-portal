# Run the Job — decks

`decks.json` is the entire content of the game. Adding an SOP is an edit to this
file: no engine change, no route change, no migration. The page, the score
validator (`app/api/game/run`) and the standings route all read the same file.

## Shape

```jsonc
{
  "id": "offload",                    // stable key — see the warning below
  "title": "ACB OFFLOAD",             // deck button + standings heading
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

## Rules that matter

- **`id` is permanent.** It is written into `lms_game_runs.deck_id` on every
  completed run. Rename one and that deck's standings silently start over with
  the history stranded under the old key. Retiring a deck is fine — pull it from
  this file and old rows simply stop being read.
- **Ids must be unique.** Nothing enforces it; a duplicate makes the second deck
  unreachable and mixes its scores into the first one's board.
- **The API re-derives the score ceiling from this file.** A deck with more
  steps or a higher par automatically allows a higher payout — no second place
  to update.
- **The prose is the training.** These decks are transcribed from MagTec's
  controlled SOPs. When an SOP is revised, update `meta` along with the steps so
  a player can tell which revision they were graded against.

## After editing

`npm run build` is enough — the JSON is bundled, not fetched. Nothing to deploy
on the Supabase side; the Edge Function does not read this file.
