import { useEffect, useRef } from 'react'
import type { EngineHandle } from '../engine/createEngine'
import { WAYPOINTS } from '../engine/waypoints'
import { setEngine, setUiState } from '../engine/store'

/**
 * The one WebGL2 canvas. Mounted client-side, owns the single master rAF,
 * and drives the DOM content layer's transform from the same scroll value.
 */
export default function World({ contentId = 'scroll-content' }: { contentId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // no-WebGL fallback: styled DOM version, same content
    const gl = canvas.getContext('webgl2')
    if (!gl) {
      document.documentElement.classList.add('no-webgl')
      setUiState({ webgl: false, ready: true })
      return
    }

    let handle: EngineHandle | null = null
    let alive = true
    const cleanups: Array<() => void> = []

    ;(async () => {
      const { createEngine } = await import('../engine/createEngine')
      const content = document.getElementById(contentId)
      const h = await createEngine(canvas, content)
      if (!alive) {
        h.destroy()
        return
      }
      handle = h
      setEngine(h.engine)
      setUiState({ ready: true })

      // content height changes with fonts / images / responsive reflow
      const ro = new ResizeObserver(() => h.engine.measureContent())
      if (content) ro.observe(content)
      cleanups.push(() => ro.disconnect())
      document.fonts?.ready.then(() => h.engine.measureContent())

      // anchor links drive the virtual scroll, never the browser's
      const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as
          | HTMLAnchorElement
          | null
        if (!a) return
        const id = a.getAttribute('href')!.slice(1)
        e.preventDefault()
        const el = id ? document.getElementById(id) : null
        if (!id) h.engine.scrollTo(0)
        else if (el && content) {
          const top = el.getBoundingClientRect().top - content.getBoundingClientRect().top
          h.engine.scrollTo(Math.max(0, top - 72))
        }
        if (id) history.replaceState(null, '', `#${id}`)
      }
      document.addEventListener('click', onClick)
      cleanups.push(() => document.removeEventListener('click', onClick))

      // discrete UI state only — the numbers stay off React's critical path
      let lastActive = ''
      let lastScrolled = false
      let lastBurst = false
      const off = h.engine.onFrame((ctx) => {
        let active = WAYPOINTS[0].id
        for (const wp of WAYPOINTS) if (ctx.progress >= wp.at - 0.02) active = wp.id
        const scrolled = ctx.scroll.pixels > 40
        const burst = h.engine.burstAmount > 0.14
        if (active !== lastActive || scrolled !== lastScrolled || burst !== lastBurst) {
          lastActive = active
          lastScrolled = scrolled
          lastBurst = burst
          setUiState({ active, scrolled, burst })
          document.documentElement.classList.toggle('nav-burst', burst)
        }
      })
      cleanups.push(off)
    })()

    return () => {
      alive = false
      cleanups.forEach((c) => c())
      setEngine(null)
      handle?.destroy()
    }
  }, [contentId])

  return <canvas ref={canvasRef} id="world" aria-hidden="true" />
}
