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
  await browser.close();

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

  console.log(pass ? '\nALL PASS — physics match the extracted spec.' : '\nFAILED — see mechanics.md §7 diagnosis table.');
  process.exit(pass ? 0 : 1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
