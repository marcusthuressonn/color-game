import { Array } from 'effect'

export const BOARD_SIZE = 5

export const TILE_COUNT = BOARD_SIZE * BOARD_SIZE

export const PLACEHOLDER_TILE_COLOR = '#7faec9'

export const rowIndices: ReadonlyArray<number> = Array.makeBy(
  BOARD_SIZE,
  index => index,
)

export const columnIndices: ReadonlyArray<number> = rowIndices
