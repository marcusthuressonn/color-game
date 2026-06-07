// Murmur3-style 32-bit finalizer multipliers, shared by the seed hash and the
// per-step state mix.
const FINALIZER_MULTIPLIER_FIRST = 0x85ebca6b
const FINALIZER_MULTIPLIER_SECOND = 0xc2b2ae35

const HASH_OFFSET_BASIS = 0x9e3779b9
const HASH_MIX_SHIFT_FIRST = 15
const HASH_MIX_SHIFT_SECOND = 16

const STATE_STEP_DELTA = 0x9e3779b9
const STATE_MIX_SHIFT_FIRST = 15
const STATE_MIX_SHIFT_SECOND = 13
const STATE_MIX_SHIFT_FINAL = 16

const UINT32_MAX_PLUS_ONE = 0x100000000

/**
 * An immutable PRNG handle. Carry it through your code by always using the `next`
 * value returned alongside each draw, never reusing the prior handle.
 */
export type Prng = Readonly<{ state: number }>

const toUint32 = (value: number): number => value >>> 0

const hashSeed = (seed: number): number => {
  let mixed = toUint32(seed + HASH_OFFSET_BASIS)
  mixed = Math.imul(mixed ^ (mixed >>> HASH_MIX_SHIFT_FIRST), FINALIZER_MULTIPLIER_FIRST)
  mixed = Math.imul(mixed ^ (mixed >>> HASH_MIX_SHIFT_SECOND), FINALIZER_MULTIPLIER_SECOND)
  return toUint32(mixed ^ (mixed >>> HASH_MIX_SHIFT_SECOND))
}

/**
 * Build a PRNG handle from a Seed. The same Seed produces an identical
 * sequence of draws every time, on every platform.
 */
export const makePrng = (seed: number): Prng => ({ state: hashSeed(seed) })

const advance = (prng: Prng): { value: number; next: Prng } => {
  const stepped = toUint32(prng.state + STATE_STEP_DELTA)
  let mixed = Math.imul(
    stepped ^ (stepped >>> STATE_MIX_SHIFT_FIRST),
    FINALIZER_MULTIPLIER_FIRST,
  )
  mixed = Math.imul(
    mixed ^ (mixed >>> STATE_MIX_SHIFT_SECOND),
    FINALIZER_MULTIPLIER_SECOND,
  )
  const value = toUint32(mixed ^ (mixed >>> STATE_MIX_SHIFT_FINAL))
  return { value, next: { state: stepped } }
}

/**
 * Draw the next float in `[0, 1)` and return it alongside the advanced PRNG.
 */
export const nextFloat = (prng: Prng): readonly [number, Prng] => {
  const { value, next } = advance(prng)
  return [value / UINT32_MAX_PLUS_ONE, next]
}

/**
 * Draw the next integer in `[min, max)` (max exclusive) and return it alongside
 * the advanced PRNG. The caller is responsible for `min < max`.
 */
export const nextInt = (
  prng: Prng,
  min: number,
  max: number,
): readonly [number, Prng] => {
  const [unit, next] = nextFloat(prng)
  return [min + Math.floor(unit * (max - min)), next]
}
