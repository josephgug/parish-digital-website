// Camera waypoints — the authored Z-dolly. The signature move is pushing
// THROUGH the mesh (z 40 -> 8 -> 2 -> deep) and pulling back out for the footer.
// `at` is a scroll fraction; it is re-derived from real DOM section offsets at
// runtime (Engine.measureContent) so copy edits never desync the choreography.

export type Waypoint = {
  id: string
  at: number
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
  moveXY: [number, number]
  wobble: number
  lerp: number
}

export const WAYPOINTS: Waypoint[] = [
  {
    id: 'hero',
    at: 0,
    position: [0, 0, 8],
    lookAt: [0, 0, -1],
    fov: 30,
    moveXY: [0.4, 0.2],
    wobble: 0.1,
    lerp: 0.08,
  },
  {
    id: 'services',
    at: 0.2,
    position: [0, 0.4, 2],
    lookAt: [0, 0, -6],
    fov: 35,
    moveXY: [0.5, 0.5],
    wobble: 0.04,
    lerp: 0.07,
  },
  {
    id: 'why',
    at: 0.42,
    position: [0, -0.3, -7],
    lookAt: [0.6, 0, -15],
    fov: 33,
    moveXY: [-0.6, 0.4],
    wobble: 0.03,
    lerp: 0.07,
  },
  {
    id: 'about',
    at: 0.62,
    position: [0, 0.3, -17],
    lookAt: [-0.5, 0, -25],
    fov: 30,
    moveXY: [0.5, 0.5],
    wobble: 0.03,
    lerp: 0.08,
  },
  {
    id: 'contact',
    at: 0.82,
    position: [0, 0, -27.5],
    lookAt: [0, 0, -32],
    fov: 28,
    moveXY: [0.15, 0.15],
    wobble: 0.02,
    lerp: 0.08,
  },
  {
    id: 'footer',
    at: 1,
    position: [0, -1.2, -14],
    lookAt: [0, 0, -32],
    fov: 30,
    moveXY: [0, 0],
    wobble: 0,
    lerp: 0.08,
  },
]

/** World Z of the signature logomark (sits just past the contact waypoint). */
export const LOGO_Z = -32
