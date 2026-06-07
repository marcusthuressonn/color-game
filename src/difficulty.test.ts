import { Array } from 'effect'
import { describe, expect, test } from 'vitest'

import { FLOOR_DELTA, STARTING_DELTA, delta } from './difficulty'

describe('Difficulty curve', () => {
  test('delta(0) starts at STARTING_DELTA', () => {
    expect(delta(0)).toBeCloseTo(STARTING_DELTA, 10)
  })

  test('is monotonic non-increasing across rounds', () => {
    Array.makeBy(63, roundIndex => roundIndex).forEach(roundIndex => {
      expect(delta(roundIndex + 1)).toBeLessThanOrEqual(delta(roundIndex))
    })
  })

  test('eventually decays to the floor and never below', () => {
    Array.makeBy(64, roundIndex => roundIndex).forEach(roundIndex => {
      expect(delta(roundIndex)).toBeGreaterThanOrEqual(FLOOR_DELTA)
    })
    expect(delta(10_000)).toBeCloseTo(FLOOR_DELTA, 10)
  })

  test('is deterministic — same roundIndex returns the same delta', () => {
    Array.makeBy(16, roundIndex => roundIndex).forEach(roundIndex => {
      expect(delta(roundIndex)).toBe(delta(roundIndex))
    })
  })

  test('actually shrinks — a later round is strictly smaller than round 0 (above floor)', () => {
    expect(delta(5)).toBeLessThan(delta(0))
  })
})
