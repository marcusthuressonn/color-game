import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { generateBoard } from './board'
import { Booted, type Model, update } from './main'

const initialModel: Model = {
  board: generateBoard(0xc010_4eed, 0),
}

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
