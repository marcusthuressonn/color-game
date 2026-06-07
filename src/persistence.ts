import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'

export const BEST_SCORE_KEY = 'color-game.best-score'

const BestScore = S.NumberFromString.check(
  S.isInt(),
  S.isGreaterThanOrEqualTo(0),
)

export const loadBestScore: Effect.Effect<
  Option.Option<number>,
  never,
  KeyValueStore.KeyValueStore
> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeRaw = Option.fromNullishOr(yield* store.get(BEST_SCORE_KEY))
  const raw = yield* Effect.fromOption(maybeRaw)
  const value = yield* S.decodeEffect(BestScore)(raw)
  return Option.some(value)
}).pipe(Effect.catch(() => Effect.succeed(Option.none())))

export const saveBestScore = (
  score: number,
): Effect.Effect<void, never, KeyValueStore.KeyValueStore> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(BEST_SCORE_KEY, score.toString())
  }).pipe(Effect.catch(() => Effect.void))
