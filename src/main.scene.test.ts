import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { generateBoard } from './board'
import {
  GenerateRunSeed,
  type Model,
  StartedNewRun,
  update,
  view,
} from './main'

const TEST_SEED = 0xc010_4eed

const initialModel: Model = {
  seed: TEST_SEED,
  roundIndex: 0,
  board: generateBoard(TEST_SEED, 0),
  score: 0,
  status: 'Playing',
}

const titleModel: Model = { ...initialModel, status: 'Title' }

describe('scene', () => {
  test('app opens on the Title screen with a Tap to play affordance', () => {
    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.expect(Scene.role('button', { name: 'Tap to play' })).toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).not.toExist(),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).not.toExist(),
    )
  })

  test('clicking Tap to play issues GenerateRunSeed and enters Playing', () => {
    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.click(Scene.role('button', { name: 'Tap to play' })),
      Scene.Command.expectExact(GenerateRunSeed),
      Scene.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 7 })),
      Scene.expect(Scene.role('button', { name: 'Tap to play' })).not.toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
    )
  })

  test('full loop: Title to Playing to Game Over to Play again to Playing', () => {
    const playingBoard = generateBoard(7, 0)
    const nonTargetIndex = playingBoard.targetIndex === 0 ? 1 : playingBoard.targetIndex - 1

    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.click(Scene.role('button', { name: 'Tap to play' })),
      Scene.Command.expectExact(GenerateRunSeed),
      Scene.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 7 })),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
      Scene.click(Scene.nth(Scene.all.role('gridcell'), nonTargetIndex)),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Play again' })),
      Scene.Command.expectExact(GenerateRunSeed),
      Scene.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 11 })),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).not.toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
    )
  })

  test('renders the game title', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'Color Game' })).toExist(),
    )
  })

  test('renders the Board as a grid', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
    )
  })

  test('renders exactly 25 Tiles', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('gridcell')).toHaveCount(25),
    )
  })

  test('renders the initial Score', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
    )
  })

  test('does not show the Game Over panel while Playing', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).not.toExist(),
    )
  })

  test('tapping the Target increments the displayed Score', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.nth(Scene.all.role('gridcell'), initialModel.board.targetIndex)),
      Scene.expect(Scene.label('Score')).toHaveText('1'),
    )
  })

  test('tapping a non-Target Tile shows the Game Over panel with the final Score', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1

    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.nth(Scene.all.role('gridcell'), nonTargetIndex)),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).toExist(),
      Scene.expect(Scene.label('Final Score')).toHaveText('0'),
    )
  })

  test('Game Over reveals the actual Target tile', () => {
    const nonTargetIndex =
      initialModel.board.targetIndex === 0 ? 1 : initialModel.board.targetIndex - 1

    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.nth(Scene.all.role('gridcell'), nonTargetIndex)),
      Scene.expect(
        Scene.nth(Scene.all.role('gridcell'), initialModel.board.targetIndex),
      ).toHaveClass('tile-revealed'),
    )
  })

  test('clicking Play Again issues GenerateRunSeed and starts a fresh Run', () => {
    const gameOverModel: Model = {
      ...initialModel,
      score: 3,
      roundIndex: 3,
      status: 'GameOver',
    }

    Scene.scene(
      { update, view },
      Scene.with(gameOverModel),
      Scene.click(Scene.role('button', { name: 'Play again' })),
      Scene.Command.expectExact(GenerateRunSeed),
      Scene.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 99 })),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).not.toExist(),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
    )
  })
})
