import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  BEST_SCORE_KEY,
  DAILY_RECORD_KEY,
  type DailyRecord,
  loadBestScore,
  loadDailyRecord,
  saveBestScore,
  saveDailyRecord,
} from './persistence'

const provide = <A>(effect: Effect.Effect<A, never, KeyValueStore.KeyValueStore>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(BrowserKeyValueStore.layerLocalStorage)),
  )

describe('Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('loadBestScore returns None when no value is stored', async () => {
    const result = await provide(loadBestScore)
    expect(result).toStrictEqual(Option.none())
  })

  test('saveBestScore writes a number that loadBestScore reads back', async () => {
    await provide(saveBestScore(7))
    const result = await provide(loadBestScore)
    expect(result).toStrictEqual(Option.some(7))
  })

  test('saveBestScore overwrites the previous best Score', async () => {
    await provide(saveBestScore(3))
    await provide(saveBestScore(12))
    const result = await provide(loadBestScore)
    expect(result).toStrictEqual(Option.some(12))
  })

  test('loadBestScore returns None when stored value is not a valid number', async () => {
    localStorage.setItem(BEST_SCORE_KEY, 'not-a-number')
    const result = await provide(loadBestScore)
    expect(result).toStrictEqual(Option.none())
  })

  test('loadDailyRecord returns None when no value is stored', async () => {
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.none())
  })

  test('saveDailyRecord writes a record that loadDailyRecord reads back', async () => {
    const record: DailyRecord = {
      dayKey: '2026-06-07',
      dailyNumber: 158,
      seed: 12345,
      score: 4,
      streak: 1,
    }
    await provide(saveDailyRecord(record))
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.some(record))
  })

  test('saveDailyRecord overwrites the previous Daily record', async () => {
    await provide(
      saveDailyRecord({
        dayKey: '2026-06-06',
        dailyNumber: 157,
        seed: 1,
        score: 0,
        streak: 4,
      }),
    )
    const replacement: DailyRecord = {
      dayKey: '2026-06-07',
      dailyNumber: 158,
      seed: 9,
      score: 6,
      streak: 5,
    }
    await provide(saveDailyRecord(replacement))
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.some(replacement))
  })

  test('saveDailyRecord persists the streak across reloads', async () => {
    const record: DailyRecord = {
      dayKey: '2026-06-07',
      dailyNumber: 158,
      seed: 1,
      score: 3,
      streak: 12,
    }
    await provide(saveDailyRecord(record))
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.some(record))
  })

  test('loadDailyRecord returns None when stored value is not valid JSON', async () => {
    localStorage.setItem(DAILY_RECORD_KEY, '{not-json}')
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.none())
  })

  test('loadDailyRecord returns None when stored JSON is missing required fields', async () => {
    localStorage.setItem(DAILY_RECORD_KEY, '{"dayKey":"2026-06-07"}')
    const result = await provide(loadDailyRecord)
    expect(result).toStrictEqual(Option.none())
  })
})
