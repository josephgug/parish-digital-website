// Coarse, low-frequency bridge between the engine loop and React.
// Per-frame numbers are written straight to the DOM by the engine; only
// *discrete* state (active section, past-the-fold, burst) goes through here,
// so React re-renders a handful of times per session, not 60x/second.

import { useSyncExternalStore } from 'react'
import type { Engine } from './Engine'

export type UiState = {
  active: string
  scrolled: boolean
  burst: boolean
  ready: boolean
  webgl: boolean
}

let state: UiState = { active: 'hero', scrolled: false, burst: false, ready: false, webgl: true }
const subs = new Set<() => void>()

const subscribe = (cb: () => void) => {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function setUiState(patch: Partial<UiState>) {
  let changed = false
  for (const k of Object.keys(patch) as Array<keyof UiState>) {
    if (state[k] !== patch[k]) changed = true
  }
  if (!changed) return
  state = { ...state, ...patch }
  subs.forEach((s) => s())
}

export const useUiState = () => useSyncExternalStore(subscribe, () => state, () => state)

let engine: Engine | null = null
export const setEngine = (e: Engine | null) => {
  engine = e
  // dev/preview handle for the QA harness and manual poking
  if (typeof window !== 'undefined') (window as unknown as { __ENGINE?: Engine | null }).__ENGINE = e
  return e
}
export const getEngine = () => engine

const NAV_H = 72

/** Scroll a DOM section into view through the virtual scroll (never window.scrollTo). */
export function scrollToId(id: string, time = 900) {
  const e = engine
  if (!e) return
  if (id === '' || id === 'top') return e.scrollTo(0, time)
  const el = document.getElementById(id)
  const content = document.getElementById('scroll-content')
  if (!el || !content) return
  const top = el.getBoundingClientRect().top - content.getBoundingClientRect().top
  e.scrollTo(Math.max(0, top - NAV_H), time)
}
