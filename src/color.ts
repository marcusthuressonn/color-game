import { Schema as S } from 'effect'

const DEGREES_PER_RADIAN = 180 / Math.PI
const RADIANS_PER_DEGREE = Math.PI / 180

const SRGB_TO_LINEAR_THRESHOLD = 0.04045
const SRGB_TO_LINEAR_SLOPE = 12.92
const SRGB_TO_LINEAR_OFFSET = 0.055
const SRGB_TO_LINEAR_DENOM = 1.055
const SRGB_TO_LINEAR_EXPONENT = 2.4

const LINEAR_TO_SRGB_THRESHOLD = 0.0031308
const LINEAR_TO_SRGB_SLOPE = 12.92
const LINEAR_TO_SRGB_OFFSET = 0.055
const LINEAR_TO_SRGB_SCALE = 1.055
const LINEAR_TO_SRGB_EXPONENT = 1 / 2.4

const BYTE_MAX = 255

/**
 * sRGB color with channels normalized to [0, 1].
 */
export type Srgb = Readonly<{ r: number; g: number; b: number }>

/**
 * OKLab color: perceptually-uniform lightness L and opponent axes a, b.
 */
export type OkLab = Readonly<{ L: number; a: number; b: number }>

/**
 * OKLCH color: cylindrical OKLab. L is lightness in [0, 1], C is chroma, h is hue in degrees.
 */
export const OkLch = S.Struct({
  L: S.Number,
  C: S.Number,
  h: S.Number,
})
export type OkLch = typeof OkLch.Type

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const srgbChannelToLinear = (channel: number): number =>
  channel <= SRGB_TO_LINEAR_THRESHOLD
    ? channel / SRGB_TO_LINEAR_SLOPE
    : Math.pow(
        (channel + SRGB_TO_LINEAR_OFFSET) / SRGB_TO_LINEAR_DENOM,
        SRGB_TO_LINEAR_EXPONENT,
      )

const linearChannelToSrgb = (channel: number): number =>
  channel <= LINEAR_TO_SRGB_THRESHOLD
    ? LINEAR_TO_SRGB_SLOPE * channel
    : LINEAR_TO_SRGB_SCALE * Math.pow(channel, LINEAR_TO_SRGB_EXPONENT) -
      LINEAR_TO_SRGB_OFFSET

const linearRgbToOklab = (linear: Srgb): OkLab => {
  const longCone =
    0.4122214708 * linear.r + 0.5363325363 * linear.g + 0.0514459929 * linear.b
  const midCone =
    0.2119034982 * linear.r + 0.6806995451 * linear.g + 0.1073969566 * linear.b
  const shortCone =
    0.0883024619 * linear.r + 0.2817188376 * linear.g + 0.6299787005 * linear.b

  const longRoot = Math.cbrt(longCone)
  const midRoot = Math.cbrt(midCone)
  const shortRoot = Math.cbrt(shortCone)

  return {
    L: 0.2104542553 * longRoot + 0.793617785 * midRoot - 0.0040720468 * shortRoot,
    a: 1.9779984951 * longRoot - 2.428592205 * midRoot + 0.4505937099 * shortRoot,
    b: 0.0259040371 * longRoot + 0.7827717662 * midRoot - 0.808675766 * shortRoot,
  }
}

const oklabToLinearRgb = (oklab: OkLab): Srgb => {
  const longRoot = oklab.L + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b
  const midRoot = oklab.L - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b
  const shortRoot = oklab.L - 0.0894841775 * oklab.a - 1.291485548 * oklab.b

  const longCone = longRoot * longRoot * longRoot
  const midCone = midRoot * midRoot * midRoot
  const shortCone = shortRoot * shortRoot * shortRoot

  return {
    r: 4.0767416621 * longCone - 3.3077115913 * midCone + 0.2309699292 * shortCone,
    g: -1.2684380046 * longCone + 2.6097574011 * midCone - 0.3413193965 * shortCone,
    b: -0.0041960863 * longCone - 0.7034186147 * midCone + 1.707614701 * shortCone,
  }
}

const oklchToOklab = (oklch: OkLch): OkLab => {
  const radians = oklch.h * RADIANS_PER_DEGREE
  return {
    L: oklch.L,
    a: oklch.C * Math.cos(radians),
    b: oklch.C * Math.sin(radians),
  }
}

const oklabToOklch = (oklab: OkLab): OkLch => {
  const chroma = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b)
  const hueDegrees = (Math.atan2(oklab.b, oklab.a) * DEGREES_PER_RADIAN + 360) % 360
  return { L: oklab.L, C: chroma, h: hueDegrees }
}

/**
 * Convert an OKLCH color into sRGB (channels in [0, 1], possibly out of gamut).
 */
export const oklchToSrgb = (oklch: OkLch): Srgb => {
  const linear = oklabToLinearRgb(oklchToOklab(oklch))
  return {
    r: linearChannelToSrgb(linear.r),
    g: linearChannelToSrgb(linear.g),
    b: linearChannelToSrgb(linear.b),
  }
}

/**
 * Convert an sRGB color (channels in [0, 1]) into OKLCH.
 */
export const srgbToOklch = (srgb: Srgb): OkLch =>
  oklabToOklch(
    linearRgbToOklab({
      r: srgbChannelToLinear(srgb.r),
      g: srgbChannelToLinear(srgb.g),
      b: srgbChannelToLinear(srgb.b),
    }),
  )

/**
 * Perceptual distance between two OKLCH colors in OKLab space (ΔEok).
 */
export const deltaEok = (a: OkLch, b: OkLch): number => {
  const labA = oklchToOklab(a)
  const labB = oklchToOklab(b)
  const dL = labA.L - labB.L
  const da = labA.a - labB.a
  const db = labA.b - labB.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

/**
 * Offset a color along the lightness axis by `distance` (positive = lighter,
 * negative = darker). The result clamps L into [0, 1], so the actual perceptual
 * delta may be smaller than requested near the lightness extremes.
 */
export const offsetLightness = (base: OkLch, distance: number): OkLch => ({
  L: clamp01(base.L + distance),
  C: base.C,
  h: base.h,
})

/**
 * True when an OKLCH color, when converted to sRGB, has every channel inside [0, 1].
 */
export const isInGamut = (oklch: OkLch): boolean => {
  const srgb = oklchToSrgb(oklch)
  return (
    srgb.r >= 0 && srgb.r <= 1 && srgb.g >= 0 && srgb.g <= 1 && srgb.b >= 0 && srgb.b <= 1
  )
}

/**
 * Format an sRGB color as a CSS `rgb(...)` string. Channels outside [0, 1] are clamped
 * so the output is always valid CSS.
 */
export const srgbToCss = (srgb: Srgb): string => {
  const r = Math.round(clamp01(srgb.r) * BYTE_MAX)
  const g = Math.round(clamp01(srgb.g) * BYTE_MAX)
  const b = Math.round(clamp01(srgb.b) * BYTE_MAX)
  return `rgb(${r}, ${g}, ${b})`
}
