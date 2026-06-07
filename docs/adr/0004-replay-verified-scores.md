# Leaderboard Scores are replay-verified, and every result is stored as a row

The Leaderboard makes a Score a public claim, so the backend must decide whether to *trust* a
submitted Score or *prove* it. We prove it by **replay**: a ranked Run is recorded as its Seed plus
the ordered tap log (and per-tap timings). On submission the server re-runs the **same pure board
generation** (`board.ts`, `difficulty.ts`, `prng.ts` — ADR-0001) and confirms those taps actually
produce that Score. A forged Score fails because no tap log reproduces it.

This works because Boards are a pure, deterministic function of the Seed (ADR-0001): the client and
server share the exact same pure modules as the single source of truth. The full Effect backend runs
on Node, so those modules are imported verbatim server-side — no reimplementation, no
cross-language drift.

Every Verified result is persisted as **its own row** (Score + Total Time + achieved-at + tap log),
not collapsed into a single best-Score column per Account. The all-time Leaderboard is then a
`MAX`/`GROUP BY` query; future daily/weekly windows are a `WHERE achieved_at > …` away. The retained
rows double as the anti-cheat audit trail.

## Trade-offs

- **Verify vs trust vs server-authoritative.** Pure trust (store whatever the client sends) makes the
  board trivially cheatable and renders real accounts almost pointless. Server-authoritative Runs
  (server streams Boards, validates each tap live) are uncheatable but break offline-first play and
  the "play offline, upload later" flow. Replay verification sits between: it preserves offline play
  and is nearly free given a deterministic engine, while killing the 99% case (raw Score inflation).

- **What replay does not catch.** A determined cheater can still forge a *plausible* tap log with
  fake-but-believable timings. We accept this for v1 and may later layer Total-Time sanity bounds.
  For the **Daily** specifically, replay proves nothing at all — see ADR-0005.

- **Storage cost.** Keeping every ranked Run (with tap logs) rather than a single PB row costs more
  storage and turns a flat read into an aggregate query. At a casual game's volume this is
  negligible, and it is the price of ever offering windowed boards or auditing a score.

## Why this is hard to reverse

The client must record tap logs **from the first ranked Run**. A Run played before this existed has
no replay and can never be retroactively verified. Likewise, collapsing to a single best-Score column
would discard the history that windowed boards and audits depend on — unrecoverable once thrown away.
Treat "ranked Runs carry their replay, and every result is a retained row" as a standing contract.
