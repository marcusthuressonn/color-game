# The Daily Challenge seeds from the player's local calendar date

The Daily Challenge needs a Seed that is the same for every player on a given day (so Boards and
Scores are comparable) and that rolls over on a schedule that supports a daily habit. We derive the
Seed from the player's **local** calendar date, not UTC.

Combined with ADR-0001 (Boards are a pure function of the Seed), a local date string maps
deterministically to that day's sequence of Boards. The Daily rolls over at the player's own
midnight, matching the morning-ritual mental model that drives daily return — the same choice
Wordle makes.

## Trade-offs

- **Local vs UTC.** UTC would flip every player to the same Board at the same global instant, which
  is "fairer" for a live, cross-timezone leaderboard. We have no backend and no leaderboard yet, so
  that fairness buys nothing today, while UTC's odd-local-hour rollover actively fights the habit.
  Because board generation is pure (ADR-0001), a future server leaderboard can adopt a UTC canonical
  seed without changing board generation — so we are not foreclosing that path.

- **One attempt, client-enforced.** The Daily is one locked attempt per local day. Without a
  backend this is enforced only in client state, so a player can change their device clock to play
  ahead or replay ("time travel"). We accept this loophole: with no leaderboard, cheating only
  affects the cheater's own streak. Closing it requires server-side validation of the date and
  attempt, which arrives with the planned Effect backend — not before.

## Why this is hard to reverse

Once players accumulate Streaks, the mapping from a calendar date to that day's Board and to their
recorded result is effectively permanent. Switching to UTC later would shift which Board belongs to
which date and desynchronize existing Streak history. Treat the local-date seed as a stable contract
for as long as client-side Daily history exists.
