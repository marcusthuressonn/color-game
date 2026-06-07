import { Array } from 'effect'
import { describe, expect, test } from 'vitest'

import { type Prng, makePrng, nextFloat, nextInt } from './prng'

const drawFloats = (seed: number, count: number): ReadonlyArray<number> => {
  let stream: Prng = makePrng(seed)
  return Array.makeBy(count, () => {
    const [value, next] = nextFloat(stream)
    stream = next
    return value
  })
}

describe('PRNG', () => {
  describe('determinism', () => {
    test('the same Seed yields the same sequence', () => {
      expect(drawFloats(12345, 20)).toEqual(drawFloats(12345, 20))
    })

    test('different Seeds yield different sequences', () => {
      expect(drawFloats(12345, 20)).not.toEqual(drawFloats(67890, 20))
    })
  })

  describe('nextFloat', () => {
    test('returns values in [0, 1)', () => {
      drawFloats(99, 200).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      })
    })

    test('does not mutate the input PRNG', () => {
      const prng = makePrng(7)
      const [firstA] = nextFloat(prng)
      const [firstB] = nextFloat(prng)
      expect(firstA).toBe(firstB)
    })
  })

  describe('nextInt', () => {
    test('returns integers in [min, max)', () => {
      let stream = makePrng(42)
      Array.makeBy(200, () => 0).forEach(() => {
        const [value, next] = nextInt(stream, 0, 25)
        stream = next
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(25)
      })
    })

    test('covers the full range over many draws', () => {
      let stream = makePrng(1)
      const seen = new Set<number>()
      Array.makeBy(500, () => 0).forEach(() => {
        const [value, next] = nextInt(stream, 0, 5)
        stream = next
        seen.add(value)
      })
      expect(seen.size).toBe(5)
    })
  })
})
