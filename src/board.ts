import { Schema as S } from 'effect'

import { OkLch, isInGamut, offsetLightness } from './color'
import { delta as difficultyDelta } from './difficulty'
import { type Prng, makePrng, nextFloat, nextInt } from './prng'

export const BOARD_SIZE = 5

const TILE_COUNT = BOARD_SIZE * BOARD_SIZE

const ROUND_SEED_MULTIPLIER = 2654435761

const BASE_LIGHTNESS_MIN = 0.55
const BASE_LIGHTNESS_MAX = 0.7
const BASE_CHROMA_MIN = 0.04
const BASE_CHROMA_MAX = 0.08
const HUE_MAX = 360

/**
 * A generated Board: the grid size, the base color shared by all non-Target Tiles,
 * the Target's Tile index, and the Target's color.
 */
export const Board = S.Struct({
  size: S.Number,
  baseColor: OkLch,
  targetIndex: S.Number,
  targetColor: OkLch,
})
export type Board = typeof Board.Type

const seedForRound = (seed: number, roundIndex: number): number =>
  (seed ^ Math.imul(roundIndex + 1, ROUND_SEED_MULTIPLIER)) >>> 0

const drawFloat = (
  prng: Prng,
  min: number,
  max: number,
): readonly [number, Prng] => {
  const [unit, next] = nextFloat(prng)
  return [min + unit * (max - min), next]
}

const drawBaseColor = (prng: Prng): readonly [OkLch, Prng] => {
  const [hue, afterHue] = drawFloat(prng, 0, HUE_MAX)
  const [chroma, afterChroma] = drawFloat(afterHue, BASE_CHROMA_MIN, BASE_CHROMA_MAX)
  const [lightness, afterLightness] = drawFloat(
    afterChroma,
    BASE_LIGHTNESS_MIN,
    BASE_LIGHTNESS_MAX,
  )
  return [{ L: lightness, C: chroma, h: hue }, afterLightness]
}

const drawTargetColor = (
  base: OkLch,
  prng: Prng,
  roundDelta: number,
): readonly [OkLch, Prng] => {
  const [coin, next] = nextFloat(prng)
  const signedDelta = coin < 0.5 ? -roundDelta : roundDelta
  const candidate = offsetLightness(base, signedDelta)
  const target = isInGamut(candidate) ? candidate : offsetLightness(base, -signedDelta)
  return [target, next]
}

/**
 * Generate a Board from a Seed and a Round index. Pure: the same `(seed, roundIndex)`
 * always returns the same Board. The per-Round perceptual delta comes from the
 * Difficulty curve module.
 */
export const generateBoard = (seed: number, roundIndex: number): Board => {
  const prng = makePrng(seedForRound(seed, roundIndex))
  const [baseColor, afterBase] = drawBaseColor(prng)
  const [targetIndex, afterIndex] = nextInt(afterBase, 0, TILE_COUNT)
  const [targetColor] = drawTargetColor(baseColor, afterIndex, difficultyDelta(roundIndex))
  return { size: BOARD_SIZE, baseColor, targetIndex, targetColor }
}
