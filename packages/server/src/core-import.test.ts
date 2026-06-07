import { describe, expect, it } from 'vitest'

import { BOARD_SIZE, generateBoard } from '@core/board'
import { FLOOR_DELTA, STARTING_DELTA, delta } from '@core/difficulty'
import { makePrng, nextFloat, nextInt } from '@core/prng'

/**
 * The pure core (`board`/`difficulty`/`prng`) must remain importable by the
 * server package without duplication so the future Replay/verification service
 * runs the same generation the client did. These tests prove the seam holds
 * before any verification code lands.
 */
describe('pure core import seam', () => {
  it('board.generateBoard is callable from the server', () => {
    const board = generateBoard(42, 0)
    expect(board.size).toBe(BOARD_SIZE)
    expect(board.targetIndex).toBeGreaterThanOrEqual(0)
    expect(board.targetIndex).toBeLessThan(BOARD_SIZE * BOARD_SIZE)
  })

  it('difficulty.delta is callable from the server', () => {
    expect(delta(0)).toBe(STARTING_DELTA)
    expect(delta(10_000)).toBe(FLOOR_DELTA)
  })

  it('prng draws are deterministic from the server', () => {
    const [unit] = nextFloat(makePrng(1))
    expect(unit).toBeGreaterThanOrEqual(0)
    expect(unit).toBeLessThan(1)
    const [int] = nextInt(makePrng(1), 0, 25)
    expect(Number.isInteger(int)).toBe(true)
  })
})
