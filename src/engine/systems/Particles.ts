// GPU dust + the logomark point-cloud. Drift, formation, contraction and
// pointer repulsion all resolve in the vertex shader, so particle count is
// bounded by fill rate rather than by a simulation pass.
// ponytail: procedural curl-ish drift instead of a ping-pong GPGPU position
// texture — same look at 160k points, no extra FBOs. Swap in a sim pass only
// if we need persistent trails/attractors.

import * as THREE from 'three'
import type { Engine, FrameCtx, System } from '../Engine'
import { crange, lerpHz, tween } from '../math'
import { mulberry32, sampleLogo } from '../logomark'
import { PD, vec3 } from '../palette'
import { LOGO_Z, WAYPOINTS } from '../waypoints'

const INTRO_SCALE = 1.3
const CTA_SCALE = 3.6

const vert = /* glsl */ `
  attribute vec3 aHome;
  attribute vec3 aSeed;
  attribute vec3 aIntro;
  attribute vec3 aCta;
  attribute vec3 aBurst;
  attribute float aScale;

  uniform float uTime;
  uniform float uForm;
  uniform float uContract;
  uniform float uBurst;
  uniform float uSize;
  uniform float uDpr;
  uniform float uCamZ;
  uniform float uScrollDelta;
  uniform vec3 uPointer;
  uniform float uRepel;

  varying float vAlpha;
  varying float vHot;

  void main() {
    vec3 p = aHome;

    float drift = 1.0 - max(uForm, uContract);
    p.x += sin(uTime * 0.21 + aSeed.x * 6.2831) * aSeed.z * 1.1 * drift;
    p.y += cos(uTime * 0.17 + aSeed.y * 6.2831) * aSeed.z * 1.1 * drift;
    p.z += sin(uTime * 0.13 + aSeed.z * 6.2831) * aSeed.x * 0.7 * drift;

    // shear under scroll velocity — the network reacts to the fling
    p.x += uScrollDelta * aSeed.z * 0.12;

    p = mix(p, aIntro, uForm);

    float w = smoothstep(18.0, 3.0, abs(aHome.z - ${LOGO_Z.toFixed(1)}));
    p = mix(p, aCta, uContract * w);
    p += aBurst * uBurst * w * 30.0;

    vec3 d = p - uPointer;
    float dl2 = dot(d, d);
    p += normalize(d + 1e-5) * uRepel * exp(-dl2 * 0.16);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(0.05, -mv.z);
    gl_PointSize = aScale * uSize * uDpr / dist;
    gl_Position = projectionMatrix * mv;

    float near = smoothstep(0.4, 3.0, dist);
    float far = 1.0 - smoothstep(30.0, 58.0, dist);
    vHot = smoothstep(14.0, 1.0, abs(p.z - uCamZ));
    vAlpha = near * far * (0.20 + vHot * 0.80) * (1.0 - uBurst * 0.7);
  }
`

const frag = /* glsl */ `
  precision highp float;
  uniform vec3 uTeal;
  uniform vec3 uMark;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vHot;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.6) * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uTeal, uMark, vHot) * (0.5 + vHot), a);
  }
`

export class Particles implements System {
  order = 20
  private engine: Engine
  private points?: THREE.Points
  private uniforms: Record<string, THREE.IUniform> = {}
  private form = { v: 0 }
  private contract = 0
  private burst = 0
  private repel = 0
  private pointerWorld = new THREE.Vector3(0, 0, 0)

  constructor(engine: Engine) {
    this.engine = engine
  }

  init(ctx: FrameCtx) {
    const count = ctx.tier.particles
    const rand = mulberry32(0x5dcaa5)

    const home = new Float32Array(count * 3)
    const seed = new Float32Array(count * 3)
    const intro = new Float32Array(count * 3)
    const cta = new Float32Array(count * 3)
    const burst = new Float32Array(count * 3)
    const scale = new Float32Array(count)

    const introXY = sampleLogo(count, mulberry32(0x0f6e56))
    const ctaXY = sampleLogo(count, mulberry32(0x1d9e75))

    for (let i = 0; i < count; i++) {
      const t = i / count
      const z = 12 - 58 * t + (rand() - 0.5) * 3
      const ang = rand() * Math.PI * 2
      const rad = 0.5 + Math.pow(rand(), 0.55) * 13
      home[i * 3] = Math.cos(ang) * rad
      home[i * 3 + 1] = Math.sin(ang) * rad * 0.78
      home[i * 3 + 2] = z

      seed[i * 3] = rand()
      seed[i * 3 + 1] = rand()
      seed[i * 3 + 2] = rand()

      const jz = (rand() - 0.5) * 0.5
      intro[i * 3] = introXY[i * 2] * INTRO_SCALE
      intro[i * 3 + 1] = introXY[i * 2 + 1] * INTRO_SCALE
      intro[i * 3 + 2] = jz

      cta[i * 3] = ctaXY[i * 2] * CTA_SCALE
      cta[i * 3 + 1] = ctaXY[i * 2 + 1] * CTA_SCALE
      cta[i * 3 + 2] = LOGO_Z + jz

      const ba = rand() * Math.PI * 2
      burst[i * 3] = Math.cos(ba) * 0.9
      burst[i * 3 + 1] = Math.sin(ba) * 0.55 + 0.8
      burst[i * 3 + 2] = 0.4 + rand() * 0.9

      scale[i] = 6 + Math.pow(rand(), 3) * 34
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(home, 3))
    g.setAttribute('aHome', new THREE.BufferAttribute(home, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.setAttribute('aIntro', new THREE.BufferAttribute(intro, 3))
    g.setAttribute('aCta', new THREE.BufferAttribute(cta, 3))
    g.setAttribute('aBurst', new THREE.BufferAttribute(burst, 3))
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -18), 100)

    this.uniforms = {
      uTime: { value: 0 },
      uForm: { value: 0 },
      uContract: { value: 0 },
      uBurst: { value: 0 },
      uSize: { value: 1 },
      uDpr: { value: ctx.size.dpr },
      uCamZ: { value: 8 },
      uScrollDelta: { value: 0 },
      uOpacity: { value: 1 },
      uRepel: { value: 0 },
      uPointer: { value: this.pointerWorld },
      uTeal: { value: new THREE.Vector3(...vec3(PD.teal)) },
      uMark: { value: new THREE.Vector3(...vec3(PD.mark)) },
    }

    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.points.frustumCulled = false
    this.engine.world.add(this.points)

    // load choreography: scatter -> assemble the logomark -> disperse into the mesh
    if (ctx.reduced) {
      this.form.v = 0
    } else {
      this.form.v = 0
      tween(this.form, 'v', 1, 1500, 'easeOutCubic', () => {
        window.setTimeout(() => tween(this.form, 'v', 0, 2400, 'easeInOutCubic'), 850)
      })
    }
  }

  update(ctx: FrameCtx) {
    if (!this.points) return
    const contactAt = WAYPOINTS[4].at
    const p = ctx.progress
    const cTarget = crange(p, contactAt - 0.06, contactAt + 0.05, 0, 1)
    const bTarget = crange(p, Math.min(0.93, contactAt + 0.09), 1, 0, 1)
    this.contract = ctx.reduced ? cTarget : lerpHz(cTarget, this.contract, 0.12)
    this.burst = ctx.reduced ? bTarget : lerpHz(bTarget, this.burst, 0.12)

    // pointer -> a world point 6 units in front of the camera
    if (!ctx.reduced) {
      this.pointerWorld
        .set(ctx.pointer.nx, ctx.pointer.ny, 0.5)
        .unproject(ctx.camera)
        .sub(ctx.camera.position)
        .normalize()
        .multiplyScalar(6)
        .add(ctx.camera.position)
      const speed = Math.hypot(ctx.pointer.vx, ctx.pointer.vy)
      this.repel = lerpHz(Math.min(0.9, speed * 6), this.repel, 0.08)
    }

    this.uniforms.uTime.value = ctx.time
    this.uniforms.uForm.value = this.form.v
    this.uniforms.uContract.value = this.contract
    this.uniforms.uBurst.value = this.burst
    this.uniforms.uCamZ.value = ctx.camera.position.z
    this.uniforms.uScrollDelta.value = ctx.uScrollDelta
    this.uniforms.uRepel.value = ctx.reduced ? 0 : this.repel
    this.uniforms.uSize.value = ctx.size.h / 900
  }

  resize(ctx: FrameCtx) {
    if (this.uniforms.uDpr) this.uniforms.uDpr.value = ctx.size.dpr
  }

  dispose() {
    this.points?.removeFromParent()
    this.points?.geometry.dispose()
    ;(this.points?.material as THREE.Material | undefined)?.dispose()
  }
}
