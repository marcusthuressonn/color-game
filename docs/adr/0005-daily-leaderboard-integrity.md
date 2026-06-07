# The Daily Leaderboard is keyed by local dayKey and trusts only signed-in live play

ADR-0003 flagged that adding a leaderboard would re-open the local-vs-UTC Seed question and that
client-only "one attempt per day" is unenforceable without a backend. That backend now exists, so
this ADR resolves both for the Daily Leaderboard.

**Keyed by local `dayKey`, not UTC.** Because the Daily Seed is a pure function of the *local*
calendar date (ADR-0003), two Players whose local date is the same `YYYY-MM-DD` derive the same Seed
→ the same Boards → directly comparable Scores, regardless of time zone. So local-date seeding is
*already* leaderboard-compatible; UTC's only added benefit is a single tight rollover/submission
instant. We keep local `dayKey` as the Leaderboard key, preserving the midnight-rollover habit that
justifies the Daily and avoiding the Streak-history desync ADR-0003 calls effectively permanent.
ADR-0003 stays valid — this only records which key the Leaderboard adopted.

**Verified = signed-in live play; honor-system for v1.** Replay verification (ADR-0004) cannot
protect the Daily: its Seed is public and shipped in the client, so anyone can pre-solve every Board
offline and emit a flawless, genuinely-valid replay. The only trust signal is the server witnessing
a live, signed-in Run. Therefore a Daily result is **Verified** only when played online while signed
in; a Daily played offline or logged out is **Unverified** — it feeds the Player's own history and
Streak but never the Leaderboard, no matter when it is uploaded. This structurally kills
archive-backfilling (you cannot rank a past `dayKey` by computing its public Seed offline). The
backend enforces one ranked submission per `(Account, dayKey)`, first write wins (mirroring the
"one locked attempt" rule).

## Trade-offs

- **Honor-system, not cryptographic.** A signed-in player can still pre-solve and submit a
  plausible Run; we are not detecting that in v1. We consciously do *not* claim the Daily Leaderboard
  is tamper-proof. The data model (Seed + tap log + timings per submission) is shaped so the Daily
  can later be upgraded to **server-authoritative** (server streams Boards one at a time, times the
  Run server-side) without reshaping the client's mental model. We defer that until farming is real.

- **Local key vs UTC fairness.** A local `dayKey` board stays "open" across a ~26h+ wall-clock sweep
  as the date crosses time zones (plus a short offline-upload tail). We accept the wide, fuzzy window
  because v1 is honor-system anyway; UTC would buy a tight window at the cost of the habit feel and a
  permanent Streak-history desync.

## Why this is hard to reverse

Once Players accrue ranked Daily history, the `dayKey` → Board → result mapping is permanent (the
ADR-0003 argument). Switching the Leaderboard key to UTC later would re-point which Board belongs to
which date and desynchronize existing boards and Streaks. The local `dayKey` key is a stable contract
for as long as Daily Leaderboard history exists.
