import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'

export const BEST_SCORE_KEY = 'color-game.best-score'
export const DAILY_RECORD_KEY = 'color-game.daily-record'

const BestScore = S.NumberFromString.check(
  S.isInt(),
  S.isGreaterThanOrEqualTo(0),
)

export const DailyRecord = S.Struct({
  dayKey: S.String,
  dailyNumber: S.Number,
  seed: S.Number,
  score: S.Number,
  streak: S.Number,
  totalTimeMs: S.Number,
})
export type DailyRecord = typeof DailyRecord.Type

const DailyRecordJson = S.fromJsonString(DailyRecord)

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

export const loadDailyRecord: Effect.Effect<
  Option.Option<DailyRecord>,
  never,
  KeyValueStore.KeyValueStore
> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeRaw = Option.fromNullishOr(yield* store.get(DAILY_RECORD_KEY))
  const raw = yield* Effect.fromOption(maybeRaw)
  const value = yield* S.decodeEffect(DailyRecordJson)(raw)
  return Option.some(value)
}).pipe(Effect.catch(() => Effect.succeed(Option.none())))

export const saveDailyRecord = (
  record: DailyRecord,
): Effect.Effect<void, never, KeyValueStore.KeyValueStore> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const encoded = yield* S.encodeEffect(DailyRecordJson)(record)
    yield* store.set(DAILY_RECORD_KEY, encoded)
  }).pipe(Effect.catch(() => Effect.void))
