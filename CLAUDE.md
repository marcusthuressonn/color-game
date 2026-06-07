# CLAUDE.md

## Tech stack

This is a **Foldkit** web app: TypeScript, built on **Effect**, architected like Elm (pure
`update`/`view`, unidirectional data flow, side effects only at runtime seams). A future Effect
backend is planned but out of scope for v1 — the v1 game is fully client-side.

**Before writing or modifying any app code you MUST use the bundled skills (they live in
`.claude/skills/`, so they are auto-discovered — invoke them):**

- **Foldkit** (frontend + app architecture) — use the `foldkit` skill. Foldkit is non-incremental:
  no React, no escape hatches, one idiomatic shape. Model behavior, don't pick libraries. The
  canonical reference is the vendored subtree at `repos/foldkit/` (if present) — pattern-match against
  its `examples/` and the typing-game rather than guessing APIs.
- **Effect-TS** (Effect patterns, services, layers, error handling) — use the `effect-ts` skill for
  any Effect code.

### Testing

Tests run on **Vitest** (`happy-dom` for view rendering). Two Foldkit-native styles, both
`import { Scene, Story } from 'foldkit'`:

- **Story testing** — exercises `update` directly (send Messages, assert the Model, resolve Commands
  inline). Use for pure game logic (e.g. the Run reducer).
- **Scene testing** — drives the real view via accessible locators (click/type/role/label). Use for
  screen flow and tap → Tile behavior.

Pure modules (Color, Seeded PRNG, Difficulty curve, Board generator) get plain Vitest unit tests.

This project uses **pnpm** (pinned via the `packageManager` field in `package.json`; enable with
Corepack). Don't use npm or yarn.

Scripts: `pnpm run dev` (vite), `pnpm run typecheck` (`tsc --noEmit`), `pnpm run test` (`vitest run`).
Run `pnpm run typecheck && pnpm run test` before every commit.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as GitHub issues on `marcusthuressonn/color-game` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five canonical label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
