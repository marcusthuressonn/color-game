import { Array, Option } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  DAILY_EPOCH_DAY_KEY,
  dailyNumber,
  dailySeed,
  dayKey,
  streakTransition,
} from './daily'

const localDate = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day, 12, 0, 0, 0)

describe('dayKey', () => {
  test('formats a local date as YYYY-MM-DD', () => {
    expect(dayKey(localDate(2026, 6, 7))).toBe('2026-06-07')
  })

  test('zero-pads single-digit months and days', () => {
    expect(dayKey(localDate(2026, 1, 3))).toBe('2026-01-03')
  })

  test('uses the local date components, not UTC', () => {
    const lateNight = new Date(2026, 5, 7, 23, 59, 0, 0)
    expect(dayKey(lateNight)).toBe('2026-06-07')
  })

  test('different local dates yield different keys', () => {
    expect(dayKey(localDate(2026, 6, 7))).not.toBe(dayKey(localDate(2026, 6, 8)))
  })
})

describe('dailySeed', () => {
  test('is deterministic for a given local date', () => {
    expect(dailySeed(localDate(2026, 6, 7))).toBe(dailySeed(localDate(2026, 6, 7)))
  })

  test('two Date instances at different times of the same local day produce the same Seed', () => {
    const morning = new Date(2026, 5, 7, 6, 30, 0, 0)
    const evening = new Date(2026, 5, 7, 22, 15, 0, 0)
    expect(dailySeed(morning)).toBe(dailySeed(evening))
  })

  test('different local dates produce different Seeds', () => {
    expect(dailySeed(localDate(2026, 6, 7))).not.toBe(dailySeed(localDate(2026, 6, 8)))
  })

  test('returns a non-negative 32-bit integer', () => {
    Array.makeBy(30, dayOffset => dayOffset).forEach(dayOffset => {
      const seed = dailySeed(localDate(2026, 1, 1 + dayOffset))
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
    expect(dailyNumber(localDate(epochYear, epochMonth, epochDay))).toBe(1)
  })

  test('the day after the epoch is Daily #2', () => {
    expect(dailyNumber(localDate(epochYear, epochMonth, epochDay + 1))).toBe(2)
  })

  test('counts days across a month boundary', () => {
    expect(dailyNumber(localDate(2026, 2, 1))).toBe(
      dailyNumber(localDate(2026, 1, 31)) + 1,
    )
  })

  test('counts days across a year boundary', () => {
    expect(dailyNumber(localDate(2027, 1, 1))).toBe(
      dailyNumber(localDate(2026, 12, 31)) + 1,
    )
  })

  test('two timestamps within the same local day return the same Daily number', () => {
    const morning = new Date(2026, 5, 7, 6, 30, 0, 0)
    const evening = new Date(2026, 5, 7, 22, 15, 0, 0)
    expect(dailyNumber(morning)).toBe(dailyNumber(evening))
  })

  test('is strictly increasing across consecutive days', () => {
    Array.makeBy(60, dayOffset => dayOffset).forEach(dayOffset => {
      const today = localDate(2026, 1, 1 + dayOffset)
      const tomorrow = localDate(2026, 1, 2 + dayOffset)
      expect(dailyNumber(tomorrow)).toBe(dailyNumber(today) + 1)
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
