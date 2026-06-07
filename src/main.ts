import { Array, Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { BOARD_SIZE, PLACEHOLDER_TILE_COLOR } from './board'

// MODEL

export const Model = S.Struct({})
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

export const init: Runtime.ProgramInit<Model, Message> = () => [{}, []]

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

const tileView = (): Html =>
  div(
    [
      Role('gridcell'),
      Class('tile'),
      Style({ 'background-color': PLACEHOLDER_TILE_COLOR }),
    ],
    [],
  )

const rowView = (): Html =>
  div(
    [Role('row'), Class('board-row')],
    Array.makeBy(BOARD_SIZE, () => tileView()),
  )

const boardView = (): Html =>
  div(
    [
      Role('grid'),
      AriaLabel('Board'),
      AriaRowcount(BOARD_SIZE),
      AriaColcount(BOARD_SIZE),
      Class('board'),
    ],
    Array.makeBy(BOARD_SIZE, () => rowView()),
  )

export const view = (_model: Model): Document => ({
  title: 'Color Game',
  body: div(
    [Class('app')],
    [h1([Class('title')], ['Color Game']), boardView()],
  ),
})
