import { Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

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

export const view = (_model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Color Game',
    body: h.div(
      [h.Class('app')],
      [
        h.h1([h.Class('title')], ['Color Game']),
        h.p([h.Class('tagline')], ['Find the odd shade.']),
      ],
    ),
  }
}
