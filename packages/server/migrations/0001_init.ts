import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql/SqlClient'

/**
 * Baseline migration: no-op. The first migration only exists so the migrator
 * has somewhere to advance its bookkeeping pointer on a fresh database, and so
 * the wiring between {@link PgMigrator} and the on-disk migrations directory
 * is exercised end to end before any real schema lands.
 *
 * Real Leaderboard tables (Better Auth tables, `classic_results`,
 * `daily_results`) arrive in later slices of PRD #19.
 */
export default Effect.gen(function* () {
  const sql = yield* SqlClient
  yield* sql`SELECT 1`
})
