import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { generateBoard } from './board'
import {
  Booted,
  ClickedPlayAgain,
  GenerateRunSeed,
  type Model,
  StartedNewRun,
  TappedTile,
  update,
} from './main'

const TEST_SEED = 1

const initialModel: Model = {
  seed: TEST_SEED,
  roundIndex: 0,
  board: generateBoard(TEST_SEED, 0),
  score: 0,
  status: 'Playing',
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
        expect(model.board.targetIndex).toBe(initialModel.board.targetIndex)
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
})
