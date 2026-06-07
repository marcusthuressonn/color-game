# Color Game

A color-discrimination arcade game: the player is shown a grid of identically-colored tiles
with exactly one slightly-different tile, and must tap that odd tile. The game gets harder each
round and ends on the first mistake.

## Language

**Board**:
The full grid of tiles shown at a single moment.
_Avoid_: Grid, level, screen

**Tile**:
A single colored cell within a Board.
_Avoid_: Cell, square, block

**Target**:
The one Tile on a Board whose shade differs from all the others — the Tile the player must tap.
_Avoid_: Odd one, correct tile, answer

**Round**:
One Board plus the player's single attempt to find its Target.
_Avoid_: Turn, level, stage

**Run**:
One continuous sequence of Rounds, from the first Round until the player makes a mistake and the
game ends. The unit a score is attached to.
_Avoid_: Game, session, playthrough

**Mode**:
A named preset a Player picks to start a Run. Each Mode is distinguished by its seed source (random
vs date-derived vs shared), whether it is solo or versus another Player, and its rules (time
pressure, failure conditions, difficulty ramp). The current Modes are **Classic** and **Daily
Challenge**; both are solo and untimed. Adding something like Multiplayer or Time Attack means adding
a new Mode, not reshaping the existing ones.
_Avoid_: Variant, ruleset, difficulty, level

**Classic**:
The Mode a Player can start any time: untimed, replayable without limit, each Run from a fresh
random Seed. The "play whenever" Mode.
_Avoid_: Practice, endless, free play

**Total Time**:
The elapsed wall-clock duration of a Run, from its first Round to the Run ending. Recorded as a
stat, never a failure condition (the clock never ends a Run). In the Daily Challenge it is the
tiebreaker between equal Scores.
_Avoid_: Timer, clock, duration

**Streak**:
The count of consecutive local calendar days on which the Player has played the Daily Challenge.
Broken only by missing a day — never by a low Score. The unit of the daily habit.
_Avoid_: Chain, run (Run is a different term)

**Seed**:
A value from which a Run's entire sequence of Boards (and their Targets) is generated
deterministically. Two Runs with the same Seed and Mode present identical Boards in identical order.
_Avoid_: Key, random seed

**Daily Challenge**:
A Mode whose Seed is derived from the Player's local calendar date, so every Player faces the same
Boards on a given day and Scores are directly comparable. Exactly one attempt per local day: once
the Run ends it is locked until the next local midnight. Ranked by Score, then by Total Time as
tiebreaker.
_Avoid_: Daily, challenge of the day

**Score**:
The number of Targets a Player correctly found before a Run ended (i.e. Rounds completed).
_Avoid_: Points, result

**Player**:
A person playing the game. May play anonymously (local-first, offline) or sign into an **Account**.
A Player without an Account never appears on a **Leaderboard**.
_Avoid_: User

**Account**:
The persistent, authenticated identity a Player signs into. It owns the Player's **Verified** Scores,
display name, and cross-device history, and is the unit a **Leaderboard** ranks — every Leaderboard
row is an Account, never a bare Player. One Account may be used across many devices.
_Avoid_: User, login, profile

**Leaderboard**:
A ranked list of Players' **Verified** Scores for a given Mode. The Daily Challenge has one
Leaderboard per `dayKey`; Classic has its own. Ranked by Score, then Total Time as tiebreaker. Only
**Verified** results appear — an **Unverified** result never does.
_Avoid_: Highscores, ranking

**Verified**:
A property of a recorded Run result meaning the system can trust it enough to rank it. A Classic
result is Verified by replaying its tap log against the Run's secret Seed (the Seed was random, so a
matching replay proves the Run happened). A Daily Challenge result is Verified only when the server
witnessed it during live, signed-in play (the Daily Seed is public, so a replay proves nothing). An
**Unverified** result — e.g. a Daily played offline or logged out — still counts toward the Player's
own history and Streak, but never appears on a Leaderboard.
_Avoid_: Validated, trusted, confirmed

## Relationships

- A **Run** is played in exactly one **Mode**
- A **Run** is generated from exactly one **Seed**
- A **Mode** determines the rules of a **Run** (time pressure, failure conditions, difficulty ramp)
- A **Daily Challenge** is a **Mode** whose **Seed** is fixed by the Player's local calendar date
- A Player gets exactly one **Run** of the **Daily Challenge** per local day; it locks once ended
- A **Streak** counts consecutive local days the Player played the **Daily Challenge**
- A **Streak** belongs to the Player, not a device: on sign-in it is recomputed over the union of days the Player played the Daily across all devices
- Every **Run** records a **Total Time**; in the **Daily Challenge** it breaks ties between equal **Scores**
- A **Player** may sign into one **Account**; an anonymous Player has none and never appears on a **Leaderboard**
- Every **Leaderboard** row is an **Account**, never a bare **Player**
- Only a **Verified** Run result appears on a **Leaderboard**; a Classic result is Verified by replay, a Daily result only by signed-in live play
- An **Unverified** result still counts toward the Player's own history and **Streak**, never a **Leaderboard**
- A **Run** is a sequence of one or more **Rounds**
- A **Round** presents exactly one **Board**
- A **Board** contains many **Tiles**, exactly one of which is the **Target**
- A wrong tap (tapping a non-Target Tile) ends the **Run**

## Example dialogue

> **Dev:** "When the player taps the **Target**, do we keep the same **Board**?"
> **Designer:** "No — a correct tap completes the **Round** and generates a new, harder **Board** for the next **Round**. The **Run** continues until they tap a non-Target **Tile**."

## Flagged ambiguities

- _(none yet)_
