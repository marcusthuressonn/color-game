import { Array } from 'effect'
import { describe, expect, test } from 'vitest'

import { BOARD_SIZE, ROUND_DELTA, generateBoard } from './board'
import { deltaEok, isInGamut } from './color'

const TILE_COUNT = BOARD_SIZE * BOARD_SIZE

describe('Board generator', () => {
  test('produces a Board with one Target index inside the grid', () => {
    const board = generateBoard(1, 0)
    expect(board.size).toBe(BOARD_SIZE)
    expect(Number.isInteger(board.targetIndex)).toBe(true)
    expect(board.targetIndex).toBeGreaterThanOrEqual(0)
    expect(board.targetIndex).toBeLessThan(TILE_COUNT)
  })

  test('returns identical Boards for the same (seed, roundIndex)', () => {
    expect(generateBoard(42, 3)).toEqual(generateBoard(42, 3))
  })

  test('returns different Boards across rounds for the same Seed', () => {
    const first = generateBoard(7, 0)
    const second = generateBoard(7, 1)
    expect(first).not.toEqual(second)
  })

  test('returns different Boards across Seeds for the same round', () => {
    const first = generateBoard(1, 0)
    const second = generateBoard(2, 0)
    expect(first.baseColor).not.toEqual(second.baseColor)
  })

  test('Target color differs from base by exactly the round delta', () => {
    const board = generateBoard(123, 0)
    expect(deltaEok(board.baseColor, board.targetColor)).toBeCloseTo(
      ROUND_DELTA,
      6,
    )
  })

  test('Target differs only in lightness (same chroma and hue)', () => {
    const board = generateBoard(123, 0)
    expect(board.targetColor.C).toBeCloseTo(board.baseColor.C, 10)
    expect(board.targetColor.h).toBeCloseTo(board.baseColor.h, 10)
    expect(board.targetColor.L).not.toBeCloseTo(board.baseColor.L, 6)
  })

  test('both base and Target stay in sRGB gamut across many Seeds', () => {
    Array.makeBy(64, seed => seed).forEach(seed => {
      const board = generateBoard(seed, 0)
      expect(isInGamut(board.baseColor)).toBe(true)
      expect(isInGamut(board.targetColor)).toBe(true)
    })
  })
})
