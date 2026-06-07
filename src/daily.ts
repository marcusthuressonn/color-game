/**
 * Pure, Effect-free, DOM-free date helpers for the Daily Challenge.
 *
 * All functions take an explicit `Date` so callers must inject the clock — no
 * ambient wall-clock reads here (see ADR-0003).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

const SEED_MIX_MULTIPLIER_FIRST = 0x85ebca6b
const SEED_MIX_MULTIPLIER_SECOND = 0xc2b2ae35
const SEED_MIX_SHIFT = 16

const toUint32 = (value: number): number => value >>> 0

const pad2 = (value: number): string => value.toString().padStart(2, '0')

/**
 * Canonical local-date `YYYY-MM-DD` string. The contract behind the Daily
 * Challenge's "one attempt per local day" rule and the storage key for
 * same-day comparisons.
 */
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/**
 * The epoch the Daily counter starts from. The local date on this `dayKey` is
 * Daily #1.
 */
export const DAILY_EPOCH_DAY_KEY = '2026-01-01'

const localMidnightUtcMs = (date: Date): number =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

const dayKeyToMidnightUtcMs = (key: string): number => {
  const parts = key.split('-')
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

const DAILY_EPOCH_MS = dayKeyToMidnightUtcMs(DAILY_EPOCH_DAY_KEY)

/**
 * The "Daily #N" index for the given local date, where the epoch day is #1.
 * Dates before the epoch return non-positive numbers; callers above the epoch
 * needn't worry about that case.
 */
export const dailyNumber = (date: Date): number =>
  Math.floor((localMidnightUtcMs(date) - DAILY_EPOCH_MS) / MS_PER_DAY) + 1

/**
 * Derive a deterministic Seed from the player's local calendar date so every
 * player on a given day faces the same Boards (ADR-0003). Two `Date` instances
 * within the same local day collapse to the same Seed.
 */
export const dailySeed = (date: Date): number => {
  const day = localMidnightUtcMs(date) / MS_PER_DAY
  let mixed = toUint32(day)
  mixed = Math.imul(mixed ^ (mixed >>> SEED_MIX_SHIFT), SEED_MIX_MULTIPLIER_FIRST)
  mixed = Math.imul(mixed ^ (mixed >>> SEED_MIX_SHIFT), SEED_MIX_MULTIPLIER_SECOND)
  return toUint32(mixed ^ (mixed >>> SEED_MIX_SHIFT))
}
