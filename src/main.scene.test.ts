import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = {}

describe('scene', () => {
  test('renders the game title', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('Color Game')).toExist(),
    )
  })

  test('renders the tagline', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('Find the odd shade.')).toExist(),
    )
  })
})
