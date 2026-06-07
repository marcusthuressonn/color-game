import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { generateBoard } from './board'
import {
  GenerateDailySeed,
  GenerateRunSeed,
  init,
  type Model,
  StartedDailyRun,
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
  best: 0,
  isNewBest: false,
  mode: 'Classic',
  dailyNumber: 0,
  dailyDayKey: '',
  streak: 0,
  lastPlayedDayKey: '',
}

const titleModel: Model = { ...initialModel, status: 'Title' }

describe('scene', () => {
  test('app opens on the Mode-select surface with Classic and Daily affordances', () => {
    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.expect(Scene.role('button', { name: 'Classic' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Daily' })).toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).not.toExist(),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).not.toExist(),
    )
  })

  test('clicking Classic issues GenerateRunSeed and enters a Classic Playing Run', () => {
    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.click(Scene.role('button', { name: 'Classic' })),
      Scene.Command.expectExact(GenerateRunSeed),
      Scene.Command.resolve(GenerateRunSeed, StartedNewRun({ seed: 7 })),
      Scene.expect(Scene.role('button', { name: 'Classic' })).not.toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
      Scene.expect(Scene.label('Mode')).toHaveText('Classic'),
    )
  })

  test('clicking Daily issues GenerateDailySeed and enters a Daily Playing Run with Daily #N visible', () => {
    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.click(Scene.role('button', { name: 'Daily' })),
      Scene.Command.expectExact(GenerateDailySeed),
      Scene.Command.resolve(
        GenerateDailySeed,
        StartedDailyRun({ seed: 7, dailyNumber: 158, dayKey: '2026-06-07' }),
      ),
      Scene.expect(Scene.role('button', { name: 'Daily' })).not.toExist(),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
      Scene.expect(Scene.label('Score')).toHaveText('0'),
      Scene.expect(Scene.label('Mode')).toHaveText('Daily'),
      Scene.expect(Scene.label('Daily Number')).toHaveText('#158'),
    )
  })

  test('Daily Game Over does not show a Play again button', () => {
    const dailyGameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      mode: 'Daily',
      score: 4,
      dailyNumber: 158,
      dailyDayKey: '2026-06-07',
    }

    Scene.scene(
      { update, view },
      Scene.with(dailyGameOverModel),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Play again' })).not.toExist(),
    )
  })

  test('Daily Game Over surfaces the current Streak', () => {
    const dailyGameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      mode: 'Daily',
      score: 4,
      dailyNumber: 158,
      dailyDayKey: '2026-06-07',
      streak: 5,
      lastPlayedDayKey: '2026-06-07',
    }

    Scene.scene(
      { update, view },
      Scene.with(dailyGameOverModel),
      Scene.expect(Scene.label('Streak')).toHaveText('5'),
    )
  })

  test('Classic Game Over does not surface a Streak', () => {
    const classicGameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      mode: 'Classic',
      score: 4,
      streak: 5,
      lastPlayedDayKey: '2026-06-07',
    }

    Scene.scene(
      { update, view },
      Scene.with(classicGameOverModel),
      Scene.expect(Scene.label('Streak')).not.toExist(),
    )
  })

  test('init with a locked Daily for today shows the locked result and not a fresh Board', () => {
    const [lockedModel] = init({
      best: 3,
      maybeLockedDaily: Option.some({
        dayKey: '2026-06-07',
        dailyNumber: 158,
        seed: 99,
        score: 5,
        streak: 4,
      }),
      prevStreak: 4,
      prevLastPlayedDayKey: Option.some('2026-06-07'),
    })

    Scene.scene(
      { update, view },
      Scene.with(lockedModel),
      Scene.expect(Scene.role('dialog', { name: 'Game Over' })).toExist(),
      Scene.expect(Scene.label('Final Score')).toHaveText('5'),
      Scene.expect(Scene.label('Mode')).toHaveText('Daily'),
      Scene.expect(Scene.label('Daily Number')).toHaveText('#158'),
      Scene.expect(Scene.label('Streak')).toHaveText('4'),
      Scene.expect(Scene.role('button', { name: 'Play again' })).not.toExist(),
      Scene.expect(Scene.role('button', { name: 'Classic' })).not.toExist(),
      Scene.expect(Scene.role('button', { name: 'Daily' })).not.toExist(),
    )
  })

  test('init with no locked Daily shows the Title screen', () => {
    const [freshModel] = init({
      best: 7,
      maybeLockedDaily: Option.none(),
      prevStreak: 0,
      prevLastPlayedDayKey: Option.none(),
    })

    Scene.scene(
      { update, view },
      Scene.with(freshModel),
      Scene.expect(Scene.role('button', { name: 'Classic' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Daily' })).toExist(),
      Scene.expect(Scene.label('Best Score')).toHaveText('7'),
    )
  })

  test('Classic Playing does not surface a Daily Number', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Daily Number')).not.toExist(),
    )
  })

  test('full loop: Title to Classic Playing to Game Over to Play again to Playing', () => {
    const playingBoard = generateBoard(7, 0)
    const nonTargetIndex = playingBoard.targetIndex === 0 ? 1 : playingBoard.targetIndex - 1

    Scene.scene(
      { update, view },
      Scene.with(titleModel),
      Scene.click(Scene.role('button', { name: 'Classic' })),
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
      Scene.expect(Scene.label('Mode')).toHaveText('Classic'),
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

  test('Title screen displays the persisted best Score', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...titleModel, best: 12 }),
      Scene.expect(Scene.label('Best Score')).toHaveText('12'),
    )
  })

  test('Game Over screen displays the best Score', () => {
    const gameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      score: 3,
      best: 8,
    }

    Scene.scene(
      { update, view },
      Scene.with(gameOverModel),
      Scene.expect(Scene.label('Best Score')).toHaveText('8'),
    )
  })

  test('Game Over shows the new-best flourish only when isNewBest is true', () => {
    const recordModel: Model = {
      ...initialModel,
      status: 'GameOver',
      score: 9,
      best: 9,
      isNewBest: true,
    }

    Scene.scene(
      { update, view },
      Scene.with(recordModel),
      Scene.expect(Scene.label('New Best')).toExist(),
    )
  })

  test('Game Over hides the new-best flourish when isNewBest is false', () => {
    const gameOverModel: Model = {
      ...initialModel,
      status: 'GameOver',
      score: 2,
      best: 9,
      isNewBest: false,
    }

    Scene.scene(
      { update, view },
      Scene.with(gameOverModel),
      Scene.expect(Scene.label('New Best')).not.toExist(),
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
