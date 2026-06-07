import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { beforeEach, describe, expect, test } from 'vitest'

import { BEST_SCORE_KEY, loadBestScore, saveBestScore } from './persistence'

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
})
