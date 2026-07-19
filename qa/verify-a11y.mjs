// Robustness gates the original site does NOT pass (pipeline.md §6):
// prefers-reduced-motion, no-WebGL fallback, and copy present in the DOM.
// usage: node qa/verify-a11y.mjs <url> [outDir]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] || 'http://localhost:5183'
const out = process.argv[3] || 'qa-shots/a11y'
mkdirSync(out, { recursive: true })

let pass = true
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) pass = false
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-webgl'],
})

// ---- 1. reduced motion ----
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  await page.mouse.move(700, 400)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(600)

  const r = await page.evaluate(() => {
    const e = window.__ENGINE
    return {
      reduced: e.reduced ?? null,
      usd: e.uScrollDelta,
      bank: e.world.rotation.z,
      cursor: document.documentElement.classList.contains('has-cursor'),
      heroVisible: getComputedStyle(document.querySelector('#hero h1')).opacity,
    }
  })
  check('reduced: velocity couplings off', Math.abs(r.usd) < 1e-6, `uScrollDelta ${r.usd}`)
  check('reduced: no world banking', Math.abs(r.bank) < 1e-6, `rot.z ${r.bank}`)
  check('reduced: no cursor takeover', r.cursor === false)
  check('reduced: hero copy is visible immediately', Number(r.heroVisible) > 0.99)
  await page.screenshot({ path: `${out}/reduced-motion.png` })
  await ctx.close()
}

// ---- 2. no-WebGL fallback ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (typeof type === 'string' && type.startsWith('webgl')) return null
      return orig.call(this, type, ...rest)
    }
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1200)

  const r = await page.evaluate(() => {
    const html = document.documentElement
    const h1 = document.querySelector('#hero h1')
    const rect = h1.getBoundingClientRect()
    return {
      flagged: html.classList.contains('no-webgl'),
      overflow: getComputedStyle(document.body).overflow,
      rootPos: getComputedStyle(document.getElementById('scroll-root')).position,
      scrollable: document.documentElement.scrollHeight > innerHeight,
      canvasHidden: getComputedStyle(document.getElementById('world')).display,
      heroOpacity: Number(getComputedStyle(h1).opacity),
      heroOnScreen: rect.width > 100 && rect.height > 20 && rect.top < innerHeight,
    }
  })
  check('no-webgl: fallback flag set', r.flagged)
  check('no-webgl: native scrolling restored', r.overflow !== 'hidden' && r.rootPos === 'static', `overflow ${r.overflow}, root ${r.rootPos}`)
  check('no-webgl: document is scrollable', r.scrollable)
  check('no-webgl: canvas removed', r.canvasHidden === 'none')
  check('no-webgl: hero copy actually renders', r.heroOpacity > 0.99 && r.heroOnScreen, `opacity ${r.heroOpacity}`)
  await page.screenshot({ path: `${out}/no-webgl.png` })
  await ctx.close()
}

// ---- 3. copy is in the DOM (SEO / screen readers) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const text = await page.evaluate(() => document.body.innerText + ' ' + document.body.textContent)
  const must = [
    'AI automation for',
    'AI Voice Agents',
    'Why Parish Digital',
    'Built in',
    'joseph@parishdigital.ai',
    '(318) 780-8343',
    // canvas-rendered MSDF headlines must also exist as text
    'We build the machine that runs your business.',
    'Agents',
    'Automations',
    'Loops',
  ]
  const missing = must.filter((m) => !text.includes(m))
  check('copy present in DOM', missing.length === 0, missing.length ? `missing: ${missing.join(' | ')}` : `${must.length} strings`)

  const aria = await page.evaluate(() => document.getElementById('world')?.getAttribute('aria-hidden'))
  check('canvas is aria-hidden', aria === 'true')

  const rafs = await page.evaluate(() => window.__RIG?._f > 0)
  check('engine frame loop running', Boolean(rafs))
  await ctx.close()
}

await browser.close()
console.log(pass ? '\nALL PASS — robustness gates green.' : '\nFAILED')
process.exit(pass ? 0 : 1)
