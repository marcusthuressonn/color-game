import { Schema as S } from 'effect'

export const Mode = S.Literals(['Classic', 'Daily'])
export type Mode = typeof Mode.Type
