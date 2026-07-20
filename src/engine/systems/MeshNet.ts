// The Agentic Mesh: luminous nodes wired into loops, spanning the whole
// fly-through corridor. Nodes and edges share one blend chain —
//   world position -> logomark position (uContract) -> burst (uBurst)
// so the signature moment is a single per-vertex mix, not a CPU animation.

import * as THREE from 'three'
import type { Engine, FrameCtx, System } from '../Engine'
import { crange, lerpHz } from '../math'
import { LOGO_NODES, mulberry32, sampleLogo } from '../logomark'
import { PD, vec3 } from '../palette'
import { LOGO_Z, WAYPOINTS } from '../waypoints'

const NODE_COUNT = 380
const CORRIDOR_NEAR = 15
const CORRIDOR_FAR = -46

const nodeVert = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aLogo;
  attribute vec3 aBurst;
  attribute vec2 aSeed;
  attribute float aSize;

  uniform float uContract;
  uniform float uBurst;
  uniform float uTime;
  uniform float uCamZ;
  uniform float uScrollDelta;
  uniform float uLogoScale;

  varying vec2 vUv;
  varying float vAct;
  varying float vHub;

  void main() {
    vUv = uv;
    vec3 target = vec3(aLogo.xy * uLogoScale, aLogo.z);
    vec3 p = mix(aPos, target, uContract);
    p += aBurst * uBurst * 26.0;

    // gentle organic drift so the network never reads as a static lattice
    float dr = 1.0 - uContract;
    p.x += sin(uTime * 0.31 + aSeed.x * 6.2831) * 0.11 * dr;
    p.y += cos(uTime * 0.27 + aSeed.y * 6.2831) * 0.11 * dr;

    vAct = smoothstep(20.0, 0.5, abs(p.z - uCamZ));
    vHub = aSeed.y;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float pulse = 0.85 + 0.15 * sin(uTime * 1.7 + aSeed.x * 12.0);
    float size = aSize * pulse * (1.0 + uContract * 0.5) * (1.0 + abs(uScrollDelta) * 0.06);
    mv.xy += position.xy * size;
    gl_Position = projectionMatrix * mv;
  }
`

const nodeFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uTeal;
  uniform vec3 uMark;
  uniform float uOpacity;
  uniform float uBurst;
  varying vec2 vUv;
  varying float vAct;
  varying float vHub;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = pow(max(0.0, 1.0 - d), 3.2);
    float halo = pow(max(0.0, 1.0 - d), 1.4) * 0.45;
    float a = min(1.0, core + halo) * uOpacity * (0.34 + vAct * 0.66) * (1.0 - uBurst * 0.85);
    if (a < 0.003) discard;
    vec3 col = mix(uTeal, uMark, core * 0.85 + vHub * 0.15);
    gl_FragColor = vec4(col * (0.85 + vAct * 1.6), a);
  }
`

const edgeVert = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aLogo;
  attribute vec3 aBurst;
  attribute float aT;
  attribute float aSeed;

  uniform float uContract;
  uniform float uBurst;
  uniform float uTime;
  uniform float uCamZ;
  uniform float uLogoScale;

  varying float vT;
  varying float vSeed;
  varying float vAct;

  void main() {
    vec3 target = vec3(aLogo.xy * uLogoScale, aLogo.z);
    vec3 p = mix(aPos, target, uContract);
    p += aBurst * uBurst * 26.0;
    float dr = 1.0 - uContract;
    p.x += sin(uTime * 0.31 + aSeed * 6.2831) * 0.11 * dr;
    p.y += cos(uTime * 0.27 + aSeed * 4.1) * 0.11 * dr;

    vT = aT;
    vSeed = aSeed;
    vAct = smoothstep(22.0, 0.5, abs(p.z - uCamZ));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const edgeFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uDeep;
  uniform vec3 uMark;
  uniform vec3 uTeal;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPulses;
  uniform float uBurst;
  varying float vT;
  varying float vSeed;
  varying float vAct;

  void main() {
    float base = 0.22;
    // packet travelling the wire — the "loop running" read
    float m = fract(vT - uTime * (0.16 + vSeed * 0.12) + vSeed);
    float packet = exp(-pow((m - 0.5) / 0.055, 2.0)) * uPulses;
    float a = (base + packet * 0.85) * uOpacity * (0.22 + vAct * 0.78) * (1.0 - uBurst * 0.9);
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uTeal, uMark, packet) * (1.0 + packet * 2.2), a);
  }
`

export class MeshNet implements System {
  order = 10
  private engine: Engine
  private nodes?: THREE.Mesh
  private edges?: THREE.LineSegments
  private uniforms: Record<string, THREE.IUniform> = {}
  private group = new THREE.Group()
  private contract = 0
  private burst = 0
  /** exposed so other systems (and the DOM nav flash) can read the signature state */
  state = { contract: 0, burst: 0 }

  constructor(engine: Engine) {
    this.engine = engine
  }

  init(ctx: FrameCtx) {
    const rand = mulberry32(0x9e3779b9)

    const pos = new Float32Array(NODE_COUNT * 3)
    const logo = new Float32Array(NODE_COUNT * 3)
    const burst = new Float32Array(NODE_COUNT * 3)
    const seed = new Float32Array(NODE_COUNT * 2)
    const size = new Float32Array(NODE_COUNT)

    const logoXY = sampleLogo(NODE_COUNT, mulberry32(0x1d9e75))

    for (let i = 0; i < NODE_COUNT; i++) {
      const t = i / (NODE_COUNT - 1)
      const z = CORRIDOR_NEAR + (CORRIDOR_FAR - CORRIDOR_NEAR) * t + (rand() - 0.5) * 2.4
      const ang = rand() * Math.PI * 2
      const rad = 1.3 + Math.pow(rand(), 0.62) * 8.5
      pos[i * 3] = Math.cos(ang) * rad
      pos[i * 3 + 1] = Math.sin(ang) * rad * 0.74
      pos[i * 3 + 2] = z

      // unit coords; uLogoScale frames them to the viewport each resize
      logo[i * 3] = logoXY[i * 2]
      logo[i * 3 + 1] = logoXY[i * 2 + 1]
      logo[i * 3 + 2] = LOGO_Z + (rand() - 0.5) * 0.35

      // burst direction: outward from the mark, biased up-and-toward-camera (the nav)
      const ba = rand() * Math.PI * 2
      burst[i * 3] = Math.cos(ba) * 0.8
      burst[i * 3 + 1] = Math.sin(ba) * 0.5 + 0.75
      burst[i * 3 + 2] = 0.35 + rand() * 0.8

      seed[i * 2] = rand()
      seed[i * 2 + 1] = rand()
      size[i] = 0.11 + Math.pow(rand(), 2.4) * 0.42
    }

    // --- nodes: instanced billboards ---
    const quad = new THREE.PlaneGeometry(1, 1)
    const ng = new THREE.InstancedBufferGeometry()
    ng.index = quad.index
    ng.attributes.position = quad.attributes.position
    ng.attributes.uv = quad.attributes.uv
    ng.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3))
    ng.setAttribute('aLogo', new THREE.InstancedBufferAttribute(logo, 3))
    ng.setAttribute('aBurst', new THREE.InstancedBufferAttribute(burst, 3))
    ng.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 2))
    ng.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1))
    ng.instanceCount = NODE_COUNT
    ng.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -16), 90)

    this.uniforms = {
      uTime: { value: 0 },
      uContract: { value: 0 },
      uBurst: { value: 0 },
      uCamZ: { value: 8 },
      uScrollDelta: { value: 0 },
      uLogoScale: { value: 2 },
      uOpacity: { value: 1 },
      uPulses: { value: ctx.tier.edgePulses ? 1 : 0 },
      uTeal: { value: new THREE.Vector3(...vec3(PD.teal)) },
      uMark: { value: new THREE.Vector3(...vec3(PD.mark)) },
      uDeep: { value: new THREE.Vector3(...vec3(PD.deep)) },
    }

    this.nodes = new THREE.Mesh(
      ng,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: nodeVert,
        fragmentShader: nodeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.nodes.frustumCulled = false

    // --- edges: nearest-neighbour wiring ---
    const pairs: Array<[number, number]> = []
    const seen = new Set<string>()
    for (let i = 0; i < NODE_COUNT; i++) {
      const cand: Array<[number, number]> = []
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i === j) continue
        const dx = pos[i * 3] - pos[j * 3]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        cand.push([j, dx * dx + dy * dy + dz * dz])
      }
      cand.sort((a, b) => a[1] - b[1])
      const links = 2 + (rand() < 0.35 ? 1 : 0)
      for (let k = 0; k < links; k++) {
        const j = cand[k][0]
        if (cand[k][1] > 90) continue
        const key = i < j ? `${i}_${j}` : `${j}_${i}`
        if (seen.has(key)) continue
        seen.add(key)
        pairs.push([i, j])
      }
    }

    const ec = pairs.length
    const ePos = new Float32Array(ec * 6)
    const eLogo = new Float32Array(ec * 6)
    const eBurst = new Float32Array(ec * 6)
    const eT = new Float32Array(ec * 2)
    const eSeed = new Float32Array(ec * 2)
    pairs.forEach(([a, b], e) => {
      for (let v = 0; v < 2; v++) {
        const n = v === 0 ? a : b
        const o = (e * 2 + v) * 3
        ePos[o] = pos[n * 3]
        ePos[o + 1] = pos[n * 3 + 1]
        ePos[o + 2] = pos[n * 3 + 2]
        eLogo[o] = logo[n * 3]
        eLogo[o + 1] = logo[n * 3 + 1]
        eLogo[o + 2] = logo[n * 3 + 2]
        eBurst[o] = burst[n * 3]
        eBurst[o + 1] = burst[n * 3 + 1]
        eBurst[o + 2] = burst[n * 3 + 2]
        eT[e * 2 + v] = v
        eSeed[e * 2 + v] = (e % 97) / 97
      }
    })

    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.BufferAttribute(ePos, 3))
    eg.setAttribute('aPos', new THREE.BufferAttribute(ePos, 3))
    eg.setAttribute('aLogo', new THREE.BufferAttribute(eLogo, 3))
    eg.setAttribute('aBurst', new THREE.BufferAttribute(eBurst, 3))
    eg.setAttribute('aT', new THREE.BufferAttribute(eT, 1))
    eg.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 1))
    eg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -16), 90)

    this.edges = new THREE.LineSegments(
      eg,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: edgeVert,
        fragmentShader: edgeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.edges.frustumCulled = false

    this.group.add(this.edges, this.nodes)
    this.engine.world.add(this.group)
  }

  update(ctx: FrameCtx) {
    const contactAt = WAYPOINTS[4].at
    const p = ctx.progress
    const cTarget = crange(p, contactAt - 0.06, contactAt + 0.05, 0, 1)
    // hold the assembled logomark before the burst — section offsets differ per
    // viewport, so the floor keeps the beat from collapsing on tall layouts
    const bTarget = crange(p, Math.max(0.945, contactAt + 0.11), 1, 0, 1)

    // ease the signature blend so a hard flick can't snap it
    this.contract = ctx.reduced ? cTarget : lerpHz(cTarget, this.contract, 0.12)
    this.burst = ctx.reduced ? bTarget : lerpHz(bTarget, this.burst, 0.12)
    this.state.contract = this.contract
    this.state.burst = this.burst
    this.engine.contractAmount = this.contract
    this.engine.burstAmount = this.burst

    this.uniforms.uTime.value = ctx.time
    this.uniforms.uContract.value = this.contract
    this.uniforms.uBurst.value = this.burst
    this.uniforms.uCamZ.value = ctx.camera.position.z
    this.uniforms.uScrollDelta.value = ctx.uScrollDelta
    this.uniforms.uLogoScale.value = this.engine.logoScale
  }

  dispose() {
    this.group.removeFromParent()
    this.nodes?.geometry.dispose()
    this.edges?.geometry.dispose()
    ;(this.nodes?.material as THREE.Material | undefined)?.dispose()
    ;(this.edges?.material as THREE.Material | undefined)?.dispose()
  }
}

export { LOGO_NODES }
