import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { Booted, type Model, update } from './main'

const initialModel: Model = {}

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
})
