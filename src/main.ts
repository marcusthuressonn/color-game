import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Array, Clock, Effect, Match as M, Option, Random, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Board, generateBoard } from './board'
import { type OkLch, oklchToSrgb, srgbToCss } from './color'
import { dailyNumber, dailySeed, dayKey } from './daily'
import { Mode } from './mode'
import {
  DailyRecord,
  loadBestScore,
  loadDailyRecord,
  saveBestScore,
  saveDailyRecord,
} from './persistence'

const INITIAL_SEED = 0xc010_4eed
const INITIAL_ROUND_INDEX = 0

// MODEL

export const Status = S.Literals(['Title', 'Playing', 'GameOver'])
export type Status = typeof Status.Type

export const Model = S.Struct({
  seed: S.Number,
  roundIndex: S.Number,
  board: Board,
  score: S.Number,
  status: Status,
  best: S.Number,
  isNewBest: S.Boolean,
  mode: Mode,
  dailyNumber: S.Number,
  dailyDayKey: S.String,
})
export type Model = typeof Model.Type

// FLAGS

export const Flags = S.Struct({
  best: S.Number,
  maybeLockedDaily: S.Option(DailyRecord),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const maybeBest = yield* loadBestScore
  const maybeRecord = yield* loadDailyRecord
  const today = dayKey(new Date(yield* Clock.currentTimeMillis))
  const maybeLockedDaily = Option.filter(maybeRecord, record => record.dayKey === today)
  return Flags.make({
    best: Option.getOrElse(maybeBest, () => 0),
    maybeLockedDaily,
  })
}).pipe(Effect.provide(BrowserKeyValueStore.layerLocalStorage))

// MESSAGE

export const Booted = m('Booted')
export const TappedTile = m('TappedTile', { index: S.Number })
export const ClickedSelectMode = m('ClickedSelectMode', { mode: Mode })
export const ClickedPlayAgain = m('ClickedPlayAgain')
export const StartedNewRun = m('StartedNewRun', { seed: S.Number })
export const StartedDailyRun = m('StartedDailyRun', {
  seed: S.Number,
  dailyNumber: S.Number,
  dayKey: S.String,
})
export const CompletedSaveBestScore = m('CompletedSaveBestScore')
export const CompletedSaveDailyRecord = m('CompletedSaveDailyRecord')

export const Message = S.Union([
  Booted,
  TappedTile,
  ClickedSelectMode,
  ClickedPlayAgain,
  StartedNewRun,
  StartedDailyRun,
  CompletedSaveBestScore,
  CompletedSaveDailyRecord,
])
export type Message = typeof Message.Type

// COMMAND

export const GenerateRunSeed = Command.define(
  'GenerateRunSeed',
  StartedNewRun,
)(Random.nextInt.pipe(Effect.map(seed => StartedNewRun({ seed }))))

export const GenerateDailySeed = Command.define(
  'GenerateDailySeed',
  StartedDailyRun,
)(
  Effect.gen(function* () {
    const today = new Date(yield* Clock.currentTimeMillis)
    return StartedDailyRun({
      seed: dailySeed(today),
      dailyNumber: dailyNumber(today),
      dayKey: dayKey(today),
    })
  }),
)

export const SaveBestScore = Command.define(
  'SaveBestScore',
  { score: S.Number },
  CompletedSaveBestScore,
)(({ score }) =>
  saveBestScore(score).pipe(
    Effect.as(CompletedSaveBestScore()),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

export const SaveDailyRecord = Command.define(
  'SaveDailyRecord',
  { record: DailyRecord },
  CompletedSaveDailyRecord,
)(({ record }) =>
  saveDailyRecord(record).pipe(
    Effect.as(CompletedSaveDailyRecord()),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

// UPDATE

const freshModel = (
  seed: number,
  best: number,
  mode: Mode,
  dailyNumber: number,
  dailyDayKey: string,
): Model => ({
  seed,
  roundIndex: INITIAL_ROUND_INDEX,
  board: generateBoard(seed, INITIAL_ROUND_INDEX),
  score: 0,
  status: 'Playing',
  best,
  isNewBest: false,
  mode,
  dailyNumber,
  dailyDayKey,
})

const titleModel = (best: number): Model => ({
  ...freshModel(INITIAL_SEED, best, 'Classic', 0, ''),
  status: 'Title',
})

const lockedDailyModel = (record: DailyRecord, best: number): Model => ({
  seed: record.seed,
  roundIndex: record.score,
  board: generateBoard(record.seed, record.score),
  score: record.score,
  status: 'GameOver',
  best,
  isNewBest: false,
  mode: 'Daily',
  dailyNumber: record.dailyNumber,
  dailyDayKey: record.dayKey,
})

const seedRunForMode = (mode: Mode): Command.Command<Message> =>
  mode === 'Daily' ? GenerateDailySeed() : GenerateRunSeed()

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      Booted: () => [model, []],
      TappedTile: ({ index }) => {
        if (model.status !== 'Playing') {
          return [model, []]
        }
        if (index !== model.board.targetIndex) {
          const isNewBest = model.score > model.best
          const nextModel: Model = {
            ...model,
            status: 'GameOver',
            best: isNewBest ? model.score : model.best,
            isNewBest,
          }
          const bestCommands = isNewBest
            ? [SaveBestScore({ score: model.score })]
            : []
          const dailyCommands =
            model.mode === 'Daily'
              ? [
                  SaveDailyRecord({
                    record: {
                      dayKey: model.dailyDayKey,
                      dailyNumber: model.dailyNumber,
                      seed: model.seed,
                      score: model.score,
                    },
                  }),
                ]
              : []
          return [nextModel, [...bestCommands, ...dailyCommands]]
        }
        const nextRoundIndex = model.roundIndex + 1
        return [
          {
            ...model,
            roundIndex: nextRoundIndex,
            board: generateBoard(model.seed, nextRoundIndex),
            score: model.score + 1,
          },
          [],
        ]
      },
      ClickedSelectMode: ({ mode }) => [{ ...model, mode }, [seedRunForMode(mode)]],
      ClickedPlayAgain: () => [model, [seedRunForMode(model.mode)]],
      StartedNewRun: ({ seed }) => [
        freshModel(seed, model.best, model.mode, 0, ''),
        [],
      ],
      StartedDailyRun: ({ seed, dailyNumber, dayKey }) => [
        freshModel(seed, model.best, 'Daily', dailyNumber, dayKey),
        [],
      ],
      CompletedSaveBestScore: () => [model, []],
      CompletedSaveDailyRecord: () => [model, []],
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message, Flags> = ({
  best,
  maybeLockedDaily,
}) =>
  Option.match(maybeLockedDaily, {
    onNone: () => [titleModel(best), []],
    onSome: record => [lockedDailyModel(record, best), []],
  })

// VIEW

const {
  div,
  h1,
  h2,
  p,
  button,
  Class,
  Style,
  Role,
  AriaLabel,
  AriaRowcount,
  AriaColcount,
  OnClick,
} = html<Message>()

const tileColorAt = (board: Board, index: number): OkLch =>
  index === board.targetIndex ? board.targetColor : board.baseColor

const tileView = (board: Board, index: number, isRevealed: boolean): Html =>
  div(
    [
      Role('gridcell'),
      Class(isRevealed && index === board.targetIndex ? 'tile tile-revealed' : 'tile'),
      Style({ 'background-color': srgbToCss(oklchToSrgb(tileColorAt(board, index))) }),
      OnClick(TappedTile({ index })),
    ],
    [],
  )

const rowView = (board: Board, rowIndex: number, isRevealed: boolean): Html =>
  div(
    [Role('row'), Class('board-row')],
    Array.makeBy(board.size, columnIndex =>
      tileView(board, rowIndex * board.size + columnIndex, isRevealed),
    ),
  )

const boardView = (board: Board, isRevealed: boolean): Html =>
  div(
    [
      Role('grid'),
      AriaLabel('Board'),
      AriaRowcount(board.size),
      AriaColcount(board.size),
      Class('board'),
    ],
    Array.makeBy(board.size, rowIndex => rowView(board, rowIndex, isRevealed)),
  )

const scoreView = (score: number): Html =>
  p([Class('score'), AriaLabel('Score')], [score.toString()])

const bestScoreView = (best: number): Html =>
  p([Class('best-score'), AriaLabel('Best Score')], [best.toString()])

const newBestFlourish = (): Html =>
  p([Class('new-best'), AriaLabel('New Best')], ['New best!'])

const playAgainButton = (): Html =>
  button([Class('play-again'), OnClick(ClickedPlayAgain())], ['Play again'])

const gameOverView = (
  score: number,
  best: number,
  isNewBest: boolean,
  mode: Mode,
): Html =>
  div(
    [Role('dialog'), AriaLabel('Game Over'), Class('game-over')],
    [
      h2([Class('game-over-title')], ['Game Over']),
      p([Class('game-over-score'), AriaLabel('Final Score')], [score.toString()]),
      bestScoreView(best),
      ...(isNewBest ? [newBestFlourish()] : []),
      ...(mode === 'Daily' ? [] : [playAgainButton()]),
    ],
  )

const modeView = (mode: Mode): Html =>
  p([Class('mode'), AriaLabel('Mode')], [mode])

const dailyNumberView = (dailyNumber: number): Html =>
  p([Class('daily-number'), AriaLabel('Daily Number')], [`#${dailyNumber}`])

const dailyBadges = (mode: Mode, dailyNumber: number): ReadonlyArray<Html> =>
  mode === 'Daily' ? [dailyNumberView(dailyNumber)] : []

const modeButton = (mode: Mode): Html =>
  button([Class('start-run'), OnClick(ClickedSelectMode({ mode }))], [mode])

const titleView = (best: number): Html =>
  div(
    [Class('title-screen')],
    [
      p([Class('title-tagline')], ['Find the odd tile.']),
      bestScoreView(best),
      div(
        [Class('mode-select'), Role('group'), AriaLabel('Choose a Mode')],
        [modeButton('Classic'), modeButton('Daily')],
      ),
    ],
  )

const statusView = (model: Model): ReadonlyArray<Html> =>
  M.value(model.status).pipe(
    M.when('Title', () => [titleView(model.best)]),
    M.when('Playing', () => [
      modeView(model.mode),
      ...dailyBadges(model.mode, model.dailyNumber),
      scoreView(model.score),
      boardView(model.board, false),
    ]),
    M.when('GameOver', () => [
      modeView(model.mode),
      ...dailyBadges(model.mode, model.dailyNumber),
      scoreView(model.score),
      boardView(model.board, true),
      gameOverView(model.score, model.best, model.isNewBest, model.mode),
    ]),
    M.exhaustive,
  )

export const view = (model: Model): Document => ({
  title: 'Color Game',
  body: div(
    [Class('app')],
    [h1([Class('title')], ['Color Game']), ...statusView(model)],
  ),
})
