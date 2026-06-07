import { Array, DateTime, Option } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  compareDailyResults,
  DAILY_EPOCH_DAY_KEY,
  dailyNumber,
  dailySeed,
  dayKey,
  formatCountdown,
  formatTotalTime,
  msUntilNextLocalMidnight,
  streakTransition,
} from './daily'

const TEST_ZONE = DateTime.zoneMakeNamedUnsafe('UTC')

const localZoned = (
  year: number,
  month: number,
  day: number,
  hour: number = 12,
  minute: number = 0,
  second: number = 0,
): DateTime.Zoned =>
  DateTime.makeZonedUnsafe(
    { year, month, day, hour, minute, second },
    { timeZone: TEST_ZONE, adjustForTimeZone: true },
  )

describe('dayKey', () => {
  test('formats a local date as YYYY-MM-DD', () => {
    expect(dayKey(localZoned(2026, 6, 7))).toBe('2026-06-07')
  })

  test('zero-pads single-digit months and days', () => {
    expect(dayKey(localZoned(2026, 1, 3))).toBe('2026-01-03')
  })

  test('uses the zoned local date components', () => {
    const lateNight = localZoned(2026, 6, 7, 23, 59, 0)
    expect(dayKey(lateNight)).toBe('2026-06-07')
  })

  test('different local dates yield different keys', () => {
    expect(dayKey(localZoned(2026, 6, 7))).not.toBe(dayKey(localZoned(2026, 6, 8)))
  })
})

describe('dailySeed', () => {
  test('is deterministic for a given local date', () => {
    expect(dailySeed(localZoned(2026, 6, 7))).toBe(dailySeed(localZoned(2026, 6, 7)))
  })

  test('two zoned instants at different times of the same local day produce the same Seed', () => {
    const morning = localZoned(2026, 6, 7, 6, 30, 0)
    const evening = localZoned(2026, 6, 7, 22, 15, 0)
    expect(dailySeed(morning)).toBe(dailySeed(evening))
  })

  test('different local dates produce different Seeds', () => {
    expect(dailySeed(localZoned(2026, 6, 7))).not.toBe(dailySeed(localZoned(2026, 6, 8)))
  })

  test('returns a non-negative 32-bit integer', () => {
    Array.makeBy(30, dayOffset => dayOffset).forEach(dayOffset => {
      const seed = dailySeed(localZoned(2026, 1, 1 + dayOffset))
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0xffffffff)
    })
  })
})

describe('dailyNumber', () => {
  const epochParts = DAILY_EPOCH_DAY_KEY.split('-')
  const epochYear = Number(epochParts[0])
  const epochMonth = Number(epochParts[1])
  const epochDay = Number(epochParts[2])

  test('the epoch day is Daily #1', () => {
    expect(dailyNumber(localZoned(epochYear, epochMonth, epochDay))).toBe(1)
  })

  test('the day after the epoch is Daily #2', () => {
    expect(dailyNumber(localZoned(epochYear, epochMonth, epochDay + 1))).toBe(2)
  })

  test('counts days across a month boundary', () => {
    expect(dailyNumber(localZoned(2026, 2, 1))).toBe(
      dailyNumber(localZoned(2026, 1, 31)) + 1,
    )
  })

  test('counts days across a year boundary', () => {
    expect(dailyNumber(localZoned(2027, 1, 1))).toBe(
      dailyNumber(localZoned(2026, 12, 31)) + 1,
    )
  })

  test('two timestamps within the same local day return the same Daily number', () => {
    const morning = localZoned(2026, 6, 7, 6, 30, 0)
    const evening = localZoned(2026, 6, 7, 22, 15, 0)
    expect(dailyNumber(morning)).toBe(dailyNumber(evening))
  })

  test('is strictly increasing across consecutive days', () => {
    Array.makeBy(60, dayOffset => dayOffset).forEach(dayOffset => {
      const today = localZoned(2026, 1, 1 + dayOffset)
      const tomorrow = localZoned(2026, 1, 2 + dayOffset)
      expect(dailyNumber(tomorrow)).toBe(dailyNumber(today) + 1)
    })
  })
})

describe('parity: dailySeed/dailyNumber/dayKey are pinned for known dates', () => {
  // Per ADR-0003, the date → seed mapping is a stable contract: changing it
  // would shift which Board belongs to which date and desynchronize every
  // existing player. These values were captured against the pre-DateTime
  // implementation and must not drift.
  const cases: ReadonlyArray<
    readonly [
      string,
      readonly [number, number, number],
      { dayKey: string; dailyNumber: number; dailySeed: number },
    ]
  > = [
    ['epoch', [2026, 1, 1], { dayKey: '2026-01-01', dailyNumber: 1, dailySeed: 3734166734 }],
    ['epoch + 1', [2026, 1, 2], { dayKey: '2026-01-02', dailyNumber: 2, dailySeed: 1030113925 }],
    ['mid-Jan', [2026, 1, 15], { dayKey: '2026-01-15', dailyNumber: 15, dailySeed: 668309774 }],
    ['end of Jan', [2026, 1, 31], { dayKey: '2026-01-31', dailyNumber: 31, dailySeed: 2525810816 }],
    ['Feb 1', [2026, 2, 1], { dayKey: '2026-02-01', dailyNumber: 32, dailySeed: 3228871795 }],
    ['Feb 28', [2026, 2, 28], { dayKey: '2026-02-28', dailyNumber: 59, dailySeed: 2598569153 }],
    ['Mar 1', [2026, 3, 1], { dayKey: '2026-03-01', dailyNumber: 60, dailySeed: 2685453697 }],
    ['Jun 7', [2026, 6, 7], { dayKey: '2026-06-07', dailyNumber: 158, dailySeed: 75208860 }],
    ['Jun 8', [2026, 6, 8], { dayKey: '2026-06-08', dailyNumber: 159, dailySeed: 2183578283 }],
    ['Jun 9', [2026, 6, 9], { dayKey: '2026-06-09', dailyNumber: 160, dailySeed: 1124245452 }],
    ['Jun 10', [2026, 6, 10], { dayKey: '2026-06-10', dailyNumber: 161, dailySeed: 1191310650 }],
    ['Dec 31', [2026, 12, 31], { dayKey: '2026-12-31', dailyNumber: 365, dailySeed: 1233789294 }],
    ['next year', [2027, 1, 1], { dayKey: '2027-01-01', dailyNumber: 366, dailySeed: 2845840507 }],
    ['day before epoch', [2025, 12, 31], { dayKey: '2025-12-31', dailyNumber: 0, dailySeed: 4287893360 }],
    ['leap day', [2024, 2, 29], { dayKey: '2024-02-29', dailyNumber: -671, dailySeed: 3886451339 }],
    ['unix epoch', [1970, 1, 1], { dayKey: '1970-01-01', dailyNumber: -20453, dailySeed: 0 }],
  ]

  cases.forEach(([label, [year, month, day], expected]) => {
    test(`${label} (${expected.dayKey}) matches the pinned outputs`, () => {
      const zoned = localZoned(year, month, day)
      expect(dayKey(zoned)).toBe(expected.dayKey)
      expect(dailyNumber(zoned)).toBe(expected.dailyNumber)
      expect(dailySeed(zoned)).toBe(expected.dailySeed)
    })
  })
})

describe('streakTransition', () => {
  test('reopening on the same day leaves the streak unchanged', () => {
    expect(streakTransition(5, Option.some('2026-06-07'), '2026-06-07')).toBe(5)
  })

  test('playing on the next consecutive day increments the streak by one', () => {
    expect(streakTransition(5, Option.some('2026-06-06'), '2026-06-07')).toBe(6)
  })

  test('a one-day gap resets the streak to 1', () => {
    expect(streakTransition(5, Option.some('2026-06-05'), '2026-06-07')).toBe(1)
  })

  test('a large gap resets the streak to 1', () => {
    expect(streakTransition(12, Option.some('2026-01-01'), '2026-06-07')).toBe(1)
  })

  test('no prior play history sets the streak to 1', () => {
    expect(streakTransition(0, Option.none(), '2026-06-07')).toBe(1)
  })

  test('consecutive across a month boundary increments', () => {
    expect(streakTransition(3, Option.some('2026-01-31'), '2026-02-01')).toBe(4)
  })

  test('consecutive across a year boundary increments', () => {
    expect(streakTransition(9, Option.some('2026-12-31'), '2027-01-01')).toBe(10)
  })

  test('does not take Score as input — a low Score cannot break the streak', () => {
    // The signature is (prevStreak, lastPlayedDayKey, todayDayKey) with no
    // Score parameter, so a poor result simply cannot affect the streak.
    expect(streakTransition.length).toBe(3)
  })
})

describe('compareDailyResults', () => {
  test('higher Score ranks ahead of lower Score regardless of Total Time', () => {
    expect(
      compareDailyResults(
        { score: 5, totalTimeMs: 60_000 },
        { score: 3, totalTimeMs: 1_000 },
      ),
    ).toBeLessThan(0)
  })

  test('lower Score ranks behind higher Score', () => {
    expect(
      compareDailyResults(
        { score: 2, totalTimeMs: 1_000 },
        { score: 7, totalTimeMs: 60_000 },
      ),
    ).toBeGreaterThan(0)
  })

  test('equal Scores: the faster Total Time ranks ahead', () => {
    expect(
      compareDailyResults(
        { score: 4, totalTimeMs: 12_000 },
        { score: 4, totalTimeMs: 19_000 },
      ),
    ).toBeLessThan(0)
  })

  test('equal Scores: the slower Total Time ranks behind', () => {
    expect(
      compareDailyResults(
        { score: 4, totalTimeMs: 19_000 },
        { score: 4, totalTimeMs: 12_000 },
      ),
    ).toBeGreaterThan(0)
  })

  test('identical results compare equal', () => {
    expect(
      compareDailyResults(
        { score: 4, totalTimeMs: 12_000 },
        { score: 4, totalTimeMs: 12_000 },
      ),
    ).toBe(0)
  })

  test('sorts a leaderboard: highest Score first, faster within a Score tier', () => {
    const results = [
      { score: 3, totalTimeMs: 1_000 },
      { score: 5, totalTimeMs: 25_000 },
      { score: 5, totalTimeMs: 18_000 },
      { score: 4, totalTimeMs: 9_000 },
      { score: 5, totalTimeMs: 18_000 },
    ]
    const sorted = [...results].sort(compareDailyResults)
    expect(sorted).toEqual([
      { score: 5, totalTimeMs: 18_000 },
      { score: 5, totalTimeMs: 18_000 },
      { score: 5, totalTimeMs: 25_000 },
      { score: 4, totalTimeMs: 9_000 },
      { score: 3, totalTimeMs: 1_000 },
    ])
  })
})

describe('formatTotalTime', () => {
  test('renders seconds with one decimal place', () => {
    expect(formatTotalTime(12_345)).toBe('12.3s')
  })

  test('renders sub-second times with one decimal place', () => {
    expect(formatTotalTime(500)).toBe('0.5s')
  })

  test('renders zero as 0.0s', () => {
    expect(formatTotalTime(0)).toBe('0.0s')
  })

  test('rounds half-second boundaries to one decimal', () => {
    expect(formatTotalTime(1_550)).toBe('1.6s')
  })
})

describe('msUntilNextLocalMidnight', () => {
  const MS_PER_HOUR = 60 * 60 * 1000
  const MS_PER_MINUTE = 60 * 1000

  test('one hour before local midnight returns one hour in ms', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 6, 7, 23, 0, 0))).toBe(MS_PER_HOUR)
  })

  test('at local midnight returns a full day in ms', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 6, 7, 0, 0, 0))).toBe(
      24 * MS_PER_HOUR,
    )
  })

  test('one second before local midnight returns one second in ms', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 6, 7, 23, 59, 59))).toBe(1_000)
  })

  test('midday returns twelve hours in ms', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 6, 7, 12, 0, 0))).toBe(
      12 * MS_PER_HOUR,
    )
  })

  test('two minutes before local midnight returns two minutes in ms', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 6, 7, 23, 58, 0))).toBe(
      2 * MS_PER_MINUTE,
    )
  })

  test('crosses a month boundary correctly', () => {
    expect(msUntilNextLocalMidnight(localZoned(2026, 1, 31, 23, 30, 0))).toBe(
      30 * MS_PER_MINUTE,
    )
  })

  test('returns a strictly positive value for any moment within a local day', () => {
    Array.makeBy(24, hour => hour).forEach(hour => {
      const sample = localZoned(2026, 6, 7, hour, 17, 0)
      expect(msUntilNextLocalMidnight(sample)).toBeGreaterThan(0)
      expect(msUntilNextLocalMidnight(sample)).toBeLessThanOrEqual(24 * MS_PER_HOUR)
    })
  })
})

describe('formatCountdown', () => {
  test('formats an hours/minutes/seconds duration as HH:MM:SS', () => {
    const oneHour = 60 * 60 * 1000
    const oneMinute = 60 * 1000
    expect(formatCountdown(2 * oneHour + 34 * oneMinute + 56 * 1000)).toBe('02:34:56')
  })

  test('zero-pads single-digit hours, minutes, and seconds', () => {
    expect(formatCountdown(9 * 1000)).toBe('00:00:09')
  })

  test('renders zero as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
  })

  test('clamps negative durations to 00:00:00', () => {
    expect(formatCountdown(-5_000)).toBe('00:00:00')
  })

  test('floors sub-second remainder', () => {
    expect(formatCountdown(1_999)).toBe('00:00:01')
  })

  test('formats a full day as 24:00:00', () => {
    expect(formatCountdown(24 * 60 * 60 * 1000)).toBe('24:00:00')
  })
})
