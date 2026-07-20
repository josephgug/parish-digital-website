// In-world display type: MSDF glyph quads with a per-letter reveal.
// troika-three-text is used ONLY as the layout + SDF-atlas engine
// (getTextRenderInfo); the mesh, the shader and the reveal are ours, which is
// what makes per-glyph rotate/translate/shear possible.
// Every string here also exists in the DOM as .sr-only copy (pipeline §6).

import * as THREE from 'three'
import { getTextRenderInfo } from 'troika-three-text'
import type { Engine, FrameCtx, System } from '../Engine'
import { crange } from '../math'
import { PD, vec3 } from '../palette'
import { WAYPOINTS } from '../waypoints'

const FONT = '/fonts/PlusJakartaSans-ExtraBold-latin.ttf'

type Line = { text: string; at: number; size?: number; dy?: number }

/** Band headlines — the world moments between DOM sections. */
const LINES: Line[] = [
  { text: 'WE BUILD THE MACHINE', at: 0.115, size: 0.70, dy: 0.55 },
  { text: 'THAT RUNS YOUR BUSINESS', at: 0.135, size: 0.70, dy: -0.55 },
  { text: 'AGENTS', at: 0.35, size: 1.5 },
  { text: 'AUTOMATIONS', at: 0.55, size: 1.2 },
  { text: 'LOOPS', at: 0.73, size: 1.5 },
]

export const HEADLINE_COPY = LINES.map((l) => l.text)

const vert = /* glsl */ `
  attribute vec4 aBounds;
  attribute float aSquare;
  attribute float aChannel;
  attribute float aFrac;
  attribute float aLine;

  uniform float uTransition;
  uniform float uPadding;
  uniform float uByLine;
  uniform float uRotate;
  uniform float uTranslate;
  uniform float uScrollDelta;
  uniform vec2 uAtlasSize;
  uniform float uGlyphSize;

  varying vec2 vGlyphUV;
  varying vec2 vUvStart;
  varying vec2 vUvPer;
  varying float vChannel;
  varying vec2 vDims;
  varying float vT;

  float cubicOut(float t) { return 1.0 - pow(1.0 - t, 3.0); }
  float crange(float v, float a, float b) { return clamp((v - a) / (b - a), 0.0, 1.0); }
  // stagger a glyph across the tween without per-glyph timers
  float rangeTransition(float p, float f, float pad) {
    return crange(p, f * (1.0 - pad), f * (1.0 - pad) + pad);
  }

  void main() {
    vec2 g = position.xy + 0.5;             // 0..1 across the glyph quad
    vGlyphUV = g;
    // Atlas UVs are resolved here, not baked: troika grows the shared atlas
    // texture as later headlines register glyphs, which would invalidate any
    // uv captured at build time.
    vUvPer = vec2(uGlyphSize) / uAtlasSize;
    float cols = uAtlasSize.x / uGlyphSize;
    vUvStart = vec2(mod(aSquare, cols), floor(aSquare / cols)) * vUvPer;
    vChannel = aChannel;
    vDims = vec2(aBounds.z - aBounds.x, aBounds.w - aBounds.y);

    float f = mix(aFrac, aLine, uByLine);
    float t = cubicOut(rangeTransition(uTransition, f, uPadding));
    vT = t;
    float k = 1.0 - t;

    vec2 quad = mix(aBounds.xy, aBounds.zw, g);
    vec2 c = (aBounds.xy + aBounds.zw) * 0.5;
    vec2 p = quad - c;

    float ang = k * uRotate;
    p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
    p *= mix(1.0, 0.78, k);

    vec3 world = vec3(c + p, 0.0);
    world.y -= k * uTranslate;
    world.z -= k * 1.6;
    // live shear so type reacts to the fling
    world.x += uScrollDelta * 0.05 * k;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uSDF;
  uniform float uExponent;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHot;

  varying vec2 vGlyphUV;
  varying vec2 vUvStart;
  varying vec2 vUvPer;
  varying float vChannel;
  varying vec2 vDims;
  varying float vT;

  // Decode troika's exponentially-encoded SDF back to a signed distance.
  float sdfDistance(float alpha) {
    float maxDim = max(vDims.x, vDims.y);
    float a = alpha > 0.5 ? 1.0 - alpha : alpha;
    float absDist = (1.0 - pow(2.0 * a, 1.0 / uExponent)) * maxDim;
    return absDist * (alpha > 0.5 ? -1.0 : 1.0);
  }

  void main() {
    vec2 uv = vUvStart + vGlyphUV * vUvPer;
    vec4 texel = texture2D(uSDF, uv);
    float ch = floor(vChannel + 0.5);
    float alpha = ch == 0.0 ? texel.r : ch == 1.0 ? texel.g : ch == 2.0 ? texel.b : texel.a;

    float dist = sdfDistance(alpha);
    float aa = max(fwidth(dist), 1e-5);
    float cov = 1.0 - smoothstep(-aa, aa, dist);
    float a = cov * uOpacity * vT;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uHot, uColor, vT), a);
  }
`

type Item = {
  line: Line
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  group: THREE.Group
  /** measured width of the laid-out copy, in world units */
  width: number
}

/** headlines are placed this far down the camera's forward axis (see placement) */
const HEADLINE_DIST = 13

export class Headlines implements System {
  order = 30
  private engine: Engine
  private items: Item[] = []
  private root = new THREE.Group()
  private disposed = false

  constructor(engine: Engine) {
    this.engine = engine
  }

  init() {
    this.engine.world.add(this.root)
    for (const line of LINES) this.build(line)
  }

  /** Position a headline in front of the camera path at its scroll fraction. */
  private placement(at: number) {
    let i = 0
    while (i < WAYPOINTS.length - 2 && at >= WAYPOINTS[i + 1].at) i++
    const a = WAYPOINTS[i]
    const b = WAYPOINTS[Math.min(i + 1, WAYPOINTS.length - 1)]
    const span = Math.max(1e-5, b.at - a.at)
    const raw = Math.min(1, Math.max(0, (at - a.at) / span))
    const t = raw * raw * (3 - 2 * raw)
    const pos = new THREE.Vector3(
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
      a.position[2] + (b.position[2] - a.position[2]) * t,
    )
    const look = new THREE.Vector3(
      a.lookAt[0] + (b.lookAt[0] - a.lookAt[0]) * t,
      a.lookAt[1] + (b.lookAt[1] - a.lookAt[1]) * t,
      a.lookAt[2] + (b.lookAt[2] - a.lookAt[2]) * t,
    )
    const fwd = look.clone().sub(pos).normalize()
    return pos.clone().addScaledVector(fwd, 13)
  }

  private build(line: Line) {
    const size = line.size ?? 1
    getTextRenderInfo(
      {
        text: line.text,
        font: FONT,
        fontSize: size,
        letterSpacing: 0.02,
        maxWidth: 12,
        textAlign: 'center',
        anchorX: 'center',
        anchorY: 'middle',
        sdfGlyphSize: 64,
      },
      (info: {
        glyphBounds: Float32Array
        glyphAtlasIndices: Float32Array
        sdfTexture: THREE.Texture
        sdfGlyphSize: number
        sdfExponent: number
      }) => {
        if (this.disposed) return
        const n = info.glyphAtlasIndices.length
        if (!n) return

        const tex = info.sdfTexture

        const bounds = new Float32Array(n * 4)
        const square = new Float32Array(n)
        const channel = new Float32Array(n)
        const frac = new Float32Array(n)
        const lineFrac = new Float32Array(n)

        // group glyphs into visual lines by their quad's vertical centre
        const ys: number[] = []
        for (let i = 0; i < n; i++) {
          const y = (info.glyphBounds[i * 4 + 1] + info.glyphBounds[i * 4 + 3]) / 2
          if (!ys.some((v) => Math.abs(v - y) < size * 0.4)) ys.push(y)
        }
        ys.sort((a, b) => b - a)

        for (let i = 0; i < n; i++) {
          bounds.set(info.glyphBounds.subarray(i * 4, i * 4 + 4), i * 4)
          const idx = info.glyphAtlasIndices[i]
          square[i] = Math.floor(idx / 4) // 4 glyphs share one texel square (RGBA)
          channel[i] = idx % 4
          frac[i] = n > 1 ? i / (n - 1) : 0
          const y = (info.glyphBounds[i * 4 + 1] + info.glyphBounds[i * 4 + 3]) / 2
          const li = ys.findIndex((v) => Math.abs(v - y) < size * 0.4)
          lineFrac[i] = ys.length > 1 ? li / (ys.length - 1) : 0
        }

        const quad = new THREE.PlaneGeometry(1, 1)
        const g = new THREE.InstancedBufferGeometry()
        g.index = quad.index
        g.attributes.position = quad.attributes.position
        g.setAttribute('aBounds', new THREE.InstancedBufferAttribute(bounds, 4))
        g.setAttribute('aSquare', new THREE.InstancedBufferAttribute(square, 1))
        g.setAttribute('aChannel', new THREE.InstancedBufferAttribute(channel, 1))
        g.setAttribute('aFrac', new THREE.InstancedBufferAttribute(frac, 1))
        g.setAttribute('aLine', new THREE.InstancedBufferAttribute(lineFrac, 1))
        g.instanceCount = n
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14)

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uSDF: { value: tex },
            uAtlasSize: { value: new THREE.Vector2(1, 1) },
            uGlyphSize: { value: info.sdfGlyphSize },
            uExponent: { value: info.sdfExponent },
            uTransition: { value: 0 },
            uPadding: { value: 0.42 },
            uByLine: { value: 0.35 },
            uRotate: { value: 0.55 },
            uTranslate: { value: size * 0.9 },
            uScrollDelta: { value: 0 },
            uOpacity: { value: 1 },
            uColor: { value: new THREE.Vector3(...vec3(0xe8f5f0)) },
            uHot: { value: new THREE.Vector3(...vec3(PD.mark)) },
          },
          vertexShader: vert,
          fragmentShader: frag,
          transparent: true,
          depthWrite: false,
        })

        const mesh = new THREE.Mesh(g, mat)
        mesh.frustumCulled = false
        const group = new THREE.Group()
        group.add(mesh)
        group.position.copy(this.placement(line.at))
        group.position.y += line.dy ?? 0

        // real laid-out width, not the maxWidth cap — so copy that already
        // fits is never shrunk on desktop
        let minX = Infinity
        let maxX = -Infinity
        for (let i = 0; i < n; i++) {
          minX = Math.min(minX, info.glyphBounds[i * 4])
          maxX = Math.max(maxX, info.glyphBounds[i * 4 + 2])
        }

        this.root.add(group)
        this.items.push({ line, mesh, mat, group, width: Math.max(0.001, maxX - minX) })
        this.fit()
      },
    )
  }

  /**
   * Portrait fitting. Headlines are billboarded 13 units in front of the
   * camera, so the world width the viewport can show is driven by ASPECT: at
   * fov 30 that is ~11 units across on a 1440x900 desktop but only ~3.2 on a
   * 390x844 phone. The copy is authored up to 12 units wide, so on portrait it
   * ran ~3.7x past both edges. Scale is only ever reduced, never increased —
   * desktop, where the copy already fits, is untouched.
   */
  private fit() {
    const { w, h } = this.engine.sizeOf()
    const halfH = HEADLINE_DIST * Math.tan((30 * Math.PI) / 360)
    const usable = halfH * (w / h) * 2 * 0.88 // 12% total side margin
    for (const it of this.items) {
      it.group.scale.setScalar(Math.min(1, usable / it.width))
    }
  }

  resize() {
    this.fit()
  }

  update(ctx: FrameCtx) {
    for (const it of this.items) {
      const at = it.line.at
      const img = (it.mat.uniforms.uSDF.value as THREE.Texture | null)?.image as
        | { width: number; height: number }
        | undefined
      if (img?.width) (it.mat.uniforms.uAtlasSize.value as THREE.Vector2).set(img.width, img.height)
      // scroll-linked reveal: stagger in on approach, hold, release on exit
      const inT = crange(ctx.progress, at - 0.055, at - 0.004, 0, 1)
      const outT = 1 - crange(ctx.progress, at + 0.03, at + 0.075, 0, 1)
      const t = ctx.reduced ? (ctx.progress > at - 0.055 ? 1 : 0) * outT : inT
      it.mat.uniforms.uTransition.value = t
      it.mat.uniforms.uOpacity.value = outT
      it.mat.uniforms.uScrollDelta.value = ctx.uScrollDelta
      it.group.visible = t > 0.001 && outT > 0.001
      if (it.group.visible) it.group.quaternion.copy(ctx.camera.quaternion)
    }
  }

  dispose() {
    this.disposed = true
    this.root.removeFromParent()
    for (const it of this.items) {
      it.mesh.geometry.dispose()
      it.mat.dispose()
    }
    this.items = []
  }
}
