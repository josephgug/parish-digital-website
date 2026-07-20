// diagnose-scroll.mjs — evidence gathering, no assertions.
// Reports runway geometry, waypoint spacing, and what ONE wheel notch does
// in pixel-mode (deltaMode 0) vs line-mode (deltaMode 1).
//
// Usage: node qa/diagnose-scroll.mjs <url>

import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:5173';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(3500); // let fonts + measureContent settle
await page.mouse.move(720, 450);

// ---- geometry ----
const geo = await page.evaluate(() => {
  const c = document.getElementById('scroll-content');
  const e = window.__ENGINE;
  return {
    scrollHeight: c?.scrollHeight ?? null,
    innerHeight: window.innerHeight,
    viewports: c ? +(c.scrollHeight / window.innerHeight).toFixed(2) : null,
    engineFound: !!e,
    scrollMax: e?.scroll?.max ?? null,
    scrollScale: e?.scroll?.scale ?? null,
    maxPixels: e?.scroll?.maxPixels ?? null,
    runwayViewports: e ? +((e.scroll.maxPixels) / window.innerHeight).toFixed(2) : null,
    // recompute waypoint fractions the same way Engine.measureContent does
    waypoints: (() => {
      if (!c) return null;
      const total = Math.max(1, c.scrollHeight - window.innerHeight);
      const top = c.getBoundingClientRect().top;
      return ['hero','services','why','about','building','contact','footer'].map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, at: 'MISSING ELEMENT' };
        return { id, at: +((el.getBoundingClientRect().top - top) / total).toFixed(4) };
      });
    })(),
  };
});
console.log('--- GEOMETRY ---');
console.log(JSON.stringify(geo, null, 2));

// ---- what does one notch do? ----
async function notch(deltaMode, deltaY) {
  await page.evaluate(() => { const e = window.__ENGINE; e.scroll.target = 0; e.scroll.y = 0; e.scroll.inertia = 0; e.scroll.isInertia = false; });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.__ENGINE.progress);
  await page.evaluate(([dm, dy]) => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: dm, bubbles: true, cancelable: true }));
  }, [deltaMode, deltaY]);
  await page.waitForTimeout(1800); // let inertia fully settle
  const after = await page.evaluate(() => ({ p: window.__ENGINE.progress, px: window.__ENGINE.scroll.pixels }));
  return { deltaMode, deltaY, progressDelta: +(after.p - before).toFixed(5), pixels: +after.px.toFixed(1) };
}

console.log('\n--- ONE NOTCH (settled, incl. inertia tail) ---');
for (const [dm, dy] of [[0, 100], [0, 120], [1, 3], [1, 1], [2, 1]]) {
  const r = await notch(dm, dy);
  const sectionPct = (r.progressDelta / (1 / 6)) * 100; // 6 waypoints ~ 6 sections
  console.log(`deltaMode=${dm} deltaY=${dy}  ->  progress +${r.progressDelta}  (${sectionPct.toFixed(1)}% of a section)  pixels=${r.pixels}`);
}

// ---- what deltaMode does a real wheel event carry here? ----
console.log('\n--- NOTE: playwright mouse.wheel always emits deltaMode=0 ---');
const observed = await page.evaluate(async () => {
  const seen = [];
  const fn = (e) => seen.push({ deltaMode: e.deltaMode, deltaY: e.deltaY });
  window.addEventListener('wheel', fn, { passive: true });
  await new Promise(r => setTimeout(r, 50));
  return new Promise(r => setTimeout(() => { window.removeEventListener('wheel', fn); r(seen); }, 900));
});
await page.mouse.wheel(0, 120);
console.log('observed from playwright wheel:', JSON.stringify(observed));

await browser.close();
