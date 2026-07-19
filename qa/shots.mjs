// Scroll-position screenshots across the fly-through.
// usage: node qa/shots.mjs <url> [outDir] [width] [height]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] || 'http://localhost:5183'
const out = process.argv[3] || 'qa-shots/latest'
const W = Number(process.argv[4] || 1440)
const H = Number(process.argv[5] || 900)
mkdirSync(out, { recursive: true })

const STOPS = process.argv[6]
  ? process.argv[6].split(',').map(Number)
  : [0, 0.12, 0.28, 0.45, 0.62, 0.78, 0.88, 0.96, 1]

const b = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-webgl'],
})
const page = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage()
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)))
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text().slice(0, 300)))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(5200) // let the intro formation finish
await page.mouse.move(W * 0.62, H * 0.42)

for (const p of STOPS) {
  await page.evaluate((frac) => {
    const e = window.__ENGINE
    const maxT = e.scroll.max / e.scroll.scale
    e.scroll.isInertia = false
    e.scroll.inertia = 0
    e.scroll.target = maxT * frac
    e.scroll.y = e.scroll.target * e.scroll.scale
  }, p)
  await page.waitForTimeout(1400)
  const name = `${String(Math.round(p * 100)).padStart(3, '0')}`
  await page.screenshot({ path: `${out}/${W}-${name}.png` })
}
console.log(`wrote ${STOPS.length} shots to ${out}`)
await b.close()
