/**
 * Pure, Effect-DateTime-based date helpers for the Daily Challenge.
 *
 * Functions take a `DateTime.Zoned` so the time zone is an explicit input
 * (typically threaded from `DateTime.nowInCurrentZone` at a runtime seam),
 * never an ambient system-zone read (see ADR-0003).
 */

import { DateTime, Duration, Option } from 'effect'

const SEED_MIX_MULTIPLIER_FIRST = 0x85ebca6b
const SEED_MIX_MULTIPLIER_SECOND = 0xc2b2ae35
const SEED_MIX_SHIFT = 16

const toUint32 = (value: number): number => value >>> 0

/**
 * Canonical local-date `YYYY-MM-DD` string for the given zoned instant. The
 * contract behind the Daily Challenge's "one attempt per local day" rule and
 * the storage key for same-day comparisons.
 */
export const dayKey = (zoned: DateTime.Zoned): string => DateTime.formatIsoDate(zoned)

/**
 * The epoch the Daily counter starts from. The local date on this `dayKey` is
 * Daily #1.
 */
export const DAILY_EPOCH_DAY_KEY = '2026-01-01'

const EPOCH_UTC = DateTime.makeUnsafe(0)

const DAILY_EPOCH = DateTime.makeUnsafe(DAILY_EPOCH_DAY_KEY)

const localDateUtcMidnight = (zoned: DateTime.Zoned): DateTime.Utc => {
  const { year, month, day } = DateTime.toParts(zoned)
  return DateTime.makeUnsafe({ year, month, day })
}

const dayKeyUtcMidnight = (key: string): DateTime.Utc => DateTime.makeUnsafe(key)

const daysBetween = (from: DateTime.DateTime, to: DateTime.DateTime): number =>
  Math.round(Duration.toDays(DateTime.distance(from, to)))

/**
 * The "Daily #N" index for the given local date, where the epoch day is #1.
 * Dates before the epoch return non-positive numbers; callers above the epoch
 * needn't worry about that case.
 */
export const dailyNumber = (zoned: DateTime.Zoned): number =>
  daysBetween(DAILY_EPOCH, localDateUtcMidnight(zoned)) + 1

/**
 * Derive a deterministic Seed from the player's local calendar date so every
 * player on a given day faces the same Boards (ADR-0003). Two zoned instants
 * within the same local day collapse to the same Seed.
 */
export const dailySeed = (zoned: DateTime.Zoned): number => {
  const dayCount = daysBetween(EPOCH_UTC, localDateUtcMidnight(zoned))
  let mixed = toUint32(dayCount)
  mixed = Math.imul(mixed ^ (mixed >>> SEED_MIX_SHIFT), SEED_MIX_MULTIPLIER_FIRST)
  mixed = Math.imul(mixed ^ (mixed >>> SEED_MIX_SHIFT), SEED_MIX_MULTIPLIER_SECOND)
  return toUint32(mixed ^ (mixed >>> SEED_MIX_SHIFT))
}

/**
 * Pure transition from a previous Streak + last-played day to the Streak that
 * applies on `todayDayKey`. Three cases:
 *
 *   - same day reopened (last === today) → unchanged
 *   - exactly the next consecutive day (today − last = 1 day) → prev + 1
 *   - no prior play, or a gap of one or more missed days → reset to 1
 *
 * The function never takes a Score: a low Score never breaks the Streak — only
 * a missed day does.
 */
export const streakTransition = (
  prevStreak: number,
  lastPlayedDayKey: Option.Option<string>,
  todayDayKey: string,
): number =>
  Option.match(lastPlayedDayKey, {
    onNone: () => 1,
    onSome: lastKey => {
      if (lastKey === todayDayKey) return prevStreak
      const gapDays = daysBetween(
        dayKeyUtcMidnight(lastKey),
        dayKeyUtcMidnight(todayDayKey),
      )
      return gapDays === 1 ? prevStreak + 1 : 1
    },
  })

/**
 * A Daily result viewed through the ranking lens: just the two axes that
 * order the leaderboard, nothing more.
 */
export type DailyResult = {
  score: number
  totalTimeMs: number
}

/**
 * Order two Daily results: higher Score ranks ahead, and equal Scores are
 * broken by Total Time (faster ranks ahead). Suitable as an Array.sort
 * comparator — negative when `a` ranks ahead of `b`.
 */
export const compareDailyResults = (a: DailyResult, b: DailyResult): number =>
  a.score !== b.score ? b.score - a.score : a.totalTimeMs - b.totalTimeMs

/**
 * Format a Total Time as a player-facing string: seconds with one decimal
 * place (e.g. `12.3s`).
 */
export const formatTotalTime = (totalTimeMs: number): string =>
  `${(totalTimeMs / 1000).toFixed(1)}s`

/**
 * Milliseconds remaining from `zoned` until the next local midnight. At local
 * midnight itself, returns a full day's worth of milliseconds (the clock
 * just rolled, so the next midnight is 24 hours away). Used to drive the
 * Daily result-screen countdown.
 */
export const msUntilNextLocalMidnight = (zoned: DateTime.Zoned): number => {
  const nextMidnight = zoned.pipe(
    DateTime.add({ days: 1 }),
    DateTime.startOf('day'),
  )
  return Duration.toMillis(DateTime.distance(zoned, nextMidnight))
}

const pad2 = (value: number): string => value.toString().padStart(2, '0')

/**
 * Format a millisecond duration as a player-facing `HH:MM:SS` countdown.
 * Negative or sub-second values clamp to `00:00:00`. Used to render the
 * Daily result-screen "Next Daily in" countdown.
 */
export const formatCountdown = (ms: number): string => {
  const clamped = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = clamped % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}
