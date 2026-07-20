// Instrumentation hook for qa/verify-scroll.mjs (pipeline.md §7).
// Present in dev and on Vercel preview deploys (the gate runs against the
// preview URL); stripped on the production host.

export type RigFrame = {
  f: number
  t: number
  dt: number
  uScroll: number
  uScrollDelta: number
  camZ: number
}

/** Raw wheel events as the hardware delivered them — deltaMode is the thing
 *  synthetic Playwright wheels can't reproduce, so it has to be observable. */
export type RigWheel = { deltaMode: number; deltaY: number; scale: number; t: number }

export type Rig = { frames: RigFrame[]; wheel: RigWheel[]; enabled: boolean; _f: number }

const host = typeof location !== 'undefined' ? location.hostname : ''
const isPreview = /\.vercel\.app$/.test(host) || host === 'localhost' || host === '127.0.0.1'
const forced = typeof location !== 'undefined' && /[?&]rig=1/.test(location.search)

export const RIG_ENABLED = Boolean(import.meta.env.DEV) || isPreview || forced

declare global {
  interface Window {
    __RIG?: Rig
    /** live engine handle — geometry/runway inspection for the scroll gate */
    __ENGINE?: unknown
  }
}

export const rig: Rig = { frames: [], wheel: [], enabled: false, _f: 0 }

/** Always-on ring buffer (last 50) so `__RIG.wheel` answers "what is my mouse
 *  actually sending?" on a real machine without arming a capture first. */
export function rigWheel(deltaMode: number, deltaY: number, scale: number) {
  if (!RIG_ENABLED) return
  rig.wheel.push({ deltaMode, deltaY, scale, t: performance.now() })
  if (rig.wheel.length > 50) rig.wheel.shift()
}

if (RIG_ENABLED && typeof window !== 'undefined') window.__RIG = rig

export function rigPush(f: Omit<RigFrame, 'f'>) {
  if (!RIG_ENABLED) return
  if (rig.enabled && rig.frames.length < 6000) rig.frames.push({ f: rig._f, ...f })
  rig._f++
}
