// GPU stable fluids (Stam / GPU Gems) on ping-pong FBOs at 1/8 res.
// Pointer velocity splats into the field; the resulting velocity texture is
// tFluid, which displaces the composite (scene-recipes §5.1 / §6).
// Cinematic-Max dial: hero flourish, high-tier desktop only — the tier ladder
// disables it everywhere else and the composite falls back to uFluid = 0.

import * as THREE from 'three'
import type { FrameCtx, System } from '../Engine'
import type { Composite } from './Composite'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const ADVECT = /* glsl */ `
  precision highp float;
  uniform sampler2D tVelocity;
  uniform sampler2D tSource;
  uniform vec2 uTexel;
  uniform float uDt;
  uniform float uDissipation;
  varying vec2 vUv;
  void main() {
    vec2 coord = vUv - uDt * texture2D(tVelocity, vUv).xy * uTexel;
    gl_FragColor = texture2D(tSource, coord) * uDissipation;
  }
`

const SPLAT = /* glsl */ `
  precision highp float;
  uniform sampler2D tSource;
  uniform vec2 uPoint;
  uniform vec3 uValue;
  uniform float uRadius;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    vec3 splat = exp(-dot(p, p) / uRadius) * uValue;
    gl_FragColor = vec4(texture2D(tSource, vUv).xyz + splat, 1.0);
  }
`

const CURL = /* glsl */ `
  precision highp float;
  uniform sampler2D tVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float l = texture2D(tVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float r = texture2D(tVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float b = texture2D(tVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(tVelocity, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * ((r - l) - (t - b)), 0.0, 0.0, 1.0);
  }
`

const VORTICITY = /* glsl */ `
  precision highp float;
  uniform sampler2D tVelocity;
  uniform sampler2D tCurl;
  uniform vec2 uTexel;
  uniform float uCurl;
  uniform float uDt;
  varying vec2 vUv;
  void main() {
    float l = texture2D(tCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(tCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(tCurl, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(tCurl, vUv + vec2(0.0, uTexel.y)).x;
    float c = texture2D(tCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
    force /= length(force) + 1e-4;
    force *= uCurl * c;
    force.y *= -1.0;
    vec2 vel = texture2D(tVelocity, vUv).xy + force * uDt;
    gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
  }
`

const DIVERGENCE = /* glsl */ `
  precision highp float;
  uniform sampler2D tVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float l = texture2D(tVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(tVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(tVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float t = texture2D(tVelocity, vUv + vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
  }
`

const PRESSURE = /* glsl */ `
  precision highp float;
  uniform sampler2D tPressure;
  uniform sampler2D tDivergence;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float l = texture2D(tPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(tPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(tPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(tPressure, vUv + vec2(0.0, uTexel.y)).x;
    float d = texture2D(tDivergence, vUv).x;
    gl_FragColor = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
  }
`

const GRADIENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tPressure;
  uniform sampler2D tVelocity;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float l = texture2D(tPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(tPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(tPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(tPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(tVelocity, vUv).xy - vec2(r - l, t - b);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`

const rt = (w: number, h: number) =>
  new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  })

class PingPong {
  a: THREE.WebGLRenderTarget
  b: THREE.WebGLRenderTarget
  constructor(w: number, h: number) {
    this.a = rt(w, h)
    this.b = rt(w, h)
  }
  swap() {
    const t = this.a
    this.a = this.b
    this.b = t
  }
  setSize(w: number, h: number) {
    this.a.setSize(w, h)
    this.b.setSize(w, h)
  }
  dispose() {
    this.a.dispose()
    this.b.dispose()
  }
}

const PRESSURE_ITERATIONS = 12

export class Fluid implements System {
  order = 5
  private composite: Composite
  private enabled = false
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private quad!: THREE.Mesh
  private mats: Record<string, THREE.ShaderMaterial> = {}
  private velocity!: PingPong
  private pressure!: PingPong
  private divergence!: THREE.WebGLRenderTarget
  private curl!: THREE.WebGLRenderTarget
  private w = 1
  private h = 1
  private last = { x: 0.5, y: 0.5 }
  private moved = false

  constructor(composite: Composite) {
    this.composite = composite
  }

  init(ctx: FrameCtx) {
    this.enabled = ctx.tier.fluid && !ctx.reduced
    if (!this.enabled) return

    this.w = Math.max(96, Math.round(ctx.size.w / 8))
    this.h = Math.max(64, Math.round(ctx.size.h / 8))
    this.velocity = new PingPong(this.w, this.h)
    this.pressure = new PingPong(this.w, this.h)
    this.divergence = rt(this.w, this.h)
    this.curl = rt(this.w, this.h)

    const texel = new THREE.Vector2(1 / this.w, 1 / this.h)
    const mk = (fs: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({
        uniforms: { uTexel: { value: texel }, ...uniforms },
        vertexShader: VERT,
        fragmentShader: fs,
        depthTest: false,
        depthWrite: false,
      })

    this.mats = {
      advect: mk(ADVECT, {
        tVelocity: { value: null },
        tSource: { value: null },
        uDt: { value: 1 },
        uDissipation: { value: 0.975 },
      }),
      splat: mk(SPLAT, {
        tSource: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uValue: { value: new THREE.Vector3() },
        uRadius: { value: 0.00022 },
        uAspect: { value: 1 },
      }),
      curl: mk(CURL, { tVelocity: { value: null } }),
      vorticity: mk(VORTICITY, {
        tVelocity: { value: null },
        tCurl: { value: null },
        uCurl: { value: 30 },
        uDt: { value: 1 },
      }),
      divergence: mk(DIVERGENCE, { tVelocity: { value: null } }),
      pressure: mk(PRESSURE, { tPressure: { value: null }, tDivergence: { value: null } }),
      gradient: mk(GRADIENT, { tPressure: { value: null }, tVelocity: { value: null } }),
    }

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mats.advect)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget, r: THREE.WebGLRenderer) {
    this.quad.material = mat
    r.setRenderTarget(target)
    r.render(this.scene, this.cam)
  }

  update(ctx: FrameCtx) {
    if (!this.enabled) return
    const r = ctx.renderer
    const m = this.mats
    // Real seconds. Feeding frame-normalised dt (~1.0) here makes vorticity
    // confinement a positive feedback loop and the field explodes.
    const dt = Math.min(0.0166, ctx.dt / 1000)

    // splat pointer velocity into the field
    const px = ctx.pointer.px
    const py = ctx.pointer.py
    const dx = px - this.last.x
    const dy = py - this.last.y
    this.last.x = px
    this.last.y = py
    if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) this.moved = true
    if (this.moved && (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5)) {
      m.splat.uniforms.tSource.value = this.velocity.a.texture
      m.splat.uniforms.uPoint.value.set(px, py)
      m.splat.uniforms.uValue.value.set(dx * 6000, dy * 6000, 0)
      m.splat.uniforms.uAspect.value = ctx.size.w / ctx.size.h
      this.pass(m.splat, this.velocity.b, r)
      this.velocity.swap()
    }

    m.curl.uniforms.tVelocity.value = this.velocity.a.texture
    this.pass(m.curl, this.curl, r)

    m.vorticity.uniforms.tVelocity.value = this.velocity.a.texture
    m.vorticity.uniforms.tCurl.value = this.curl.texture
    m.vorticity.uniforms.uDt.value = dt
    this.pass(m.vorticity, this.velocity.b, r)
    this.velocity.swap()

    m.divergence.uniforms.tVelocity.value = this.velocity.a.texture
    this.pass(m.divergence, this.divergence, r)

    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      m.pressure.uniforms.tPressure.value = this.pressure.a.texture
      m.pressure.uniforms.tDivergence.value = this.divergence.texture
      this.pass(m.pressure, this.pressure.b, r)
      this.pressure.swap()
    }

    m.gradient.uniforms.tPressure.value = this.pressure.a.texture
    m.gradient.uniforms.tVelocity.value = this.velocity.a.texture
    this.pass(m.gradient, this.velocity.b, r)
    this.velocity.swap()

    m.advect.uniforms.tVelocity.value = this.velocity.a.texture
    m.advect.uniforms.tSource.value = this.velocity.a.texture
    m.advect.uniforms.uDt.value = dt
    m.advect.uniforms.uDissipation.value = 1 / (1 + 0.6 * dt * 60)
    this.pass(m.advect, this.velocity.b, r)
    this.velocity.swap()

    r.setRenderTarget(null)
    this.composite.fluidTexture = this.velocity.a.texture
  }

  resize(ctx: FrameCtx) {
    if (!this.enabled) return
    this.w = Math.max(96, Math.round(ctx.size.w / 8))
    this.h = Math.max(64, Math.round(ctx.size.h / 8))
    this.velocity.setSize(this.w, this.h)
    this.pressure.setSize(this.w, this.h)
    this.divergence.setSize(this.w, this.h)
    this.curl.setSize(this.w, this.h)
    const texel = this.mats.advect.uniforms.uTexel.value as THREE.Vector2
    texel.set(1 / this.w, 1 / this.h)
  }

  dispose() {
    if (!this.enabled) return
    this.velocity.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.curl.dispose()
    Object.values(this.mats).forEach((m) => m.dispose())
    this.quad?.geometry.dispose()
  }
}
