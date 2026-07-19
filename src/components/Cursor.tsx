import { useEffect, useRef } from 'react'
import { getEngine } from '../engine/store'

const MAG_RADIUS = 110
const MAG_PULL = 0.32

/**
 * Custom cursor + magnetic CTAs. Both ride the engine's frame callback — no
 * second rAF, no observers per element. Skipped entirely for touch/coarse
 * pointers and under prefers-reduced-motion (no cursor takeover).
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine =
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(hover: hover)').matches &&
      navigator.maxTouchPoints === 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    document.documentElement.classList.add('has-cursor')

    const mouse = { x: innerWidth / 2, y: innerHeight / 2 }
    const eased = { x: mouse.x, y: mouse.y }
    let hot = 0
    let hotTarget = 0

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      const el = (e.target as HTMLElement | null)?.closest?.(
        'a, button, input, textarea, [data-magnetic]',
      )
      hotTarget = el ? 1 : 0
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let stop: (() => void) | undefined
    let raf = 0
    const attach = () => {
      const engine = getEngine()
      if (!engine) {
        raf = requestAnimationFrame(attach)
        return
      }
      stop = engine.onFrame(() => {
        eased.x += (mouse.x - eased.x) * 0.22
        eased.y += (mouse.y - eased.y) * 0.22
        hot += (hotTarget - hot) * 0.12

        if (dot.current) dot.current.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`
        if (ring.current) {
          const s = 1 + hot * 0.9
          ring.current.style.transform = `translate3d(${eased.x}px,${eased.y}px,0) scale(${s.toFixed(3)})`
          ring.current.style.opacity = String(0.5 + hot * 0.45)
        }

        // magnetic pull on CTAs
        const targets = document.querySelectorAll<HTMLElement>('[data-magnetic]')
        for (const el of targets) {
          const r = el.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const dx = mouse.x - cx
          const dy = mouse.y - cy
          const d = Math.hypot(dx, dy)
          const k = d < MAG_RADIUS ? 1 - d / MAG_RADIUS : 0
          const px = dx * k * MAG_PULL
          const py = dy * k * MAG_PULL
          const prev = el.dataset.mx ? Number(el.dataset.mx) : 0
          const prevY = el.dataset.my ? Number(el.dataset.my) : 0
          const nx = prev + (px - prev) * 0.2
          const ny = prevY + (py - prevY) * 0.2
          el.dataset.mx = String(nx)
          el.dataset.my = String(ny)
          el.style.transform =
            Math.abs(nx) < 0.05 && Math.abs(ny) < 0.05
              ? ''
              : `translate3d(${nx.toFixed(2)}px,${ny.toFixed(2)}px,0)`
        }
      })
    }
    attach()

    return () => {
      cancelAnimationFrame(raf)
      stop?.()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
