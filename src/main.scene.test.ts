import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = {}

describe('scene', () => {
  test('renders the game title', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'Color Game' })).toExist(),
    )
  })

  test('renders the Board as a grid', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('grid', { name: 'Board' })).toExist(),
    )
  })

  test('renders exactly 25 Tiles', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('gridcell')).toHaveCount(25),
    )
  })
})
