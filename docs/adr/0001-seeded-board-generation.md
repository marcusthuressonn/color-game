# Boards are generated deterministically from a Seed

Daily Challenge requires every player to face identical Boards on a given day, and future
asynchronous multiplayer will require two players to face identical Boards for a fair comparison.
We therefore generate every Board — its Tiles, their base color, and which Tile is the Target — as a
pure function of `(Seed, Round index)` via a seeded PRNG. No `Math.random()`, no wall-clock, no
device-specific behavior anywhere in Board generation.

This applies to all Modes, not just Daily Challenge: making generation uniformly deterministic keeps
the engine simple (one code path) and means any Run can be reproduced or shared by its Seed.

Trade-off: all difficulty and color logic must be pure and reproducible. We give up the convenience
of ambient randomness, and we must choose a stable, well-defined PRNG so that the same Seed yields
the same Boards across versions and platforms.
