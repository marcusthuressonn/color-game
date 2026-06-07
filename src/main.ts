import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Array, Effect, Match as M, Option, Random, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Board, generateBoard } from './board'
import { type OkLch, oklchToSrgb, srgbToCss } from './color'
import { loadBestScore, saveBestScore } from './persistence'

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
})
export type Model = typeof Model.Type

// FLAGS

export const Flags = S.Struct({
  best: S.Number,
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = loadBestScore.pipe(
  Effect.map(maybeBest =>
    Flags.make({ best: Option.getOrElse(maybeBest, () => 0) }),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// MESSAGE

export const Booted = m('Booted')
export const TappedTile = m('TappedTile', { index: S.Number })
export const ClickedStartRun = m('ClickedStartRun')
export const ClickedPlayAgain = m('ClickedPlayAgain')
export const StartedNewRun = m('StartedNewRun', { seed: S.Number })
export const CompletedSaveBestScore = m('CompletedSaveBestScore')

export const Message = S.Union([
  Booted,
  TappedTile,
  ClickedStartRun,
  ClickedPlayAgain,
  StartedNewRun,
  CompletedSaveBestScore,
])
export type Message = typeof Message.Type

// COMMAND

export const GenerateRunSeed = Command.define(
  'GenerateRunSeed',
  StartedNewRun,
)(Random.nextInt.pipe(Effect.map(seed => StartedNewRun({ seed }))))

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

// UPDATE

const freshModel = (seed: number, best: number): Model => ({
  seed,
  roundIndex: INITIAL_ROUND_INDEX,
  board: generateBoard(seed, INITIAL_ROUND_INDEX),
  score: 0,
  status: 'Playing',
  best,
  isNewBest: false,
})

const titleModel = (best: number): Model => ({
  ...freshModel(INITIAL_SEED, best),
  status: 'Title',
})

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
          return [nextModel, isNewBest ? [SaveBestScore({ score: model.score })] : []]
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
      ClickedStartRun: () => [model, [GenerateRunSeed()]],
      ClickedPlayAgain: () => [model, [GenerateRunSeed()]],
      StartedNewRun: ({ seed }) => [freshModel(seed, model.best), []],
      CompletedSaveBestScore: () => [model, []],
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message, Flags> = ({ best }) => [
  titleModel(best),
  [],
]

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

const gameOverView = (score: number, best: number, isNewBest: boolean): Html =>
  div(
    [Role('dialog'), AriaLabel('Game Over'), Class('game-over')],
    [
      h2([Class('game-over-title')], ['Game Over']),
      p([Class('game-over-score'), AriaLabel('Final Score')], [score.toString()]),
      bestScoreView(best),
      ...(isNewBest ? [newBestFlourish()] : []),
      button([Class('play-again'), OnClick(ClickedPlayAgain())], ['Play again']),
    ],
  )

const titleView = (best: number): Html =>
  div(
    [Class('title-screen')],
    [
      p([Class('title-tagline')], ['Find the odd tile.']),
      bestScoreView(best),
      button([Class('start-run'), OnClick(ClickedStartRun())], ['Tap to play']),
    ],
  )

const statusView = (model: Model): ReadonlyArray<Html> =>
  M.value(model.status).pipe(
    M.when('Title', () => [titleView(model.best)]),
    M.when('Playing', () => [scoreView(model.score), boardView(model.board, false)]),
    M.when('GameOver', () => [
      scoreView(model.score),
      boardView(model.board, true),
      gameOverView(model.score, model.best, model.isNewBest),
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
