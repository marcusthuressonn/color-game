import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Story } from 'foldkit'
import { beforeEach, describe, expect, test } from 'vitest'

import { generateBoard } from './board'
import { dayKey } from './daily'
import {
  Booted,
  ClickedPlayAgain,
  ClickedSelectMode,
  CompletedSaveBestScore,
  CompletedSaveDailyRecord,
  flags,
  GenerateDailySeed,
  GenerateRunSeed,
  init,
  type Model,
  SaveBestScore,
  SaveDailyRecord,
  StartedDailyRun,
  StartedNewRun,
  TappedTile,
  update,
} from './main'
import { saveDailyRecord } from './persistence'

const TEST_SEED = 1

const initialModel: Model = {
  seed: TEST_SEED,
  roundIndex: 0,
  board: generateBoard(TEST_SEED, 0),
  score: 0,
  status: 'Playing',
  best: 0,
  isNewBest: false,
  mode: 'Classic',
  dailyNumber: 0,
  dailyDayKey: '',
}

describe('update', () => {
  test('Booted leaves the model unchanged and issues no Commands', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(Booted()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model).toEqual(initialModel)
      }),
    )
  })

  test('tapping the Target advances the round, increments score, and regenerates the Board', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(TappedTile({ index: initialModel.board.targetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.roundIndex).toBe(1)
        expect(model.score).toBe(1)
        expect(model.board).toEqual(generateBoard(TEST_SEED, 1))
        expect(model.status).toBe('Playing')
      }),
    )
  })

  test('tapping a non-Target Tile ends the Run by transitioning to GameOver', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1

    Story.story(
      update,
      Story.with(initialModel),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.status).toBe('GameOver')
        expect(model.board).toEqual(initialModel.board)
        expect(model.score).toBe(0)
        expect(model.roundIndex).toBe(0)
      }),
    )
  })

  test('tapping any Tile after GameOver is ignored', () => {
    const gameOverModel: Model = { ...initialModel, status: 'GameOver' }

    Story.story(
      update,
      Story.with(gameOverModel),
      Story.message(TappedTile({ index: initialModel.board.targetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model).toEqual(gameOverModel)
      }),
    )
  })

  test('tapping any Tile while on the Title screen is ignored', () => {
    const titleModel: Model = { ...initialModel, status: 'Title' }

    Story.story(
      update,
      Story.with(titleModel),
      Story.message(TappedTile({ index: initialModel.board.targetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model).toEqual(titleModel)
      }),
    )
  })

  test('ClickedSelectMode(Classic) sets the Mode to Classic, issues GenerateRunSeed, and routes to Playing', () => {
    const titleModel: Model = { ...initialModel, status: 'Title' }

    Story.story(
      update,
      Story.with(titleModel),
      Story.message(ClickedSelectMode({ mode: 'Classic' })),
      Story.Command.expectExact(GenerateRunSeed),
      Story.model(model => {
        expect(model.mode).toBe('Classic')
        expect(model.status).toBe('Title')
      }),
      Story.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 123 })),
      Story.model(model => {
        expect(model.mode).toBe('Classic')
        expect(model.seed).toBe(123)
        expect(model.status).toBe('Playing')
        expect(model.board).toEqual(generateBoard(123, 0))
      }),
    )
  })

  test('ClickedSelectMode(Daily) sets the Mode to Daily, issues GenerateDailySeed, and routes to Playing', () => {
    const titleModel: Model = { ...initialModel, status: 'Title' }

    Story.story(
      update,
      Story.with(titleModel),
      Story.message(ClickedSelectMode({ mode: 'Daily' })),
      Story.Command.expectExact(GenerateDailySeed),
      Story.model(model => {
        expect(model.mode).toBe('Daily')
        expect(model.status).toBe('Title')
      }),
      Story.Command.resolve(
        GenerateDailySeed,
        StartedDailyRun({ seed: 456, dailyNumber: 158, dayKey: '2026-06-07' }),
      ),
      Story.model(model => {
        expect(model.mode).toBe('Daily')
        expect(model.seed).toBe(456)
        expect(model.status).toBe('Playing')
        expect(model.dailyNumber).toBe(158)
        expect(model.dailyDayKey).toBe('2026-06-07')
        expect(model.board).toEqual(generateBoard(456, 0))
      }),
    )
  })

  test('StartedNewRun preserves the chosen Mode', () => {
    const dailyTitle: Model = { ...initialModel, status: 'Title', mode: 'Daily' }

    Story.story(
      update,
      Story.with(dailyTitle),
      Story.message(StartedNewRun({ seed: 999 })),
      Story.model(model => {
        expect(model.mode).toBe('Daily')
        expect(model.status).toBe('Playing')
      }),
    )
  })

  test('ClickedPlayAgain after a Daily Run issues GenerateDailySeed and preserves Daily Mode', () => {
    const dailyGameOver: Model = {
      ...initialModel,
      mode: 'Daily',
      status: 'GameOver',
      score: 4,
      dailyNumber: 158,
      dailyDayKey: '2026-06-07',
    }

    Story.story(
      update,
      Story.with(dailyGameOver),
      Story.message(ClickedPlayAgain()),
      Story.Command.expectExact(GenerateDailySeed),
      Story.Command.resolve(
        GenerateDailySeed,
        StartedDailyRun({ seed: 21, dailyNumber: 158, dayKey: '2026-06-07' }),
      ),
      Story.model(model => {
        expect(model.mode).toBe('Daily')
        expect(model.status).toBe('Playing')
        expect(model.score).toBe(0)
        expect(model.dailyNumber).toBe(158)
        expect(model.dailyDayKey).toBe('2026-06-07')
      }),
    )
  })

  test('StartedDailyRun records the dailyNumber and dayKey on the Model', () => {
    const dailyTitle: Model = { ...initialModel, status: 'Title', mode: 'Daily' }

    Story.story(
      update,
      Story.with(dailyTitle),
      Story.message(
        StartedDailyRun({ seed: 777, dailyNumber: 159, dayKey: '2026-06-08' }),
      ),
      Story.model(model => {
        expect(model.mode).toBe('Daily')
        expect(model.status).toBe('Playing')
        expect(model.dailyNumber).toBe(159)
        expect(model.dailyDayKey).toBe('2026-06-08')
        expect(model.seed).toBe(777)
      }),
    )
  })

  test('losing the Daily Run emits SaveDailyRecord with the current dayKey, dailyNumber, seed, and score', () => {
    const dailyRunning: Model = {
      ...initialModel,
      mode: 'Daily',
      best: 9,
      seed: 456,
      dailyNumber: 158,
      dailyDayKey: '2026-06-07',
      score: 3,
      roundIndex: 3,
      board: generateBoard(456, 3),
    }
    const nonTargetIndex =
      dailyRunning.board.targetIndex === 0 ? 1 : dailyRunning.board.targetIndex - 1

    Story.story(
      update,
      Story.with(dailyRunning),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectExact(SaveDailyRecord),
      Story.model(model => {
        expect(model.status).toBe('GameOver')
        expect(model.mode).toBe('Daily')
      }),
      Story.Command.resolve(SaveDailyRecord, CompletedSaveDailyRecord()),
    )
  })

  test('losing the Classic Run does not emit SaveDailyRecord', () => {
    const classicRunning: Model = { ...initialModel, score: 2, best: 9 }
    const nonTargetIndex =
      classicRunning.board.targetIndex === 0 ? 1 : classicRunning.board.targetIndex - 1

    Story.story(
      update,
      Story.with(classicRunning),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectNone(),
    )
  })

  test('init with no locked Daily produces a Title model', () => {
    const [model, commands] = init({
      best: 5,
      maybeLockedDaily: Option.none(),
    })
    expect(model.status).toBe('Title')
    expect(model.best).toBe(5)
    expect(model.mode).toBe('Classic')
    expect(commands).toEqual([])
  })

  test('init with a locked Daily for today produces a GameOver model reconstructed from the record', () => {
    const [model, commands] = init({
      best: 5,
      maybeLockedDaily: Option.some({
        dayKey: '2026-06-07',
        dailyNumber: 158,
        seed: 456,
        score: 4,
      }),
    })
    expect(model.status).toBe('GameOver')
    expect(model.mode).toBe('Daily')
    expect(model.dailyNumber).toBe(158)
    expect(model.dailyDayKey).toBe('2026-06-07')
    expect(model.seed).toBe(456)
    expect(model.score).toBe(4)
    expect(model.roundIndex).toBe(4)
    expect(model.board).toEqual(generateBoard(456, 4))
    expect(model.best).toBe(5)
    expect(model.isNewBest).toBe(false)
    expect(commands).toEqual([])
  })

  test('ClickedPlayAgain issues a GenerateRunSeed Command and leaves the model unchanged', () => {
    const gameOverModel: Model = { ...initialModel, status: 'GameOver', score: 7, roundIndex: 7 }

    Story.story(
      update,
      Story.with(gameOverModel),
      Story.message(ClickedPlayAgain()),
      Story.Command.expectExact(GenerateRunSeed),
      Story.model(model => {
        expect(model).toEqual(gameOverModel)
      }),
      Story.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 42 })),
      Story.model(model => {
        expect(model.seed).toBe(42)
        expect(model.roundIndex).toBe(0)
        expect(model.score).toBe(0)
        expect(model.status).toBe('Playing')
        expect(model.board).toEqual(generateBoard(42, 0))
      }),
    )
  })

  test('Game Over with a new best Score updates best, sets isNewBest, and issues SaveBestScore', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1
    const runningModel: Model = { ...initialModel, score: 5, best: 3 }

    Story.story(
      update,
      Story.with(runningModel),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectExact(SaveBestScore),
      Story.model(model => {
        expect(model.status).toBe('GameOver')
        expect(model.best).toBe(5)
        expect(model.isNewBest).toBe(true)
      }),
      Story.Command.resolve(SaveBestScore, CompletedSaveBestScore()),
      Story.model(model => {
        expect(model.best).toBe(5)
        expect(model.isNewBest).toBe(true)
      }),
    )
  })

  test('Game Over without beating best leaves best untouched, sets isNewBest false, and issues no Commands', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1
    const runningModel: Model = { ...initialModel, score: 2, best: 9 }

    Story.story(
      update,
      Story.with(runningModel),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.status).toBe('GameOver')
        expect(model.best).toBe(9)
        expect(model.isNewBest).toBe(false)
      }),
    )
  })

  test('Game Over with score equal to best does not count as a new best', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1
    const runningModel: Model = { ...initialModel, score: 4, best: 4 }

    Story.story(
      update,
      Story.with(runningModel),
      Story.message(TappedTile({ index: nonTargetIndex })),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.status).toBe('GameOver')
        expect(model.best).toBe(4)
        expect(model.isNewBest).toBe(false)
      }),
    )
  })

  test('StartedNewRun preserves best and clears isNewBest', () => {
    const gameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      score: 7,
      best: 7,
      isNewBest: true,
    }

    Story.story(
      update,
      Story.with(gameOverModel),
      Story.message(ClickedPlayAgain()),
      Story.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 42 })),
      Story.model(model => {
        expect(model.best).toBe(7)
        expect(model.isNewBest).toBe(false)
        expect(model.score).toBe(0)
      }),
    )
  })
})

describe('flags', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const provideStore = <A>(
    effect: Effect.Effect<A, never, KeyValueStore.KeyValueStore>,
  ) =>
    Effect.runPromise(
      effect.pipe(Effect.provide(BrowserKeyValueStore.layerLocalStorage)),
    )

  test('produces a locked Daily when a record for today is persisted', async () => {
    const today = dayKey(new Date())
    await provideStore(
      saveDailyRecord({ dayKey: today, dailyNumber: 158, seed: 9, score: 4 }),
    )
    const result = await Effect.runPromise(flags)
    expect(result.maybeLockedDaily).toStrictEqual(
      Option.some({ dayKey: today, dailyNumber: 158, seed: 9, score: 4 }),
    )
  })

  test('produces None when the persisted record is for a different day', async () => {
    await provideStore(
      saveDailyRecord({
        dayKey: '2000-01-01',
        dailyNumber: 1,
        seed: 1,
        score: 1,
      }),
    )
    const result = await Effect.runPromise(flags)
    expect(result.maybeLockedDaily).toStrictEqual(Option.none())
  })

  test('produces None when no Daily record is persisted', async () => {
    const result = await Effect.runPromise(flags)
    expect(result.maybeLockedDaily).toStrictEqual(Option.none())
  })
})
