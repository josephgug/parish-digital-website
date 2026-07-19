import * as THREE from 'three'
import { VirtualScroll } from './VirtualScroll'
import { aHz, clamp, crange, lerpHz, tickHz, updateTweens } from './math'
import { rigPush } from './rig'
import { resolveTier, type Tier } from './tier'
import { WAYPOINTS, type Waypoint } from './waypoints'

export type FrameCtx = {
  dt: number
  time: number
  scroll: VirtualScroll
  /** signed, saturated at +/-3 — the coupling source */
  uScrollDelta: number
  /** 0..1 across the whole page */
  progress: number
  pointer: { nx: number; ny: number; vx: number; vy: number; px: number; py: number }
  reduced: boolean
  tier: Tier
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  size: { w: number; h: number; dpr: number }
}

export interface System {
  /** lower runs first */
  order?: number
  init?(ctx: FrameCtx): void | Promise<void>
  update(ctx: FrameCtx): void
  resize?(ctx: FrameCtx): void
  dispose?(): void
}

const tmpObj = new THREE.Object3D()
const tmpQuatA = new THREE.Quaternion()
const tmpQuatB = new THREE.Quaternion()
const tmpVec = new THREE.Vector3()

function waypointQuat(wp: Waypoint) {
  tmpObj.position.set(wp.position[0], wp.position[1], wp.position[2])
  tmpObj.up.set(0, 1, 0)
  tmpObj.lookAt(wp.lookAt[0], wp.lookAt[1], wp.lookAt[2])
  return tmpObj.quaternion.clone()
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  /** everything that banks/parallaxes lives under here */
  readonly world = new THREE.Group()

  readonly scroll: VirtualScroll
  tier!: Tier

  uScrollDelta = 0
  progress = 0
  /** signature-moment state — written by MeshNet, read by the post chain + DOM */
  contractAmount = 0
  burstAmount = 0

  private canvas: HTMLCanvasElement
  private content: HTMLElement | null
  private systems: System[] = []
  private raf = 0
  private last = 0
  private t0 = performance.now()
  private running = false
  private disposed = false

  private pointer = { nx: 0, ny: 0, vx: 0, vy: 0, px: 0.5, py: 0.5, tx: 0, ty: 0 }
  private rotTarget = 0
  private wobble = 0

  private quats: THREE.Quaternion[] = []
  private size = { w: 1, h: 1, dpr: 1 }
  private reduced = false
  private introT = { v: 0 }

  private listeners: Array<(ctx: FrameCtx) => void> = []
  private mql: MediaQueryList | null = null
  private cleanups: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, content: HTMLElement | null) {
    this.canvas = canvas
    this.content = content

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setClearColor(0x080f0d, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 40)

    this.scene.add(this.world)
    this.scene.fog = new THREE.FogExp2(0x061310, 0.0165)

    this.scroll = new VirtualScroll({ limit: true, max: 1000 })
    this.quats = WAYPOINTS.map(waypointQuat)
  }

  async init() {
    this.tier = await resolveTier()
    if (this.disposed) return

    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reduced = this.mql.matches
    const onMql = () => (this.reduced = this.mql!.matches)
    this.mql.addEventListener('change', onMql)
    this.cleanups.push(() => this.mql?.removeEventListener('change', onMql))

    const onMove = (e: PointerEvent) => {
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
      this.pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1)
      this.pointer.px = e.clientX / window.innerWidth
      this.pointer.py = 1 - e.clientY / window.innerHeight
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    this.cleanups.push(() => window.removeEventListener('pointermove', onMove))

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      this.pointer.tx = clamp(e.gamma / 30, -1, 1)
      this.pointer.ty = clamp((e.beta - 45) / 30, -1, 1)
    }
    if (this.tier.isMobile) {
      window.addEventListener('deviceorientation', onOrient)
      this.cleanups.push(() => window.removeEventListener('deviceorientation', onOrient))
    }

    const onResize = () => this.resize()
    window.addEventListener('resize', onResize)
    this.cleanups.push(() => window.removeEventListener('resize', onResize))

    const onVis = () => {
      if (document.hidden) this.stop()
      else this.start()
    }
    document.addEventListener('visibilitychange', onVis)
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVis))

    const onLost = (e: Event) => {
      e.preventDefault()
      this.stop()
      document.documentElement.classList.add('no-webgl')
    }
    this.canvas.addEventListener('webglcontextlost', onLost)
    this.cleanups.push(() => this.canvas.removeEventListener('webglcontextlost', onLost))

    this.resize()

    const ctx = this.ctx(16.667)
    for (const s of this.systems) await s.init?.(ctx)
    if (this.disposed) return

    // intro fly-in: z 40 -> hero waypoint (the load half of the Z-dolly)
    if (this.reduced) this.introT.v = 1
    else {
      this.introT.v = 0
      import('./math').then(({ tween }) =>
        tween(this.introT as unknown as Record<string, number>, 'v', 1, 2600, 'easeInOutCubic'),
      )
    }

    this.start()
  }

  add(system: System) {
    this.systems.push(system)
    this.systems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return system
  }

  /** Scroll to a page-pixel offset through the virtual scroll. */
  scrollTo(px: number, time = 900) {
    this.scroll.scrollTo(px, this.reduced ? 0 : time)
  }

  setBlocked(v: boolean) {
    this.scroll.blocked = v
  }

  /** Default draw. The Composite system replaces this with the post chain. */
  renderFn: (ctx: FrameCtx) => void = () => this.renderer.render(this.scene, this.camera)

  onFrame(cb: (ctx: FrameCtx) => void) {
    this.listeners.push(cb)
    return () => {
      const i = this.listeners.indexOf(cb)
      if (i >= 0) this.listeners.splice(i, 1)
    }
  }

  private ctx(dt: number): FrameCtx {
    return {
      dt,
      time: (performance.now() - this.t0) / 1000,
      scroll: this.scroll,
      uScrollDelta: this.uScrollDelta,
      progress: this.progress,
      pointer: this.pointer,
      reduced: this.reduced,
      tier: this.tier,
      camera: this.camera,
      renderer: this.renderer,
      size: this.size,
    }
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = this.tier ? this.tier.dpr() : Math.min(2, window.devicePixelRatio || 1)
    this.size = { w, h, dpr }
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.measureContent()
    const ctx = this.ctx(16.667)
    for (const s of this.systems) s.resize?.(ctx)
  }

  measureContent() {
    if (!this.content) return
    const total = Math.max(1, this.content.scrollHeight - window.innerHeight)
    this.scroll.max = total * this.scroll.scale

    // re-derive waypoint fractions from real DOM section offsets
    const top = this.content.getBoundingClientRect().top + this.scroll.pixels
    let prev = 0
    for (const wp of WAYPOINTS) {
      const el = document.getElementById(wp.id)
      if (!el) continue
      const offset = el.getBoundingClientRect().top + this.scroll.pixels - top
      const at = clamp(offset / total, 0, 1)
      wp.at = Math.max(at, prev + 1e-4)
      prev = wp.at
    }
    WAYPOINTS[0].at = 0
    WAYPOINTS[WAYPOINTS.length - 1].at = 1
  }

  start() {
    if (this.running || this.disposed) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private frame = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.frame)

    const dt = Math.min(48, now - this.last)
    this.last = now
    tickHz(dt)
    updateTweens(now)

    this.scroll.update()

    // velocity uniform — the coupling source (mechanics §3)
    this.uScrollDelta = lerpHz(0.1 * this.scroll.delta, this.uScrollDelta, 0.05)
    this.uScrollDelta = clamp(this.uScrollDelta, -3, 3)
    if (this.reduced) this.uScrollDelta = 0

    const maxPx = this.scroll.max / this.scroll.scale
    this.progress = maxPx > 1 ? clamp(this.scroll.pixels / maxPx, 0, 1) : 0

    this.updateCamera(dt)

    if (this.content) {
      this.content.style.transform = `translate3d(0,${-this.scroll.pixels.toFixed(2)}px,0)`
    }

    const ctx = this.ctx(dt)
    for (const s of this.systems) s.update(ctx)
    this.renderFn(ctx)
    for (const l of this.listeners) l(ctx)

    rigPush({
      t: now,
      dt,
      uScroll: this.scroll.y,
      uScrollDelta: this.uScrollDelta,
      camZ: this.camera.position.z,
    })
  }

  /** Waypoint interpolation, then eased chase — the lag IS the cinematic feel. */
  private updateCamera(dt: number) {
    const p = this.progress
    let i = 0
    while (i < WAYPOINTS.length - 2 && p >= WAYPOINTS[i + 1].at) i++
    const a = WAYPOINTS[i]
    const b = WAYPOINTS[Math.min(i + 1, WAYPOINTS.length - 1)]
    const span = Math.max(1e-5, b.at - a.at)
    const raw = clamp((p - a.at) / span)
    const t = raw * raw * (3 - 2 * raw)

    tmpVec.set(
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
      a.position[2] + (b.position[2] - a.position[2]) * t,
    )
    tmpQuatA.copy(this.quats[i]).slerp(this.quats[Math.min(i + 1, this.quats.length - 1)], t)
    const fov = a.fov + (b.fov - a.fov) * t
    const lerpAmt = a.lerp + (b.lerp - a.lerp) * t
    const mx = a.moveXY[0] + (b.moveXY[0] - a.moveXY[0]) * t
    const my = a.moveXY[1] + (b.moveXY[1] - a.moveXY[1]) * t
    const wobbleAmt = a.wobble + (b.wobble - a.wobble) * t

    // intro fly-in blends from z=40 toward the hero waypoint
    if (this.introT.v < 1) {
      const k = this.introT.v
      tmpVec.z = 40 + (tmpVec.z - 40) * k
      tmpQuatB.copy(this.quats[0])
      tmpQuatA.slerp(tmpQuatB, 1 - k)
    }

    const alpha = this.reduced ? 1 : aHz(lerpAmt)
    this.camera.position.lerp(tmpVec, alpha)
    this.camera.quaternion.slerp(tmpQuatA, alpha)
    const nextFov = this.reduced ? fov : lerpHz(fov, this.camera.fov, 0.08)
    if (Math.abs(nextFov - this.camera.fov) > 1e-4) {
      this.camera.fov = nextFov
      this.camera.updateProjectionMatrix()
    }

    if (this.reduced) {
      this.world.position.set(0, 0, 0)
      this.world.rotation.z = 0
      return
    }

    // pointer parallax (eased)
    this.pointer.vx = this.pointer.tx - this.pointer.nx
    this.pointer.vy = this.pointer.ty - this.pointer.ny
    this.pointer.nx = lerpHz(this.pointer.tx, this.pointer.nx, 0.05)
    this.pointer.ny = lerpHz(this.pointer.ty, this.pointer.ny, 0.05)

    // idle wobble — Lissajous float, y at 1.3x the x frequency
    const still = 1 - clamp(Math.abs(this.scroll.delta) / 6)
    this.wobble = lerpHz(wobbleAmt * still, this.wobble, 0.03)
    const ph = performance.now() * 0.0008
    const wx = Math.sin(ph) * this.wobble
    const wy = Math.sin(ph * 1.3 + Math.PI / 2) * this.wobble

    this.world.position.set(this.pointer.nx * mx + wx, this.pointer.ny * my + wy, 0)

    // velocity banking — the world rolls into the scroll direction (max 3deg)
    const strength = crange(Math.abs(this.scroll.delta) / window.innerWidth, 0, 0.02, 0, 1)
    this.rotTarget = lerpHz(
      THREE.MathUtils.degToRad(3) * strength * Math.sign(this.scroll.delta),
      this.rotTarget,
      0.02,
    )
    this.world.rotation.z = lerpHz(this.rotTarget, this.world.rotation.z, 0.07)
    void dt
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.cleanups.forEach((c) => c())
    this.cleanups = []
    this.scroll.dispose()
    for (const s of this.systems) s.dispose?.()
    this.systems = []
    this.listeners = []
    // NOTE: never renderer.dispose() here — StrictMode double-mount blacks the canvas (v1 bug).
  }
}
