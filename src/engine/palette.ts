// Palette pulled from the repo's Tailwind tokens + parish-digital-brand-reference.md.
// Do not invent values here.

export const PD = {
  /** body / clear color — --color-teal-900 */
  base: 0x080f0d,
  /** fog + depth haze, a touch cooler than base */
  fog: 0x061310,
  /** brand primary (deep teal) */
  deep: 0x0f6e56,
  /** brand accent (bright teal) — the primary glow */
  teal: 0x1d9e75,
  /** logomark teal — highlights, node cores */
  mark: 0x5dcaa5,
  /** NOTE: brand ref defines no warm secondary; this amber is a proposal
   *  used only for the active-section highlight + CTA glow. Flag for Joe. */
  warm: 0xe8a657,
} as const

export const vec3 = (hex: number): [number, number, number] => [
  ((hex >> 16) & 255) / 255,
  ((hex >> 8) & 255) / 255,
  (hex & 255) / 255,
]
