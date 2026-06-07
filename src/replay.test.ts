import { Array } from 'effect'
import { describe, expect, test } from 'vitest'

import { generateBoard } from './board'
import { type Tap, type TapLog, replay } from './replay'

const targetTap = (seed: number, roundIndex: number, tMs: number = 0): Tap => ({
  index: generateBoard(seed, roundIndex).targetIndex,
  tMs,
})

const recordRun = (seed: number, rounds: number): TapLog =>
  Array.makeBy(rounds, roundIndex => targetTap(seed, roundIndex, roundIndex * 500))

describe('Replay', () => {
  describe('valid Tap Logs', () => {
    test('an empty Tap Log yields Score 0 and is valid', () => {
      expect(replay(123, [])).toEqual({ score: 0, valid: true })
    })

    test('a Tap Log of Target hits reproduces its length as the Score', () => {
      const log = recordRun(42, 7)
      expect(replay(42, log)).toEqual({ score: 7, valid: true })
    })

    test('a single Target hit at Round 0 yields Score 1', () => {
      const log: TapLog = [targetTap(99, 0)]
      expect(replay(99, log)).toEqual({ score: 1, valid: true })
    })
  })

  describe('invalid Tap Logs', () => {
    test('a Tap on a non-Target Tile is rejected with valid=false', () => {
      const board = generateBoard(7, 0)
      const wrongIndex = board.targetIndex === 0 ? 1 : 0
      const log: TapLog = [{ index: wrongIndex, tMs: 100 }]
      expect(replay(7, log)).toEqual({ score: 0, valid: false })
    })

    test('Score on rejection equals the number of correct taps before the bad one', () => {
      const log: TapLog = [
        targetTap(42, 0),
        targetTap(42, 1),
        targetTap(42, 2),
        { index: (generateBoard(42, 3).targetIndex + 1) % 25, tMs: 1_500 },
        targetTap(42, 4),
      ]
      expect(replay(42, log)).toEqual({ score: 3, valid: false })
    })

    test('a Tap Log forged for a different Seed is rejected', () => {
      const log = recordRun(42, 5)
      const result = replay(99, log)
      expect(result.valid).toBe(false)
    })

    test('a forged Tap Log claiming a Score higher than its taps reproduce is caught by the Score it returns', () => {
      const realLog = recordRun(42, 3)
      const claimedScore = 10
      const replayed = replay(42, realLog)
      expect(replayed.score).toBe(3)
      expect(replayed.score).not.toBe(claimedScore)
    })
  })

  describe('determinism', () => {
    test('identical (seed, tapLog) inputs return identical results', () => {
      const log = recordRun(31, 4)
      expect(replay(31, log)).toEqual(replay(31, log))
    })

    test('the same Tap Log replayed against the same Seed is independent of the timing column', () => {
      const log = recordRun(31, 4)
      const reTimed: TapLog = log.map(({ index }, i) => ({ index, tMs: i * 17_000 }))
      expect(replay(31, log)).toEqual(replay(31, reTimed))
    })
  })

  describe('Round-by-Round simulation', () => {
    test('the Score equals the number of Rounds the Target was correctly identified', () => {
      Array.makeBy(6, rounds => rounds + 1).forEach(rounds => {
        const log = recordRun(123, rounds)
        expect(replay(123, log).score).toBe(rounds)
      })
    })

    test('replays the same Board the live Run would have generated for each Round', () => {
      const log = recordRun(77, 5)
      log.forEach((tap, roundIndex) => {
        expect(tap.index).toBe(generateBoard(77, roundIndex).targetIndex)
      })
      expect(replay(77, log)).toEqual({ score: 5, valid: true })
    })
  })
})
