# Color difficulty is a perceptual distance in OKLab, applied along lightness in v1

The challenge of a Round is "how different is the Target from the other Tiles." We define that
difference as a **perceptual distance** — the Euclidean distance between the two colors in OKLab
space (ΔEok) — rather than a raw RGB/HSL channel offset. A given RGB offset is wildly easier or
harder to see depending on hue; an OKLab distance is roughly equally perceivable everywhere, so the
difficulty curve is honest and reproducible.

We separate **magnitude** from **direction**:

- **Magnitude** = the OKLab distance between Target and base color. This single scalar is the
  Round's difficulty and is what shrinks each Round.
- **Direction** = which way the Target is offset in OKLab space. In v1 the direction is **lightness
  only** (Target is a lighter or darker version of the base, same hue and chroma). Direction is a
  parameter so future Modes can introduce chroma/hue variety without changing the difficulty metric
  or invalidating existing scores.

Why lightness-only for v1: lightness is the most reliably discriminable axis across the whole gamut
(hue/chroma shifts are nearly invisible at low chroma), and lightness moves from a mid-range base
almost never leave the sRGB gamut — chroma/hue moves frequently clip, which would distort the actual
delta and break reproducibility across devices.

Trade-off: every Board looks like "find the slightly lighter/darker Tile," which is less visually
varied than mixing in hue/chroma shifts. We accept that for v1 in exchange for fairness, gamut
safety, and a single tunable difficulty knob. Combined with ADR-0001, the base color and the
distance for each Round are pure functions of (Seed, Round index).
