// The post chain. Order matters (scene-recipes §5):
//   fluid displacement -> frost -> RGB-shift aberration -> grade -> bloom
//   -> corner glows / vignette -> special-state zoom -> screen
// Everything after the bloom prepass happens in ONE fullscreen draw.

import * as THREE from 'three'
import type { Engine, FrameCtx, System } from '../Engine'
import { crange, lerpHz } from '../math'
import { PD, vec3 } from '../palette'
import { WAYPOINTS } from '../waypoints'

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const brightFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(uThreshold, uThreshold + 0.28, l);
    gl_FragColor = vec4(c * k, 1.0);
  }
`

const blurFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D tSrc;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 sum = texture2D(tSrc, vUv).rgb * 0.2270270270;
    sum += texture2D(tSrc, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tSrc, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tSrc, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    sum += texture2D(tSrc, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(sum, 1.0);
  }
`

const compFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tFluid;
  uniform float uScrollDelta;
  uniform float uTime;
  uniform float uScroll;
  uniform float uContact;
  uniform float uBurst;
  uniform float uFluid;
  uniform float uBloom;
  uniform vec3 uTeal;
  uniform vec3 uMark;
  uniform vec3 uWarm;
  varying vec2 vUv;

  vec4 getRGB(sampler2D t, vec2 uv, float angle, float amount) {
    vec2 o = vec2(cos(angle), sin(angle)) * amount;
    return vec4(texture2D(t, uv + o).r, texture2D(t, uv).g, texture2D(t, uv - o).b, 1.0);
  }

  void main() {
    // 7) special-state zoom, applied to the sampling uv
    vec2 uv = (vUv - 0.5) / mix(1.0, 1.06, pow(uContact, 3.0)) + 0.5;

    // 1) fluid displacement
    vec2 fn = (texture2D(tFluid, vUv).xy) * uFluid;
    // 2) frost shimmer
    float frost = length(fn) * (1.0 + sin(uTime - length(vUv - 0.5) * 30.0 + uScroll * 5.0) * 0.9);
    uv += fn * frost * 0.5;

    // 3) chromatic aberration — uniform directional split, channels 120 apart
    vec3 color = getRGB(tScene, uv, radians(120.0), 0.0001 * uScrollDelta - 0.0005 * uContact).rgb;

    // 4) grade
    color = (color - 0.5) * 1.07 + 0.5;
    color = max(color, 0.0);

    // 5) bloom (threshold high — accents, not a wash)
    color += texture2D(tBloom, uv).rgb * uBloom;

    // 6) corner glows + vignette
    vec2 c = vUv - 0.5;
    color *= 1.0 - dot(c, c) * 0.9;
    color += uTeal * pow(max(0.0, 1.0 - length(vUv - vec2(0.06, 0.96)) * 1.15), 6.0) * 0.13;
    color += uWarm * pow(max(0.0, 1.0 - length(vUv - vec2(0.96, 0.05)) * 1.2), 7.0) * 0.07;
    color += uMark * uBurst * 0.22;

    gl_FragColor = vec4(color, 1.0);
  }
`

const makeRT = (w: number, h: number) =>
  new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w)), Math.max(2, Math.floor(h)), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
  })

export class Composite implements System {
  order = 90
  private engine: Engine
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private quad!: THREE.Mesh
  private sceneRT!: THREE.WebGLRenderTarget
  private brightRT!: THREE.WebGLRenderTarget
  private blurA!: THREE.WebGLRenderTarget
  private blurB!: THREE.WebGLRenderTarget
  private matBright!: THREE.ShaderMaterial
  private matBlur!: THREE.ShaderMaterial
  private matComp!: THREE.ShaderMaterial
  private contact = 0
  private bloomOn = true
  /** set by the Fluid system when it is active */
  fluidTexture: THREE.Texture | null = null

  constructor(engine: Engine) {
    this.engine = engine
  }

  init(ctx: FrameCtx) {
    const { w, h, dpr } = ctx.size
    this.bloomOn = ctx.tier.bloom
    this.sceneRT = makeRT(w * dpr, h * dpr)
    this.brightRT = makeRT((w * dpr) / 2, (h * dpr) / 2)
    this.blurA = makeRT((w * dpr) / 4, (h * dpr) / 4)
    this.blurB = makeRT((w * dpr) / 4, (h * dpr) / 4)

    this.matBright = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, uThreshold: { value: 0.62 } },
      vertexShader: quadVert,
      fragmentShader: brightFrag,
      depthTest: false,
      depthWrite: false,
    })
    this.matBlur = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: quadVert,
      fragmentShader: blurFrag,
      depthTest: false,
      depthWrite: false,
    })
    this.matComp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tFluid: { value: null },
        uScrollDelta: { value: 0 },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uContact: { value: 0 },
        uBurst: { value: 0 },
        uFluid: { value: 0 },
        uBloom: { value: this.bloomOn ? 0.9 : 0 },
        uTeal: { value: new THREE.Vector3(...vec3(PD.teal)) },
        uMark: { value: new THREE.Vector3(...vec3(PD.mark)) },
        uWarm: { value: new THREE.Vector3(...vec3(PD.warm)) },
      },
      vertexShader: quadVert,
      fragmentShader: compFrag,
      depthTest: false,
      depthWrite: false,
    })

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.matComp)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)

    this.engine.renderFn = (c) => this.render(c)
  }

  private draw(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null, r: THREE.WebGLRenderer) {
    this.quad.material = mat
    r.setRenderTarget(target)
    r.render(this.scene, this.cam)
  }

  private render(ctx: FrameCtx) {
    const r = ctx.renderer
    r.setRenderTarget(this.sceneRT)
    r.clear()
    r.render(this.engine.scene, ctx.camera)

    if (this.bloomOn) {
      this.matBright.uniforms.tScene.value = this.sceneRT.texture
      this.draw(this.matBright, this.brightRT, r)

      const bw = this.blurA.width
      const bh = this.blurA.height
      for (let i = 0; i < 2; i++) {
        this.matBlur.uniforms.tSrc.value = i === 0 ? this.brightRT.texture : this.blurB.texture
        this.matBlur.uniforms.uDir.value.set(1 / bw, 0)
        this.draw(this.matBlur, this.blurA, r)
        this.matBlur.uniforms.tSrc.value = this.blurA.texture
        this.matBlur.uniforms.uDir.value.set(0, 1 / bh)
        this.draw(this.matBlur, this.blurB, r)
      }
    }

    const contactAt = WAYPOINTS[4].at
    const target = crange(ctx.progress, contactAt - 0.05, contactAt + 0.04, 0, 1)
    this.contact = ctx.reduced ? target : lerpHz(target, this.contact, 0.08)

    const u = this.matComp.uniforms
    u.tScene.value = this.sceneRT.texture
    u.tBloom.value = this.bloomOn ? this.blurB.texture : null
    u.tFluid.value = this.fluidTexture
    u.uFluid.value = this.fluidTexture && !ctx.reduced ? 0.06 : 0
    u.uScrollDelta.value = ctx.uScrollDelta
    u.uTime.value = ctx.time
    u.uScroll.value = ctx.scroll.y * 0.001
    u.uContact.value = this.contact
    u.uBurst.value = this.engine.burstAmount

    this.draw(this.matComp, null, r)
  }

  update() {
    /* render() does the work — it runs as engine.renderFn */
  }

  resize(ctx: FrameCtx) {
    if (!this.sceneRT) return
    const w = ctx.size.w * ctx.size.dpr
    const h = ctx.size.h * ctx.size.dpr
    this.sceneRT.setSize(Math.max(2, w), Math.max(2, h))
    this.brightRT.setSize(Math.max(2, w / 2), Math.max(2, h / 2))
    this.blurA.setSize(Math.max(2, w / 4), Math.max(2, h / 4))
    this.blurB.setSize(Math.max(2, w / 4), Math.max(2, h / 4))
  }

  dispose() {
    this.sceneRT?.dispose()
    this.brightRT?.dispose()
    this.blurA?.dispose()
    this.blurB?.dispose()
    this.matBright?.dispose()
    this.matBlur?.dispose()
    this.matComp?.dispose()
    this.quad?.geometry.dispose()
  }
}
