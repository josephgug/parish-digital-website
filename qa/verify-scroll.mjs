// verify-scroll.mjs — acceptance test for the WebGL scroll engine.
// Drives scripted wheel sessions against a build exposing window.__RIG
// (see pipeline.md §7) and grades the velocity physics against the
// measured activetheory.net ground truth (mechanics.md §7).
//
// Usage:  node verify-scroll.mjs <url-or-html-path> [outDir]
// Needs:  npm i -D playwright   (chromium installed)
// Exit 0 = all PASS, exit 1 = any FAIL.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const arg = process.argv[2];
if (!arg) { console.error('usage: node verify-scroll.mjs <url-or-html-path> [outDir]'); process.exit(1); }
const URL = /^https?:/.test(arg) ? arg : pathToFileURL(resolve(arg)).href;
const OUT = process.argv[3] || 'qa-scroll';
mkdirSync(OUT, { recursive: true });

// ---- ground truth: measured activetheory.net capture (site-mechanics-teardown) ----
// qa/targets.json is the authority; the literals below are the skill's defaults.
const DEFAULTS = {
  decay:    { val: 0.911, tol: 0.015 },   // per-frame decay of |uScrollDelta| tail
  halfLife: { val: 7.5,   tol: 1.5   },   // frames
  satPeak:  { min: 2.7,   max: 3.3   },   // 6x1000 flick peak (saturation ceiling)
  fpsMedianDtMaxMs: 22,
};
const TARGETS_PATH = join(dirname(fileURLToPath(import.meta.url)), 'targets.json');
const TARGET = existsSync(TARGETS_PATH)
  ? { ...DEFAULTS, ...JSON.parse(readFileSync(TARGETS_PATH, 'utf8')) }
  : DEFAULTS;
console.log(`targets: decay ${TARGET.decay.val}±${TARGET.decay.tol} · half-life ${TARGET.halfLife.val}±${TARGET.halfLife.tol}f · sat ${TARGET.satPeak.min}–${TARGET.satPeak.max}` +
  (existsSync(TARGETS_PATH) ? '  (qa/targets.json)' : '  (skill defaults)'));

const toCSV = (rows) => { const cols = Object.keys(rows[0] || { f: 0 }); return cols.join(',') + '\n' + rows.map(r => cols.map(c => r[c]).join(',')).join('\n'); };

function fitDecay(frames) {
  // log-linear regression on the |uScrollDelta| tail after its peak
  const usd = frames.map(r => Math.abs(r.uScrollDelta));
  const peakI = usd.indexOf(Math.max(...usd));
  const tail = usd.slice(peakI).filter(v => v > 1e-4);
  if (tail.length < 10) return null;
  const xs = tail.map((_, i) => i), ys = tail.map(v => Math.log(v));
  const n = xs.length, sx = xs.reduce((a,b)=>a+b), sy = ys.reduce((a,b)=>a+b);
  const sxx = xs.reduce((a,b)=>a+b*b,0), sxy = xs.reduce((a,x,i)=>a+x*ys[i],0);
  const slope = (n*sxy - sx*sy) / (n*sxx - sx*sx);
  const decay = Math.exp(slope);
  return { decay, halfLife: Math.log(0.5) / Math.log(decay), peak: Math.max(...usd) };
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const hasRig = await page.evaluate(() => !!window.__RIG);
  if (!hasRig) { console.error('FAIL: window.__RIG hook not found — add the dev instrumentation (pipeline.md §7)'); process.exit(1); }
  await page.mouse.move(720, 450);

  const enable = () => page.evaluate(() => { window.__RIG.enabled = true; window.__RIG.frames = []; });
  const grab   = () => page.evaluate(() => { const d = window.__RIG.frames.slice(); window.__RIG.enabled = false; return d; });

  const sessions = [
    { name: 'A-impulse',    run: async () => { await page.mouse.wheel(0, 600); await page.waitForTimeout(2800); } },
    { name: 'C-fast-flick', run: async () => { for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 1000); await page.waitForTimeout(30); } await page.waitForTimeout(2800); } },
    { name: 'E-reverse',    run: async () => { for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 500);  await page.waitForTimeout(50); } for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(50); } await page.waitForTimeout(2000); } },
  ];

  const data = {};
  for (const s of sessions) {
    await enable(); await s.run();
    data[s.name] = await grab();
    writeFileSync(`${OUT}/${s.name}.csv`, toCSV(data[s.name]));
  }

  // ---- runway + per-notch probes ----------------------------------------
  // These exist because the sessions above CANNOT catch two whole classes of
  // bug: page.mouse.wheel only ever emits deltaMode=0 (so a broken line-mode
  // path stays invisible), and the physics decay is measured per FRAME (so a
  // notch that settles 4x too fast in wall-clock time still fits the curve).
  const geo = await page.evaluate(() => {
    const c = document.getElementById('scroll-content');
    const e = window.__ENGINE;
    if (!c || !e) return null;
    return {
      scrollHeight: c.scrollHeight,
      vh: window.innerHeight,
      runwayPx: e.scroll.maxPixels,
      runwayViewports: e.scroll.maxPixels / window.innerHeight,
    };
  });

  // One notch, dispatched with an explicit deltaMode, measured to full rest.
  const notchOn = (page) => async (deltaMode, deltaY) => {
    await page.evaluate(() => {
      const e = window.__ENGINE;
      e.scroll.target = 0; e.scroll.y = 0; e.scroll.inertia = 0; e.scroll.isInertia = false;
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__RIG.frames = []; window.__RIG.enabled = true; });
    await page.evaluate(([dm, dy]) =>
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: dm, bubbles: true })),
      [deltaMode, deltaY]);
    await page.waitForTimeout(2200);
    return page.evaluate(() => {
      const f = window.__RIG.frames.slice();
      window.__RIG.enabled = false;
      const moving = f.filter((r) => Math.abs(r.uScrollDelta) > 0.02);
      return {
        px: window.__ENGINE.scroll.pixels,
        // frames the notch was actually in motion — "many frames" IS the runway
        movingFrames: moving.length,
        // wall-clock is the refresh-rate-invariant measure: a per-frame
        // constant applied raw makes this collapse on a high-Hz display while
        // the per-frame decay fit still looks perfect.
        movingMs: moving.length > 1 ? moving[moving.length - 1].t - moving[0].t : 0,
      };
    });
  };

  const notch = notchOn(page);
  const probe = geo && {
    geo,
    pixel: await notch(0, 100), // Chrome/Edge/Safari physical mouse
    line: await notch(1, 3),    // Firefox / line-reporting mouse driver
  };

  // Slow continuous line-mode wheel: each notch must advance a little, never
  // a section. This is the shape of a real hand on a real wheel.
  let slowLine = null;
  if (geo) {
    await page.evaluate(() => {
      const e = window.__ENGINE;
      e.scroll.target = 0; e.scroll.y = 0; e.scroll.inertia = 0; e.scroll.isInertia = false;
    });
    await page.waitForTimeout(500);
    const steps = [];
    for (let i = 0; i < 10; i++) {
      const before = await page.evaluate(() => window.__ENGINE.scroll.pixels);
      await page.evaluate(() =>
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: 1, bubbles: true })));
      await page.waitForTimeout(300); // a human notch cadence, not a flick
      const after = await page.evaluate(() => window.__ENGINE.scroll.pixels);
      steps.push(after - before);
    }
    slowLine = { maxStep: Math.max(...steps), total: steps.reduce((a, b) => a + b, 0) };
  }

  await browser.close();

  // ---- high-refresh pass -------------------------------------------------
  // Joe's desktop is not 60Hz, and neither is any gaming panel. Unlocking vsync
  // drives rAF into the thousands of fps, which stands in for a 144/240Hz
  // display: if any physics constant is applied raw per-frame, the same notch
  // completes in a fraction of the wall-clock time and the runway vanishes.
  let fast = null;
  try {
    const b2 = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
    const p2 = await (await b2.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
    await p2.goto(URL, { waitUntil: 'load' });
    await p2.waitForTimeout(2500);
    const fps = await p2.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); };
      requestAnimationFrame(tick);
    }));
    fast = { fps, notch: await notchOn(p2)(0, 100) };
    await b2.close();
  } catch (e) {
    console.log(`note: high-refresh pass unavailable (${e.message})`);
  }

  let pass = true;
  const check = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`); if (!ok) pass = false; };

  const A = fitDecay(data['A-impulse']);
  check('impulse decay/frame', A && Math.abs(A.decay - TARGET.decay.val) <= TARGET.decay.tol, A ? `${A.decay.toFixed(4)} (target ${TARGET.decay.val}±${TARGET.decay.tol})` : 'no tail');
  check('impulse half-life',   A && Math.abs(A.halfLife - TARGET.halfLife.val) <= TARGET.halfLife.tol, A ? `${A.halfLife.toFixed(2)}f (target ${TARGET.halfLife.val}±${TARGET.halfLife.tol})` : '—');

  const C = fitDecay(data['C-fast-flick']);
  check('flick peak saturates', C && C.peak >= TARGET.satPeak.min && C.peak <= TARGET.satPeak.max, C ? `${C.peak.toFixed(3)} (target ${TARGET.satPeak.min}–${TARGET.satPeak.max})` : '—');

  const E = data['E-reverse'].map(r => r.uScrollDelta);
  check('velocity is signed', Math.max(...E) > 0.3 && Math.min(...E) < -0.3, `range ${Math.min(...E).toFixed(2)}..${Math.max(...E).toFixed(2)}`);

  const dts = data['A-impulse'].map(r => r.dt).filter(Boolean);
  const medDt = dts.sort((a,b)=>a-b)[dts.length >> 1] || 0;
  check('frame pacing ~60fps', medDt > 0 && medDt < (TARGET.fpsMedianDtMaxMs ?? 22), `median dt ${medDt.toFixed(1)}ms`);

  // ---- runway + per-notch checks ----------------------------------------
  if (!probe) {
    check('runway probe', false, 'window.__ENGINE or #scroll-content missing');
  } else {
    const { runwayPx, runwayViewports, scrollHeight, vh } = probe.geo;
    const SECTION = runwayPx / 6;            // 6 authored waypoints
    const pct = (px) => (px / runwayPx) * 100;
    const sect = (px) => (px / SECTION) * 100;

    check('runway >= 10 viewports', runwayViewports >= 10,
      `${runwayViewports.toFixed(1)} vh of travel (content ${scrollHeight}px @ ${vh}px viewport)`);

    for (const [label, r] of [['pixel-mode (deltaMode 0)', probe.pixel], ['line-mode (deltaMode 1)', probe.line]]) {
      check(`one ${label} notch is a small step`, r.px > runwayPx * 0.005 && r.px < runwayPx * 0.05,
        `${r.px.toFixed(0)}px = ${pct(r.px).toFixed(2)}% of runway, ${sect(r.px).toFixed(1)}% of a section`);
      // a notch that lands instantly is the "no runway visible" bug, and it is
      // invisible to a per-frame decay fit — this is the wall-clock guard
      check(`${label} notch glides over many frames`, r.movingFrames >= 25,
        `${r.movingFrames} frames in motion`);
    }

    const [lo, hi] = [probe.pixel.px, probe.line.px].sort((a, b) => a - b);
    check('deltaMode 0 and 1 normalized to each other', lo > 0 && hi / lo <= 2,
      `pixel ${probe.pixel.px.toFixed(0)}px vs line ${probe.line.px.toFixed(0)}px (ratio ${(hi / (lo || 1)).toFixed(2)}x, allowed <=2x)`);

    // both bounds matter: too big is a section-jump, too small is the dead
    // line-mode path (which otherwise reads as a reassuring "gradual" PASS)
    check('slow line-mode wheel advances gradually', slowLine && sect(slowLine.maxStep) < 20 && pct(slowLine.total) > 5,
      slowLine ? `worst notch ${slowLine.maxStep.toFixed(0)}px = ${sect(slowLine.maxStep).toFixed(1)}% of a section; 10 notches = ${pct(slowLine.total).toFixed(1)}% of runway` : '—');

    if (fast) {
      const ratio = probe.pixel.movingMs / (fast.notch.movingMs || 1);
      check('feel is refresh-rate independent', ratio <= 1.5 && ratio >= 0.66,
        `notch takes ${probe.pixel.movingMs.toFixed(0)}ms @60fps vs ${fast.notch.movingMs.toFixed(0)}ms @${fast.fps}fps (${ratio.toFixed(2)}x, allowed 0.66-1.5x)`);
      check('travel per notch is refresh-rate independent',
        Math.abs(fast.notch.px - probe.pixel.px) < probe.pixel.px * 0.15,
        `${probe.pixel.px.toFixed(0)}px @60fps vs ${fast.notch.px.toFixed(0)}px @${fast.fps}fps`);
    }
  }

  console.log(pass ? '\nALL PASS — physics match the extracted spec.' : '\nFAILED — see mechanics.md §7 diagnosis table.');
  process.exit(pass ? 0 : 1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
