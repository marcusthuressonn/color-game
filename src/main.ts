import { Array, Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Board, generateBoard } from './board'
import { type OkLch, oklchToSrgb, srgbToCss } from './color'

const INITIAL_SEED = 0xc010_4eed
const INITIAL_ROUND_INDEX = 0

// MODEL

export const Status = S.Literals(['Playing'])
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

export const Message = S.Union([Booted, TappedTile])
export type Message = typeof Message.Type

// UPDATE

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
        if (index !== model.board.targetIndex) {
          return [model, []]
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
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    seed: INITIAL_SEED,
    roundIndex: INITIAL_ROUND_INDEX,
    board: generateBoard(INITIAL_SEED, INITIAL_ROUND_INDEX),
    score: 0,
    status: 'Playing',
  },
  [],
]

// VIEW

const {
  div,
  h1,
  p,
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

const tileView = (board: Board, index: number): Html =>
  div(
    [
      Role('gridcell'),
      Class('tile'),
      Style({ 'background-color': srgbToCss(oklchToSrgb(tileColorAt(board, index))) }),
      OnClick(TappedTile({ index })),
    ],
    [],
  )

const rowView = (board: Board, rowIndex: number): Html =>
  div(
    [Role('row'), Class('board-row')],
    Array.makeBy(board.size, columnIndex =>
      tileView(board, rowIndex * board.size + columnIndex),
    ),
  )

const boardView = (board: Board): Html =>
  div(
    [
      Role('grid'),
      AriaLabel('Board'),
      AriaRowcount(board.size),
      AriaColcount(board.size),
      Class('board'),
    ],
    Array.makeBy(board.size, rowIndex => rowView(board, rowIndex)),
  )

const scoreView = (score: number): Html =>
  p([Class('score'), AriaLabel('Score')], [score.toString()])

export const view = (model: Model): Document => ({
  title: 'Color Game',
  body: div(
    [Class('app')],
    [
      h1([Class('title')], ['Color Game']),
      scoreView(model.score),
      boardView(model.board),
    ],
  ),
})
