// The PD logomark IS a node-edge graph — six outer nodes, a hub, three spokes.
// That makes it a native formation target for the Agentic Mesh.
// Coordinates read straight off public/parish-digital-icon-dark.svg, centered
// and flipped to y-up.

const RAW: Array<[number, number]> = [
  [0, 0],
  [24, -20],
  [50, -16],
  [54, 8],
  [40, 30],
  [12, 26],
  [27, 5], // hub
]

const CX = RAW.reduce((a, p) => a + p[0], 0) / RAW.length
const CY = RAW.slice(0, 6).reduce((a, p) => a + p[1], 0) / 6
const S = 0.05

/** Logomark nodes in local units (~2.7 x 2.5 world units). Index 6 is the hub. */
export const LOGO_NODES: Array<[number, number]> = RAW.map(([x, y]) => [
  (x - CX) * S,
  -(y - CY) * S,
])

export const LOGO_EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [6, 0],
  [6, 2],
  [6, 4],
]

export const HUB = 6

/** Deterministic PRNG so the world is identical every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sample `count` points on the logomark: node clusters plus points along the
 * connecting edges. Returns flat xy pairs in local units.
 */
export function sampleLogo(count: number, rand: () => number): Float32Array {
  const out = new Float32Array(count * 2)
  const lengths = LOGO_EDGES.map(([a, b]) => {
    const pa = LOGO_NODES[a]
    const pb = LOGO_NODES[b]
    return Math.hypot(pb[0] - pa[0], pb[1] - pa[1])
  })
  const total = lengths.reduce((a, b) => a + b, 0)

  for (let i = 0; i < count; i++) {
    let x: number
    let y: number
    if (rand() < 0.22) {
      // cluster on a node — keeps the mark's joints reading as bright dots
      const n = LOGO_NODES[Math.floor(rand() * LOGO_NODES.length)]
      const r = Math.pow(rand(), 1.8) * 0.075
      const a = rand() * Math.PI * 2
      x = n[0] + Math.cos(a) * r
      y = n[1] + Math.sin(a) * r
    } else {
      let pick = rand() * total
      let e = 0
      while (e < lengths.length - 1 && pick > lengths[e]) {
        pick -= lengths[e]
        e++
      }
      const [ia, ib] = LOGO_EDGES[e]
      const pa = LOGO_NODES[ia]
      const pb = LOGO_NODES[ib]
      const t = rand()
      const jitter = (rand() - 0.5) * 0.03
      x = pa[0] + (pb[0] - pa[0]) * t + jitter
      y = pa[1] + (pb[1] - pa[1]) * t + jitter
    }
    out[i * 2] = x
    out[i * 2 + 1] = y
  }
  return out
}
