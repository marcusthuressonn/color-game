# A full self-hosted Effect backend on Node, with Better Auth (Google OAuth) for identity

The Leaderboard and the planned Versus Mode require a backend with real, authenticated identity.
This crosses the line `CLAUDE.md` drew ("a future Effect backend is planned but out of scope for v1
— the v1 game is fully client-side"): that backend is now arriving. We build it as a **hand-rolled
Effect backend** (`@effect/platform` on `@effect/platform-node`), not a managed backend (e.g.
Supabase). This keeps the server, the database, and the data self-hosted and on-idiom with the
Foldkit/Effect architecture, and — critically — lets the server import the **same pure core**
(`board.ts`/`difficulty.ts`/`prng.ts`) verbatim, which is what makes replay verification work
(ADR-0004).

**Identity: Better Auth, Google OAuth only to start.** We do not hand-roll auth. Better Auth is
self-hosted (it owns its tables in *our* Postgres), so it fits "full Effect backend" while sparing us
password hashing, session management, CSRF, and the OAuth dance. Google OAuth is the launch front
door: lowest friction, a verified identity, no passwords stored, no transactional email to operate.
Apple/magic-link/password are additive in Better Auth and deferred until needed (Apple when iOS
matters).

**Integration bridge: hand-written from official primitives.** Better Auth is mounted as an
imperative island at `/api/auth/*` via `toNodeHandler(auth.handler)`, and an Effect service wraps
`auth.api.getSession({ headers })` for route middleware to resolve the current Account. We write this
~30–40 line bridge ourselves rather than depend on a pre-1.0 community shim
(`@effectify/node-better-auth`, proprietary; `effect-better-auth`, Apache-2.0 but `0.1.0`). Both sit
on the auth-critical path and are single-maintainer; we read them as reference implementations only.
If a dependency later proves worthwhile, prefer the Apache-2.0 one and vendor/pin it.

## Naming collision — keep out of CONTEXT.md

Better Auth's schema uses **`account`** to mean *a linked provider credential* (the row joining a
user to "Google"). This is **not** our domain `Account`. The mapping is: our **`Account` == Better
Auth's `user` table**; Better Auth's `account` table is an implementation detail with no domain
meaning. Better Auth's vocabulary must not leak into the glossary.

## Trade-offs

- **Hand-rolled Effect vs managed (Supabase) vs hybrid.** Managed would hand us auth, Postgres, and
  realtime for free and de-risk Versus matchmaking, but diverges from the stated architecture and
  adds a managed-service dependency. We chose self-hosted Effect for idiom and data ownership, and to
  keep the deterministic core as the single client+server source of truth. The cost we accept: we
  operate the backend and its database ourselves, and we own the Versus realtime transport when it
  arrives.

- **Better Auth as a non-Effect island.** A Promise-based library wrapped by, not written in, Effect.
  The bridge is small and the idiom dent is contained to the auth seam.

## Why this is hard to reverse

The choice of identity provider and session model becomes load-bearing the moment Players have
Accounts: Verified Scores, Streaks, and history all hang off Account identity. Migrating identity
providers later means migrating every Account and its attached history. Crossing the client-side-only
line is likewise a one-way door — once a Leaderboard exists, the game is no longer purely
client-side.
