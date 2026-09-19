// app/lib/daSelection.js
//
// The selection arithmetic and the draw itself for the random drug and alcohol
// testing module. Pure functions with no database and no network, so the part
// an auditor will question can be run and checked on its own.
//
// COMPLIANCE ANCHORS
//
// 49 CFR Part 40 (procedures) and Part 382 (FMCSA random testing). The 2026
// DOT minimum annual random rates are FMCSA 50% drug / 10% alcohol, unchanged
// since 2020; PHMSA 50% drug with no alcohol random requirement; FAA 25/10;
// FTA 50/10. Rates live in da_programs rather than here because DOT revisits
// them annually and a rate change must not need a deploy.
//
// FOUR RULES THAT SHAPE THIS FILE
//
// 1. DOT and non-DOT employees are drawn from SEPARATE pools and never in the
//    same run. Combining several DOT agencies into one DOT pool is allowed;
//    combining DOT with non-DOT is not. Nothing here ever receives a mixed
//    list — the caller selects one pool.
// 2. The draw must be scientifically valid random: a cryptographic RNG, every
//    active member equally likely every time.
// 3. Prior selection does not exclude anyone from a later pull. Someone can be
//    drawn in consecutive periods; that is correct, not a bug to smooth away.
// 4. Drug and alcohol are drawn INDEPENDENTLY from the same pool. Anyone drawn
//    in both is recorded once as 'both' — not twice, and not bumped from one.

export const PERIODS_PER_YEAR = { monthly: 12, quarterly: 4 }

/** Draw counts per pull for a given annual rate. */
export function drawCount(poolSize, annualRatePercent, frequency) {
  const periods = PERIODS_PER_YEAR[frequency]
  if (!periods) throw new Error(`unknown frequency: ${frequency}`)
  if (!Number.isFinite(poolSize) || poolSize <= 0) return 0
  const rate = Number(annualRatePercent)
  if (!Number.isFinite(rate) || rate <= 0) return 0
  // Rounding UP every period is the default and the safe posture in an FMCSA
  // audit: it can only overshoot the annual minimum, never undershoot it.
  // Rounding down 12 times is how a programme finishes the year below rate.
  const n = Math.ceil((poolSize * rate / 100) / periods)
  // Never ask for more people than exist.
  return Math.min(n, poolSize)
}

/**
 * Cryptographically random integer in [0, max), rejection-sampled.
 *
 * Modulo on a random 32-bit value biases toward the low end whenever max does
 * not divide 2^32, which would make some employees fractionally likelier than
 * others. For a legal requirement of equal probability that is worth a retry
 * loop. Uses globalThis.crypto, available in Node 18+ and in browsers.
 */
function randomInt(max) {
  if (max <= 0) throw new Error('max must be positive')
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let v
  do {
    globalThis.crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= limit)
  return v % max
}

/**
 * Uniform sample of `n` distinct items, by partial Fisher-Yates on a copy.
 *
 * Every subset of the pool is equally likely, and the input array is not
 * mutated, so two independent draws from the same pool really are independent.
 */
export function sampleWithoutReplacement(items, n) {
  const pool = [...items]
  const take = Math.max(0, Math.min(n, pool.length))
  for (let i = 0; i < take; i++) {
    const j = i + randomInt(pool.length - i)
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t
  }
  return pool.slice(0, take)
}

export const RNG_METHOD_NOTE =
  'crypto.getRandomValues (CSPRNG), rejection-sampled to remove modulo bias, ' +
  'partial Fisher-Yates without replacement. Drug and alcohol drawn ' +
  'independently from the full active pool; prior selection does not exclude.'

/** 'monthly' -> '2026-10'; 'quarterly' -> '2026-Q4'. */
export function periodLabel(frequency, date = new Date()) {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  if (frequency === 'monthly') return `${y}-${String(m).padStart(2, '0')}`
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`
}

/**
 * The rates that apply to a pool.
 *
 * v2: rates live on the POOL, not on a per-company programme row, because a
 * consortium applies its rate to the COMBINED pool. A DOT pool carries the
 * agency too; PHMSA is expressed as alcohol_rate 0 rather than as a special
 * case here, since Part 199 has no random alcohol requirement at all.
 */
export function ratesFor(pool) {
  return {
    drug: Number(pool.drug_rate),
    alcohol: Number(pool.alcohol_rate),
    agency: pool.pool_kind === 'DOT' ? (pool.dot_agency || null) : null,
  }
}

/**
 * Run one selection.
 *
 * @param members  active members of ONE pool. In a consortium pool these span
 *                 several employers, which is the point - the rate applies to
 *                 the combined pool - but they are all the same pool_kind.
 *                 Mixing DOT and non-DOT here would be a Part 40 violation.
 * @returns { drugIds, alcoholIds, selections: [{ member_id, test_type }],
 *            drugCount, alcoholCount, poolSize }
 */
export function runSelection({ members, pool }) {
  const rates = ratesFor(pool)
  const ids = members.map(m => m.id)
  const poolSize = ids.length

  const drugCount = drawCount(poolSize, rates.drug, pool.frequency)
  const alcoholCount = drawCount(poolSize, rates.alcohol, pool.frequency)

  // Two independent draws from the same full pool, exactly as Part 382
  // contemplates. Not a drug draw followed by an alcohol draw from the
  // leftovers — that would make the two dependent.
  const drugIds = sampleWithoutReplacement(ids, drugCount)
  const alcoholIds = sampleWithoutReplacement(ids, alcoholCount)

  const drug = new Set(drugIds)
  const alcohol = new Set(alcoholIds)
  const selections = []
  for (const id of new Set([...drugIds, ...alcoholIds])) {
    const inD = drug.has(id), inA = alcohol.has(id)
    selections.push({ member_id: id, test_type: inD && inA ? 'both' : (inD ? 'drug' : 'alcohol') })
  }

  return { drugIds, alcoholIds, selections, drugCount, alcoholCount, poolSize, rates }
}

/**
 * Year-to-date position against the annual minimum, so the last periods of a
 * year can be adjusted upward to guarantee the rate is met.
 *
 * `required` uses the average pool size across the year's pulls, which is what
 * an MIS report is built from — not today's pool size, which may have moved a
 * long way since January.
 */
export function ytdSummary({ pulls, completedDrug, completedAlcohol, rates }) {
  if (!pulls || pulls.length === 0) {
    return { avgPoolSize: 0, requiredDrug: 0, requiredAlcohol: 0,
             completedDrug: 0, completedAlcohol: 0, drugShortfall: 0, alcoholShortfall: 0 }
  }
  const avgPoolSize = pulls.reduce((s, p) => s + (p.pool_size_at_pull || 0), 0) / pulls.length
  const requiredDrug = Math.ceil(avgPoolSize * Number(rates.drug) / 100)
  const requiredAlcohol = Math.ceil(avgPoolSize * Number(rates.alcohol) / 100)
  return {
    avgPoolSize: Math.round(avgPoolSize * 10) / 10,
    requiredDrug, requiredAlcohol,
    completedDrug, completedAlcohol,
    drugShortfall: Math.max(0, requiredDrug - completedDrug),
    alcoholShortfall: Math.max(0, requiredAlcohol - completedAlcohol),
  }
}
