# MOTION-NOTES-v2 — parishdigital.ai, ActiveTheory-tier rebuild

Branch: `feat/activetheory-motion-v2` (off `main`; production untouched)
Concept: **"The Agentic Mesh"**, motion dial **Cinematic-Max**
Built against `webgl-scroll-experience` (mechanics / scene-recipes / pipeline / intake)
Physics graded against `qa/targets.json` — the measured activetheory.net capture.

**No v1 motion code was reused.** The WebGL layer is a ground-up build.

---

## Gate results (run against the live Vercel preview)

```
qa/verify-scroll.mjs
  targets: decay 0.9138±0.015 · half-life 7.69±1.5f · sat 2.699–3.299  (qa/targets.json)
  PASS  impulse decay/frame      0.9153   (target 0.9138 ± 0.015)
  PASS  impulse half-life        7.83f    (target 7.69 ± 1.5)
  PASS  flick peak saturates     3.000    (target 2.699 – 3.299)
  PASS  velocity is signed       -3.00 .. 1.43
  PASS  frame pacing ~60fps      median dt 16.7ms
  ALL PASS — physics match the extracted spec.

qa/verify-a11y.mjs   ALL PASS (12 checks)
  reduced motion: no aberration, no banking, no cursor takeover, copy immediate
  no-WebGL: fallback flag, native scrolling restored, canvas removed, hero copy renders
  SEO/a11y: all 10 required strings in the DOM, canvas aria-hidden, one frame loop
```

Sanity check on the physics: a single 600px wheel flick moves the world exactly
**405.0 units** — the sizing identity from mechanics.md (`deltaY × 0.25 × 10 × 0.27`).

---

## The three anti-Walmart inversions

**1. Architecture-first.** `<body>` does not scroll. One WebGL2 canvas behind
everything, one master rAF, and the `VirtualScroll` accumulator as the spine.
The DOM content layer is `translate3d`-driven by the same scroll value the
camera reads. Tweens, the cursor, magnetic CTAs and every system share the
engine's single frame callback — there is no second `requestAnimationFrame`
anywhere in the app.

**2. Physics gated, not approximated.** `VirtualScroll` is verbatim from
mechanics.md: per-OS wheel table (Win/Chrome 0.25, Mac 0.33, FF-line 10/4),
inertia **seeded from the wheel delta** and decayed ×0.9/frame, position lerp
0.5, `uScrollDelta` clamped to ±3.0, and `lerpHz` on a **120fps baseline**.
No Lenis. Every phase was gated before moving on.

**3. A deliberate signature moment.** Built on purpose, not emergent — see below.

---

## What shipped, per phase

### 0–1 · Engine + physics gate
`VirtualScroll`, `lerpHz`/`aHz`, a 60-line engine-local tween lib, touch drag +
fling (easeOutQuint 2500ms, ×25 desktop-touch / ×35 Android), the full keyboard
map, `window.__RIG` instrumentation, camera waypoint rig, velocity banking (max
3°), Lissajous idle wobble, pointer + accelerometer parallax, visibility pause,
context-loss handling. Gate run against a bare scene before any art existed.

### 2–3 · The Agentic Mesh + signature moment
- **MeshNet** — 380 GPU nodes wired into ~500 nearest-neighbour edges spanning
  the corridor (z +15 → −46), with light packets travelling the wires. Nodes
  brighten as the camera passes them, so flying through the network *lights it up*.
- **Particles** — up to 160k points (tier ceiling), procedural drift, velocity
  shear, pointer repulsion, perspective-correct sizing.
- **Camera Z-dolly** — the authored signature move: load flies 40 → 8, then
  scroll pushes 8 → 2 → −7 → −17 → −27.5, then pulls back out to −22 for the
  footer. Waypoint fractions are re-derived from **real DOM section offsets**,
  so copy edits can never desync the choreography.
- Parallax is emergent — depth placement plus the dolly, never per-layer
  scroll multipliers.

### 4 · Post chain, fluid, MSDF type
- **Composite** in the exact spec order: fluid → frost → uniform directional
  chromatic aberration (`0.0001 × uScrollDelta`, channels 120° apart, signed) →
  grade → bloom (high threshold, accents not haze) → corner glows/vignette →
  contact-state zoom. One fullscreen draw after the bloom prepass.
- **Fluid** — real GPU stable-fluids: splat → curl → vorticity → divergence →
  12 Jacobi pressure iterations → gradient subtract → advect, on ping-pong
  half-float FBOs at 1/8 res. High-tier desktop only.
- **Headlines** — in-world MSDF display type with a genuine per-glyph reveal:
  glyphs rotate, scale and translate in on a `cubicOut` stagger (letter fraction
  mixed with line fraction) and shear live under `uScrollDelta`. Scroll-linked,
  not timer-driven.

### 5–6 · Integration + gates
Glass DOM sections over the world, custom cursor, magnetic CTAs, active-section
nav, virtual-scroll anchor links, viewport-framed signature moment, and the
`verify-a11y.mjs` robustness gate.

---

## The signature moment

At the CTA band the **entire mesh contracts back into the PD logomark** — and
because the logomark is itself a node-edge graph (six outer nodes, a hub, three
spokes), it is a native formation target rather than a traced silhouette. The
network's own nodes become the mark's nodes and its own edges become the mark's
edges. It holds for a beat, then bursts up and out toward the nav, which flashes
teal in sync (`.nav-burst`).

The whole thing is one per-vertex `mix(worldPos, logoPos, uContract)` plus a
burst offset — no CPU animation, no separate mesh.

The same logomark also assembles from the point-cloud at load, holds, and
disperses into the mesh; the DOM hero copy resolves in *after* that (2.4s), so
the formation and the headline never fight each other.

Shots: `qa-shots/final-1440/1440-093.png`, `qa-shots/final-390/390-092.png`.

---

## Deltas from the spec (deliberate, with reasons)

| Spec | What shipped | Why |
|---|---|---|
| Unbounded scroll accumulator | Unbounded **physics** + rubber-band ends; `pixels`/`progress` clamp | A hard clamp kills the fling at the page ends and leaves a dead zone. This keeps spec physics *and* stops the DOM at the footer. |
| GPGPU ping-pong particle positions | Procedural drift in the vertex shader | Identical look at 160k points with no extra FBOs. Swap in a sim pass if we ever need persistent trails or attractors. |
| Discrete waypoint activation | Smooth interpolation between waypoints, *then* the eased chase | A single-page fly-through needs a continuous dolly; the lerp lag that gives the cinematic feel is unchanged. |
| MSDF via `troika-three-text` meshes | troika used only for layout + SDF atlas; our own instanced mesh/shader | troika's `Text` can't do per-glyph rotate/translate/shear, which is the whole point of the reveal. |
| `vite-plugin-glsl` chunks | GLSL as tagged template strings | One less dependency; the chunk library isn't shared across projects yet. |
| Draco/KTX2 asset pipeline | Not needed | The world is fully procedural — no geometry or texture assets to compress. Only asset is a 29KB font. |

---

## Bugs worth remembering

1. **`Object3D.lookAt()` points +Z at the target** (three inverts the args for
   non-cameras; only cameras/lights get −Z). Deriving waypoint quaternions from
   a plain `Object3D` flipped every waypoint 180°, so the camera flew the
   corridor **backwards** and the logomark formed behind it. Use a
   `PerspectiveCamera` for the scratch object.
2. **Fluid dt must be real seconds.** Feeding frame-normalised dt (~1.0) turns
   vorticity confinement into a positive feedback loop; the field explodes and
   smears the whole composite. The composite also soft-normalises `tFluid`
   rather than scaling it raw, so a fast swipe can never throw the uv off-texture.
3. **troika grows its shared SDF atlas** as later headlines register glyphs, so
   any atlas UV baked at build time goes stale. Resolve UVs in the vertex shader
   from the live texture size.
4. **Vite's watcher reloads the page mid-capture.** The harness writes CSVs into
   the project, which wiped `window.__RIG` between sessions and made two of five
   checks fail for reasons that had nothing to do with the physics.
   `server.watch.ignored` fixes it.
5. **The no-WebGL fallback rendered blank** because the hero copy still waited
   out the 2.4s intro for a formation that never plays. A sync `HAS_WEBGL` probe
   short-circuits it. Caught only after strengthening the a11y gate — the first
   version asserted structure but never that anything was *visible*.
6. **Never call `renderer.dispose()` in React cleanup** (carried over from v1 —
   StrictMode's double-mount blacks the canvas). `Engine.dispose()` tears down
   systems and listeners but leaves the renderer alone.

---

## Performance

| Metric | Target | Actual |
|---|---|---|
| Frame rate | 60fps under scroll | median dt 16.7ms |
| rAF loops | exactly 1 | 1 |
| Draw calls | ≤ ~100 under motion | ~30 (world 3–8, bloom 5, composite 1, fluid ~19 at 180×112) |
| JS bundle | ≤ ~2MB | 1.03MB raw / **295KB gzip** |
| Assets | — | one 29KB font; the world is fully procedural |

Tier ladder (`detect-gpu`): particles 160k / 70k / 24k desktop by tier, 30k /
12k mobile; fluid high-tier desktop only; bloom off below tier 1; DPR ladder per
pipeline.md including the 1.5 floor on high-end.

---

## Needs Joe's eyes

1. **Warm secondary accent.** `brand-reference.md` defines no warm colour. I
   proposed amber `#E8A657`, used only for the bottom-right corner glow and CTA
   warmth. Confirm or replace — it's one constant in `src/engine/palette.ts`.
2. **New copy in the world bands.** The MSDF headlines introduce five strings
   that weren't on the old site: the brief's positioning line ("We build the
   machine that runs your business") plus AGENTS / AUTOMATIONS / LOOPS. All
   existing copy is preserved verbatim; these are additions. Approve the wording.
3. **Page length.** The site is now ~10,500px tall (≈11.7 viewports) — the open
   bands between sections are where the camera does its work. It reads as
   cinematic, but it is a long scroll. Worth feeling on a real trackpad.
4. **Contact form still simulates the send** (1.2s timeout, unchanged from
   `main`). v1's real send lives on the old branch and was out of scope here —
   say the word and I'll port it.
5. **Section intro copy over the busy field.** The centered eyebrow/sub lines in
   Services / Why / Contact sit directly on the mesh. Readable, but a subtle
   radial scrim behind them would tighten it.
6. **Real-device pass.** All QA here is headless Chromium via ANGLE. Needs a
   look on an actual iPhone (the 2020-class perf floor from the brief) and on
   the desktop GPU where the fluid actually runs.

---

## Running the gates

```bash
npm run dev
node qa/verify-scroll.mjs http://localhost:5173 qa-shots/scroll
node qa/verify-a11y.mjs   http://localhost:5173 qa-shots/a11y
node qa/shots.mjs         http://localhost:5173 qa-shots/latest 1440 900
node qa/shots.mjs         http://localhost:5173 qa-shots/latest 390 844 0,0.35,0.92
```

`qa/targets.json` is the authority for the physics numbers — the harness reads
it rather than carrying hardcoded literals.
