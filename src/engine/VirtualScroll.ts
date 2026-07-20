// The scroll controller. This class IS the signature feel — do not substitute
// Lenis / locomotive / native smooth scroll. Two-pole system:
//   inertia = deltaY * platformScale ; inertia *= 0.9 each frame
//   pos    += 0.5 * (target*scale - pos)
// Constants are deliberately RAW per-frame (60 Hz reference), per spec.

import { clamp, tween, killTweens, frameHz, HZ_BASELINE, type EaseName } from './math'
import { rigWheel } from './rig'

const isAndroid = () => /Android/i.test(navigator.userAgent)

export type ScrollOpts = { limit?: boolean; max?: number }

export class VirtualScroll {
  y = 0
  target = 0
  inertia = 0
  delta = 0
  isInertia = false
  blocked = false

  /** px -> world units. Tuned per site (0.2–0.35); 0.27 is the fitted value. */
  scale = 0.27
  /** touch drag has its own knob, independent of the wheel table. */
  touchScale = 1.6

  limit: boolean
  max: number

  private touchY = 0
  private touchT = 0
  private touchV = 0
  private disposers: Array<() => void> = []

  constructor({ limit = false, max = Infinity }: ScrollOpts = {}) {
    this.limit = limit
    this.max = max

    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, fn as EventListener, opts)
      this.disposers.push(() => window.removeEventListener(type, fn as EventListener, opts))
    }

    on('wheel', (e) => this.onWheel(e), { passive: true })
    on('touchstart', (e) => this.onTouchStart(e), { passive: true })
    on('touchmove', (e) => this.onTouchMove(e), { passive: false })
    on('touchend', () => this.onTouchEnd(), { passive: true })
    on('touchcancel', () => this.onTouchEnd(), { passive: true })
    on('keydown', (e) => this.onKey(e))
  }

  /**
   * Platform wheel normalization (exact spec table), indexed by the EVENT's
   * deltaMode — not by a browser sniff. A physical mouse can report lines
   * (deltaMode 1, deltaY ~3) or pixels (deltaMode 0, deltaY ~100) depending on
   * browser and driver; the line multipliers below are exactly the pixel
   * multipliers times a lines-to-px conversion (win 40px/line, mac ~12px/line),
   * so one notch lands in the same place either way.
   */
  static wheelScale(deltaMode = 0) {
    const mac = /Mac/.test(navigator.platform || '') || /Mac/.test(navigator.userAgent)
    const pixel = mac ? 0.33 : 0.25
    if (deltaMode === 1) return mac ? 4 : 10 // LINE
    if (deltaMode === 2) return pixel * window.innerHeight // PAGE
    return pixel // PIXEL
  }

  private onWheel(e: WheelEvent) {
    if (this.blocked) return
    const s = VirtualScroll.wheelScale(e.deltaMode)
    rigWheel(e.deltaMode, e.deltaY, s)
    killTweens(this as unknown as Record<string, number>, 'target')
    this.target += e.deltaY * s
    this.inertia = e.deltaY * s // seed momentum from the LAST wheel event
    this.isInertia = true
  }

  private onTouchStart(e: TouchEvent) {
    if (this.blocked) return
    killTweens(this as unknown as Record<string, number>, 'target')
    this.isInertia = false
    this.inertia = 0
    this.touchY = e.touches[0].clientY
    this.touchT = performance.now()
    this.touchV = 0
  }

  private onTouchMove(e: TouchEvent) {
    if (this.blocked) return
    if (e.cancelable) e.preventDefault()
    const y = e.touches[0].clientY
    const now = performance.now()
    const d = (this.touchY - y) * this.touchScale
    this.target += d
    const dt = now - this.touchT
    if (dt > 0) this.touchV = this.touchV * 0.6 + (d / dt) * 16.667 * 0.4
    this.touchY = y
    this.touchT = now
  }

  private onTouchEnd() {
    if (this.blocked) return
    const m = isAndroid() ? 35 : 25
    const to = this.target + this.touchV * m
    tween(this as unknown as Record<string, number>, 'target', to, 2500, 'easeOutQuint')
    this.touchV = 0
  }

  private onKey(e: KeyboardEvent) {
    if (this.blocked) return
    const el = document.activeElement
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
    const vh = window.innerHeight
    switch (e.key) {
      case 'ArrowDown': this.scrollBy(150, 400, 'easeOutCubic'); break
      case 'ArrowUp': this.scrollBy(-150, 400, 'easeOutCubic'); break
      case 'PageDown': case ' ': this.scrollBy(vh, 700); break
      case 'PageUp': this.scrollBy(-vh, 700); break
      case 'Home': this.scrollTo(0); break
      case 'End': this.scrollTo(this.limit ? this.max / this.scale : this.target); break
      default: return
    }
    e.preventDefault()
  }

  /** value is in page-px (target units). */
  scrollTo(value: number, time = 800, ease: EaseName = 'easeInOutCubic') {
    this.isInertia = false
    this.inertia = 0
    const to = this.limit ? clamp(value, 0, this.max / this.scale) : value
    if (time <= 0) { this.target = to; return }
    tween(this as unknown as Record<string, number>, 'target', to, time, ease)
  }

  scrollBy(px: number, time = 400, ease: EaseName = 'easeOutCubic') {
    this.scrollTo(this.target + px, time, ease)
  }

  /**
   * Once per rAF frame.
   *
   * The two constants (0.9 inertia decay, 0.5 position chase) are authored
   * against a 60 Hz reference frame. Applying them raw per-frame makes the
   * whole feel scale with the DISPLAY: on a 144 Hz monitor a notch settles in
   * ~520ms instead of ~1250ms and on 240 Hz in ~310ms, which reads as the
   * camera teleporting between sections with no runway in between. Both poles
   * are therefore raised to the power of "how many 60 Hz frames did this frame
   * last", which is an identity at exactly 60 Hz and correct everywhere else.
   *
   * The accumulator stays UNBOUNDED (spec default) — a hard clamp kills the
   * fling at the page ends and leaves a dead zone you have to scroll back out
   * of. Instead the ends rubber-band: inertia is damped past the boundary and
   * the target springs back, while `pixels`/`progress` clamp so the DOM and
   * camera stop dead at the footer.
   */
  update() {
    // frameHz() is frames-at-120Hz (math.ts baseline); these constants are 60Hz.
    // bounds are a divide-by-zero / tab-stall guard only — 0.005 is ~12000Hz,
    // far past any real panel, so nothing is capped in practice.
    const f60 = clamp(frameHz() * (60 / HZ_BASELINE), 0.005, 4)
    if (this.isInertia) {
      const d = Math.pow(0.9, f60)
      // exact sum of the decay-first discrete series over f60 60Hz frames
      this.target += this.inertia * ((0.9 * (1 - d)) / 0.1)
      this.inertia *= d
    }
    if (this.limit) {
      const maxT = this.maxPixels
      const over = this.target > maxT ? this.target - maxT : this.target < 0 ? this.target : 0
      if (over !== 0) {
        this.target -= over * (1 - Math.pow(0.78, f60))
        this.inertia *= Math.pow(0.55, f60)
        if (Math.abs(this.target - clamp(this.target, 0, maxT)) < 0.5) {
          this.target = clamp(this.target, 0, maxT)
        }
      }
    }
    const chase = 1 - Math.pow(0.5, f60)
    const step = this.blocked ? 0 : chase * (this.target * this.scale - this.y)
    this.y += step

    // `delta` is the VELOCITY every consumer couples to (uScrollDelta -> mesh
    // distortion + chromatic aberration, world banking, idle-wobble
    // suppression). Reported as a 60Hz-equivalent per-frame distance, NOT the
    // raw per-frame step: at 240Hz the real step is 4x smaller for the same
    // hand speed, which silently drained all of that motion to nothing.
    this.delta = step / f60
    if (Math.abs(this.delta) < 0.01) this.delta = 0
    if (Math.abs(this.y) < 0.001) this.y = 0
  }

  get maxPixels() {
    return this.limit ? this.max / this.scale : Infinity
  }

  /** Page-px position the DOM layer translates by — clamped to the document. */
  get pixels() {
    return clamp(this.y / this.scale, 0, this.maxPixels)
  }

  /** Unclamped accumulator position, in page px. */
  get rawPixels() {
    return this.y / this.scale
  }

  dispose() {
    this.disposers.forEach((d) => d())
    this.disposers = []
    killTweens(this as unknown as Record<string, number>)
  }
}
