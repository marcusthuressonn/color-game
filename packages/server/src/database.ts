import { Config } from 'effect'
import { PgClient } from '@effect/sql-pg'

/**
 * Postgres client layer driven by the `DATABASE_URL` env var.
 *
 * The connection string is read as a redacted `Config` value so the password
 * stays out of logs. Where the database itself runs is HITL (see issue #20
 * Notes); locally something like
 * `postgres://postgres:postgres@localhost:5432/color_game` works.
 */
export const PgClientLayer = PgClient.layerConfig({
  url: Config.redacted('DATABASE_URL'),
})
