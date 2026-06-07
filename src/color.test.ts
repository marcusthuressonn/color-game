import { describe, expect, test } from 'vitest'

import {
  type OkLch,
  type Srgb,
  deltaEok,
  isInGamut,
  offsetLightness,
  oklchToSrgb,
  srgbToCss,
  srgbToOklch,
} from './color'

const APPROX_EPSILON = 1e-3
const DISTANCE_EPSILON = 1e-4

const samples: ReadonlyArray<OkLch> = [
  { L: 0.6, C: 0.08, h: 30 },
  { L: 0.5, C: 0.08, h: 120 },
  { L: 0.7, C: 0.05, h: 220 },
  { L: 0.4, C: 0.08, h: 300 },
]

describe('Color', () => {
  describe('oklchToSrgb / srgbToOklch', () => {
    test('round-trips OKLCH through sRGB within tolerance', () => {
      samples.forEach(color => {
        const back = srgbToOklch(oklchToSrgb(color))
        expect(back.L).toBeCloseTo(color.L, 3)
        expect(back.C).toBeCloseTo(color.C, 3)
        expect(((back.h - color.h + 540) % 360) - 180).toBeLessThan(APPROX_EPSILON)
      })
    })

    test('keeps sRGB channels inside [0, 1] for mid-range OKLCH samples', () => {
      samples.forEach(color => {
        const srgb = oklchToSrgb(color)
        const channels: ReadonlyArray<number> = [srgb.r, srgb.g, srgb.b]
        channels.forEach(channel => {
          expect(channel).toBeGreaterThanOrEqual(0)
          expect(channel).toBeLessThanOrEqual(1)
        })
      })
    })
  })

  describe('deltaEok', () => {
    test('returns zero for identical colors', () => {
      const color: OkLch = { L: 0.5, C: 0.1, h: 200 }
      expect(deltaEok(color, color)).toBeLessThan(DISTANCE_EPSILON)
    })

    test('is symmetric', () => {
      const a: OkLch = { L: 0.5, C: 0.1, h: 100 }
      const b: OkLch = { L: 0.4, C: 0.12, h: 110 }
      expect(deltaEok(a, b)).toBeCloseTo(deltaEok(b, a), 10)
    })

    test('matches the Euclidean OKLab distance for a known pair', () => {
      const a: OkLch = { L: 0.6, C: 0, h: 0 }
      const b: OkLch = { L: 0.5, C: 0, h: 0 }
      expect(deltaEok(a, b)).toBeCloseTo(0.1, 6)
    })
  })

  describe('offsetLightness', () => {
    test('produces a color whose distance from the base matches the requested magnitude', () => {
      const base: OkLch = { L: 0.6, C: 0.1, h: 200 }
      const offset = offsetLightness(base, 0.05)
      expect(deltaEok(base, offset)).toBeCloseTo(0.05, 6)
    })

    test('keeps the resulting color in sRGB gamut for mid-range bases', () => {
      const base: OkLch = { L: 0.55, C: 0.08, h: 150 }
      const offset = offsetLightness(base, 0.07)
      expect(isInGamut(offset)).toBe(true)
    })

    test('clamps the lightness to [0, 1]', () => {
      const base: OkLch = { L: 0.95, C: 0.05, h: 30 }
      const offset = offsetLightness(base, 0.5)
      expect(offset.L).toBeLessThanOrEqual(1)
      expect(offset.L).toBeGreaterThanOrEqual(0)
    })
  })

  describe('srgbToCss', () => {
    test('formats an sRGB color as an rgb(...) string', () => {
      const srgb: Srgb = { r: 0.5, g: 0.25, b: 0.75 }
      expect(srgbToCss(srgb)).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
    })

    test('clamps channels outside [0, 1] before formatting', () => {
      const srgb: Srgb = { r: 1.2, g: -0.1, b: 0.5 }
      expect(srgbToCss(srgb)).toBe('rgb(255, 0, 128)')
    })
  })
})
