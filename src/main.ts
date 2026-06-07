import { Array, Effect, Match as M, Random, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Board, generateBoard } from './board'
import { type OkLch, oklchToSrgb, srgbToCss } from './color'

const INITIAL_SEED = 0xc010_4eed
const INITIAL_ROUND_INDEX = 0

// MODEL

export const Status = S.Literals(['Playing', 'GameOver'])
export type Status = typeof Status.Type

export const Model = S.Struct({
  seed: S.Number,
  roundIndex: S.Number,
  board: Board,
  score: S.Number,
  status: Status,
})
export type Model = typeof Model.Type

// MESSAGE

export const Booted = m('Booted')
export const TappedTile = m('TappedTile', { index: S.Number })
export const ClickedPlayAgain = m('ClickedPlayAgain')
export const StartedNewRun = m('StartedNewRun', { seed: S.Number })

export const Message = S.Union([Booted, TappedTile, ClickedPlayAgain, StartedNewRun])
export type Message = typeof Message.Type

// COMMAND

export const GenerateRunSeed = Command.define(
  'GenerateRunSeed',
  StartedNewRun,
)(Random.nextInt.pipe(Effect.map(seed => StartedNewRun({ seed }))))

// UPDATE

const freshModel = (seed: number): Model => ({
  seed,
  roundIndex: INITIAL_ROUND_INDEX,
  board: generateBoard(seed, INITIAL_ROUND_INDEX),
  score: 0,
  status: 'Playing',
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
        if (model.status === 'GameOver') {
          return [model, []]
        }
        if (index !== model.board.targetIndex) {
          return [{ ...model, status: 'GameOver' }, []]
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
      ClickedPlayAgain: () => [model, [GenerateRunSeed()]],
      StartedNewRun: ({ seed }) => [freshModel(seed), []],
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  freshModel(INITIAL_SEED),
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
      Class(
        isRevealed && index === board.targetIndex ? 'tile tile-revealed' : 'tile',
      ),
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

const gameOverView = (score: number): Html =>
  div(
    [Role('dialog'), AriaLabel('Game Over'), Class('game-over')],
    [
      h2([Class('game-over-title')], ['Game Over']),
      p([Class('game-over-score'), AriaLabel('Final Score')], [score.toString()]),
      button(
        [Class('play-again'), OnClick(ClickedPlayAgain())],
        ['Play again'],
      ),
    ],
  )

export const view = (model: Model): Document => {
  const isGameOver = model.status === 'GameOver'
  return {
    title: 'Color Game',
    body: div(
      [Class('app')],
      [
        h1([Class('title')], ['Color Game']),
        scoreView(model.score),
        boardView(model.board, isGameOver),
        ...(isGameOver ? [gameOverView(model.score)] : []),
      ],
    ),
  }
}
