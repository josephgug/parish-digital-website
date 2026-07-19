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

export type Rig = { frames: RigFrame[]; enabled: boolean; _f: number }

const host = typeof location !== 'undefined' ? location.hostname : ''
const isPreview = /\.vercel\.app$/.test(host) || host === 'localhost' || host === '127.0.0.1'
const forced = typeof location !== 'undefined' && /[?&]rig=1/.test(location.search)

export const RIG_ENABLED = Boolean(import.meta.env.DEV) || isPreview || forced

declare global {
  interface Window {
    __RIG?: Rig
  }
}

export const rig: Rig = { frames: [], enabled: false, _f: 0 }

if (RIG_ENABLED && typeof window !== 'undefined') window.__RIG = rig

export function rigPush(f: Omit<RigFrame, 'f'>) {
  if (!RIG_ENABLED) return
  if (rig.enabled && rig.frames.length < 6000) rig.frames.push({ f: rig._f, ...f })
  rig._f++
}
