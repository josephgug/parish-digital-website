// Device tiering + DPR ladder (pipeline.md §2). Drives particle counts,
// fluid sim on/off, bloom resolution.

import { getGPUTier } from 'detect-gpu'

export type Tier = {
  tier: number
  isMobile: boolean
  dpr: () => number
  particles: number
  fluid: boolean
  bloom: boolean
  edgePulses: boolean
}

let cached: Tier | null = null

export async function resolveTier(): Promise<Tier> {
  if (cached) return cached

  let tier = 2
  let isMobile = false
  try {
    const gpu = await getGPUTier()
    tier = gpu.tier ?? 2
    isMobile = Boolean(gpu.isMobile)
  } catch {
    isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  const oversized =
    !isMobile && tier <= 0 && Math.max(window.innerWidth, window.innerHeight) > 1440

  const dpr = () => {
    const d = window.devicePixelRatio || 1
    if (oversized) return 1
    if (tier < 1) return Math.min(1.3, d)
    if (tier < 2) return Math.min(1.8, d)
    if (isMobile && tier < 3) return Math.min(2, d)
    if (tier > 3) return Math.max(1.5, d) // high-end FLOOR 1.5 — the crispness signature
    return Math.min(1.5, d)
  }

  const particles = isMobile
    ? tier < 2
      ? 12000
      : 30000
    : tier <= 1
      ? 24000
      : tier === 2
        ? 70000
        : 160000

  cached = {
    tier,
    isMobile,
    dpr,
    particles,
    fluid: !isMobile && tier >= 3,
    bloom: tier >= 1,
    edgePulses: tier >= 1,
  }
  return cached
}
