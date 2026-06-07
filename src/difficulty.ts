/**
 * Difficulty curve: maps a Round index to the perceptual lightness distance
 * between the Target and the rest of the Board for that Round. Shrinks
 * each Round, clamped to a floor so the game stays playable indefinitely.
 *
 * The shape and constants are deferred to playtesting (per PRD #1) and
 * the curve is swappable — only this module references them.
 */

/** Starting perceptual lightness delta at Round 0. */
export const STARTING_DELTA = 0.1

/** Lower bound: the curve never decays below this. */
export const FLOOR_DELTA = 0.012

/** Per-Round geometric decay factor applied to the starting delta. */
export const DECAY_RATE = 0.92

/** A pluggable Round → distance function. */
export type Curve = (roundIndex: number) => number

/**
 * Default curve: geometric decay from STARTING_DELTA toward FLOOR_DELTA.
 * Pure: `delta(r)` always returns the same value for a given `r`.
 */
export const delta: Curve = (roundIndex: number): number => {
  const decayed = STARTING_DELTA * Math.pow(DECAY_RATE, roundIndex)
  return Math.max(FLOOR_DELTA, decayed)
}
