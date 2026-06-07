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
A named rule-set that parameterizes a Run — what failure conditions apply, whether there is time
pressure, how difficulty ramps. The default Mode is untimed (a Round ends only on a tap).
_Avoid_: Variant, ruleset, difficulty

**Seed**:
A value from which a Run's entire sequence of Boards (and their Targets) is generated
deterministically. Two Runs with the same Seed and Mode present identical Boards in identical order.
_Avoid_: Key, random seed

**Daily Challenge**:
A Run whose Seed is derived from the calendar day, so every player faces the same Boards that day
and scores are directly comparable.
_Avoid_: Daily, challenge of the day

**Score**:
The number of Targets a Player correctly found before a Run ended (i.e. Rounds completed).
_Avoid_: Points, result

**Player**:
A person playing the game, identified well enough to attribute a Score on the Leaderboard.
_Avoid_: User, account

**Leaderboard**:
The ranked list of Players' Scores for a given Daily Challenge.
_Avoid_: Highscores, ranking

## Relationships

- A **Run** is played in exactly one **Mode**
- A **Run** is generated from exactly one **Seed**
- A **Mode** determines the rules of a **Run** (time pressure, failure conditions, difficulty ramp)
- A **Daily Challenge** is a **Run** whose **Seed** is fixed by the calendar day
- A **Run** is a sequence of one or more **Rounds**
- A **Round** presents exactly one **Board**
- A **Board** contains many **Tiles**, exactly one of which is the **Target**
- A wrong tap (tapping a non-Target Tile) ends the **Run**

## Example dialogue

> **Dev:** "When the player taps the **Target**, do we keep the same **Board**?"
> **Designer:** "No — a correct tap completes the **Round** and generates a new, harder **Board** for the next **Round**. The **Run** continues until they tap a non-Target **Tile**."

## Flagged ambiguities

- _(none yet)_
