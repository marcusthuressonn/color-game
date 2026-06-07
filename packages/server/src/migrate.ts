import { PgMigrator } from '@effect/sql-pg'

import baseline0001 from '../migrations/0001_init.ts'

/**
 * Migration loader: declares the ordered list of migrations as a record keyed
 * by `<id>_<name>`. The keys are parsed by {@link PgMigrator.fromRecord} so
 * each migration runs exactly once, ordered by id.
 */
const migrations = PgMigrator.fromRecord({
  '0001_init': baseline0001,
})

/**
 * Postgres migrator layer. When acquired, the migrator ensures its bookkeeping
 * table exists and runs any pending migrations against the configured
 * `PgClient` before dependent services are constructed.
 */
export const MigratorLayer = PgMigrator.layer({
  loader: migrations,
  table: 'color_game_migrations',
})
