import { Array, Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Board, generateBoard } from './board'
import { type OkLch, oklchToSrgb, srgbToCss } from './color'

const INITIAL_SEED = 0xc010_4eed
const INITIAL_ROUND_INDEX = 0

// MODEL

export const Model = S.Struct({
  board: Board,
})
export type Model = typeof Model.Type

// MESSAGE

export const Booted = m('Booted')

export const Message = S.Union([Booted])
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
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  { board: generateBoard(INITIAL_SEED, INITIAL_ROUND_INDEX) },
  [],
]

// VIEW

const {
  div,
  h1,
  Class,
  Style,
  Role,
  AriaLabel,
  AriaRowcount,
  AriaColcount,
} = html<Message>()

const tileColorAt = (board: Board, index: number): OkLch =>
  index === board.targetIndex ? board.targetColor : board.baseColor

const tileView = (board: Board, index: number): Html =>
  div(
    [
      Role('gridcell'),
      Class('tile'),
      Style({ 'background-color': srgbToCss(oklchToSrgb(tileColorAt(board, index))) }),
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

export const view = (model: Model): Document => ({
  title: 'Color Game',
  body: div(
    [Class('app')],
    [h1([Class('title')], ['Color Game']), boardView(model.board)],
  ),
})
