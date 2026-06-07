import { Schema as S } from 'effect'

import { generateBoard } from './board'

/**
 * One recorded tap during a Run: the Tile index touched and milliseconds
 * elapsed since the Run's start. v1 Replay validation uses only `index`;
 * `tMs` is carried for future server-side plausibility checks.
 */
export const Tap = S.Struct({
  index: S.Number,
  tMs: S.Number,
})
export type Tap = typeof Tap.Type

/**
 * An ordered Tap Log in Round order. A non-Target tap ends the Run and is
 * never appended, so a well-formed Log contains only Target hits.
 */
export const TapLog = S.Array(Tap)
export type TapLog = typeof TapLog.Type

/**
 * The outcome of replaying a Tap Log over a Seed: the Score the Log
 * reproduces and whether every recorded tap hit its Round's Target.
 */
export type ReplayResult = {
  readonly score: number
  readonly valid: boolean
}

/**
 * Re-simulate a Run from its Seed and Tap Log. Pure: the same `(seed, tapLog)`
 * always returns the same result. Used by the client to self-verify a finished
 * Run and (later) by the server to verify ranked submissions.
 */
export const replay = (seed: number, tapLog: TapLog): ReplayResult => {
  const mismatch = tapLog.findIndex(
    (tap, roundIndex) => tap.index !== generateBoard(seed, roundIndex).targetIndex,
  )
  return mismatch === -1
    ? { score: tapLog.length, valid: true }
    : { score: mismatch, valid: false }
}
