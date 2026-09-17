// app/lib/game/flags.js
//
// Launch switches for Run the Job, read out of lms_game_config.
//
// Both flags default to FALSE when the row is missing, unreadable, or holds
// anything unrecognized. That direction matters: the failure mode of a config
// read going wrong should be "the thing that is not launched yet stays not
// launched", never "a board nobody has reviewed appears" or "a mass email
// gains a section". Fail closed, like every other gate in this repo.
//
// Flipping a row to 'true' is the launch action. It takes effect on the next
// read — no deploy, and no cron edit.
//
// Mirrored by hand in supabase/functions/send-training-reminders/index.ts:
// Edge Functions bundle from their own directory and cannot import from
// app/lib. If the truthy set or the default changes here, change it there too.

/** The strings that count as on. Anything else — including NULL — is off. */
const TRUTHY = new Set(['true', 't', '1', 'yes', 'on'])

export const GAME_EMAIL_ENABLED = 'game_email_enabled'
export const CREW_STANDINGS_ENABLED = 'crew_standings_enabled'

export function isOn(value) {
  return TRUTHY.has(String(value ?? '').trim().toLowerCase())
}

/**
 * Read one flag. False on any error — a config table that will not answer must
 * not be able to turn something on.
 */
export async function readFlag(supabase, key) {
  try {
    const { data, error } = await supabase
      .from('lms_game_config')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) {
      console.error(`game flag read failed for ${key}:`, error.message)
      return false
    }
    return isOn(data?.value)
  } catch (err) {
    console.error(`game flag read failed for ${key}:`, err.message)
    return false
  }
}
