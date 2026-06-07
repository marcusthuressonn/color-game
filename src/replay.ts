import { Schema as S } from 'effect'

import { generateBoard } from './board'

/**
 * One recorded tap during a Run: which Tile index the player touched and the
 * milliseconds elapsed from the Run's start at that moment. Per-tap timing is
 * recorded for future server-side plausibility checks; v1 Replay validation
 * only consults `index`.
 */
export const Tap = S.Struct({
  index: S.Number,
  tMs: S.Number,
})
export type Tap = typeof Tap.Type

/**
 * An ordered Tap Log: the sequence of Target taps the Player made during a
 * Run, in Round order. A non-Target tap ends the Run and is never appended,
 * so a well-formed Log contains only Target hits.
 */
export const TapLog = S.Array(Tap)
export type TapLog = ReadonlyArray<Tap>

/**
 * The outcome of replaying a Tap Log over a Seed: the Score the Log would
 * reproduce, plus whether every recorded tap really hit its Round's Target.
 * A forged or corrupted Log fails `valid`; a Log claiming a Score higher than
 * what its taps reproduce is caught by comparing the claimed Score to `score`.
 */
export type ReplayResult = {
  readonly score: number
  readonly valid: boolean
}

/**
 * Re-simulate a Run from its Seed and recorded Tap Log over the shared pure
 * core. Returns the Score the Log produces and whether every recorded tap
 * matches its Round's Target. Pure: identical `(seed, tapLog)` always returns
 * the identical result. Used by the client to self-verify a finished Run and
 * by the server (later) to verify ranked Classic submissions.
 */
export const replay = (seed: number, tapLog: TapLog): ReplayResult => {
  const mismatch = tapLog.findIndex(
    (tap, roundIndex) => tap.index !== generateBoard(seed, roundIndex).targetIndex,
  )
  return mismatch === -1
    ? { score: tapLog.length, valid: true }
    : { score: mismatch, valid: false }
}
