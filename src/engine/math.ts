// Frame-rate-normalized math. Baseline is 120 Hz — NOT 60.
// A 60 Hz baseline makes every ease 2x too slow (the #1 way rebuilds feel wrong).

export const HZ_BASELINE = 120

let FRAME_HZ = 1

/** Call once per frame with the frame delta in ms. */
export function tickHz(dtMs: number) {
  FRAME_HZ = Math.max(0.001, dtMs / (1000 / HZ_BASELINE))
}

export function frameHz() {
  return FRAME_HZ
}

export const clamp = (v: number, a = 0, b = 1) =>
  Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b))

export const range = (v: number, a: number, b: number, c: number, d: number) =>
  c + (d - c) * ((v - a) / (b - a))

export const crange = (v: number, a: number, b: number, c: number, d: number) =>
  c + (d - c) * clamp((v - a) / (b - a))

/** dt-normalized alpha for a per-120fps-frame ease constant. */
export const aHz = (alpha: number) => 1 - Math.exp(Math.log(1 - clamp(alpha)) * FRAME_HZ)

export const lerpHz = (target: number, value: number, alpha: number) =>
  value + (target - value) * aHz(alpha)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Stagger helper for per-glyph reveals (scene-recipes §7). */
export const rangeTransition = (p: number, f: number, pad: number) =>
  crange(p, f * (1 - pad), f * (1 - pad) + pad, 0, 1)

// ---- tween lib (engine-local; GSAP/motion stay on the DOM layer) ----

export const Eases = {
  linear: (t: number) => t,
  easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
} as const

export type EaseName = keyof typeof Eases

type Tween = {
  obj: Record<string, number>
  key: string
  from: number
  to: number
  ms: number
  t0: number
  ease: EaseName
  onDone?: () => void
}

const tweens: Tween[] = []

/** Tween a numeric property. Driven by the master rAF — no second loop. */
export function tween(
  obj: Record<string, number>,
  key: string,
  to: number,
  ms: number,
  ease: EaseName = 'easeInOutCubic',
  onDone?: () => void,
) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    if (tweens[i].obj === obj && tweens[i].key === key) tweens.splice(i, 1)
  }
  tweens.push({ obj, key, from: obj[key], to, ms, t0: performance.now(), ease, onDone })
}

export function killTweens(obj: Record<string, number>, key?: string) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    if (tweens[i].obj === obj && (key === undefined || tweens[i].key === key)) tweens.splice(i, 1)
  }
}

/** Advance all tweens. Called once per frame from the master loop. */
export function updateTweens(now: number) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]
    const t = tw.ms <= 0 ? 1 : clamp((now - tw.t0) / tw.ms)
    tw.obj[tw.key] = tw.from + (tw.to - tw.from) * Eases[tw.ease](t)
    if (t >= 1) {
      tweens.splice(i, 1)
      tw.onDone?.()
    }
  }
}
