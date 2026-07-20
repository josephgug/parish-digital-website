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
    'AI that runs your business',
    'AI Voice Agents',
    'Why Parish',
    'Built in',
    'Currently Building',
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

// ---- custom cursor ------------------------------------------------------
// Hiding the OS cursor is only acceptable while the replacement is provably
// under the pointer. It once was not: `margin:-50%` on a fixed element
// resolves against the containing block's WIDTH on BOTH axes, so the dot sat
// ~720px above the pointer, off-screen, and the page had no visible pointer
// at all. Nothing caught it, so it is checked here.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(3500)

  let worst = 0
  for (const [x, y] of [[720, 450], [40, 40], [1400, 860], [200, 700], [1100, 120]]) {
    await page.mouse.move(x, y)
    await page.waitForTimeout(120)
    const c = await page.evaluate(() => {
      const r = document.querySelector('.cursor-dot')?.getBoundingClientRect()
      return r ? [r.left + r.width / 2, r.top + r.height / 2] : null
    })
    if (!c) { worst = Infinity; break }
    worst = Math.max(worst, Math.hypot(c[0] - x, c[1] - y))
  }
  check('cursor dot tracks the pointer exactly', worst < 1, `worst offset ${worst.toFixed(2)}px over 5 positions`)

  const st = await page.evaluate(() => {
    const d = document.querySelector('.cursor-dot')
    const cs = d && getComputedStyle(d)
    const hidden = getComputedStyle(document.documentElement).cursor === 'none'
    return cs ? { display: cs.display, vis: cs.visibility, op: +cs.opacity, pe: cs.pointerEvents, z: +cs.zIndex, hidden } : null
  })
  check('cursor dot is actually visible', Boolean(st) && st.display !== 'none' && st.vis === 'visible' && st.op === 1,
    st ? `display:${st.display} opacity:${st.op}` : 'no .cursor-dot')
  check('cursor never eats clicks', Boolean(st) && st.pe === 'none' && st.z >= 90, st ? `pointer-events:${st.pe} z:${st.z}` : '—')
  // the whole point: if the OS cursor is hidden, a tracking replacement exists
  check('native cursor only hidden when replaced', !st?.hidden || worst < 1, `cursor:none=${st?.hidden}`)

  // clicks must still reach real targets across the page
  for (const [label, sel] of [['nav Services', 'a[href="#services"]'], ['nav Contact', 'a[href="#contact"]']]) {
    const el = page.locator(sel).first()
    const before = await page.evaluate(() => window.__ENGINE?.scroll.target ?? 0)
    await el.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1200)
    const after = await page.evaluate(() => window.__ENGINE?.scroll.target ?? 0)
    check(`click reaches ${label}`, Math.abs(after - before) > 1, `scroll ${before.toFixed(0)} -> ${after.toFixed(0)}`)
  }
  const input = page.locator('input, textarea').first()
  await input.click({ timeout: 5000 }).catch(() => {})
  check('click reaches form field', await page.evaluate(() => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)))
  await ctx.close()
}

// ---- mobile copy containment -------------------------------------------
// The DOM layer lives in a fixed overflow:hidden shell, so copy wider than the
// screen is clipped rather than scrollable — invisible to a desktop resize.
for (const w of [320, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(3500)
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  check(`${w}px: no horizontal overflow`, sw <= w, `scrollWidth ${sw} vs ${w}`)

  // MSDF headlines are billboarded in the canvas — portrait aspect makes the
  // visible world much narrower, so they must be fitted, not authored fixed.
  const head = await page.evaluate(() => {
    const e = window.__ENGINE
    if (!e) return null
    const halfH = 13 * Math.tan((30 * Math.PI) / 360)
    const usable = halfH * (innerWidth / innerHeight) * 2
    let over = 0
    e.world.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.aBounds) return
      const bs = o.geometry.attributes.aBounds.array
      let mn = Infinity, mx = -Infinity
      for (let i = 0; i < bs.length; i += 4) { mn = Math.min(mn, bs[i]); mx = Math.max(mx, bs[i + 2]) }
      over = Math.max(over, (mx - mn) * o.parent.scale.x - usable)
    })
    return { usable: +usable.toFixed(2), over: +over.toFixed(2) }
  })
  check(`${w}px: MSDF headlines fit portrait`, head && head.over <= 0,
    head ? `widest exceeds viewport by ${head.over} world units (usable ${head.usable})` : 'no engine')
  await ctx.close()
}

await browser.close()
console.log(pass ? '\nALL PASS — robustness gates green.' : '\nFAILED')
process.exit(pass ? 0 : 1)
