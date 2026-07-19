import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getEngine, useUiState } from '../engine/store'
import { HAS_WEBGL } from '../engine/caps'

const links = [
  { label: 'Services', href: '#services' },
  { label: 'Why Us', href: '#why' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  // window.scrollY is always 0 here — the virtual scroll owns position.
  const { scrolled, active } = useUiState()
  const [open, setOpen] = useState(false)

  // Block the virtual scroll while the mobile menu is open
  useEffect(() => {
    getEngine()?.setBlocked(open)
    return () => getEngine()?.setBlocked(false)
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <motion.header
        id="site-header"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: HAS_WEBGL ? 2.2 : 0, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s, box-shadow 0.4s',
          background: scrolled || open ? 'rgba(8,15,13,0.97)' : 'transparent',
          backdropFilter: scrolled || open ? 'blur(12px)' : 'none',
          borderBottom: scrolled && !open ? '1px solid rgba(29,158,117,0.15)' : '1px solid transparent',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
            {/* Logo */}
            <a href="#" onClick={close} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', zIndex: 60, position: 'relative' }}>
              <img
                src="/parish-digital-logo-horizontal-dark.svg"
                alt="Parish Digital"
                style={{ width: 200, height: 'auto' }}
              />
            </a>

            {/* Desktop nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hide-mobile">
              {links.map(l => {
                const isActive = active === l.href.slice(1)
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    aria-current={isActive ? 'true' : undefined}
                    style={{
                      color: isActive ? '#5DCAA5' : '#9ac9b8',
                      fontSize: 14, fontWeight: 500, textDecoration: 'none',
                      padding: '6px 14px', borderRadius: 8,
                      transition: 'color 0.25s, background 0.25s',
                      background: isActive ? 'rgba(29,158,117,0.10)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
                    onMouseLeave={e => (e.currentTarget.style.color = isActive ? '#5DCAA5' : '#9ac9b8')}
                  >
                    {l.label}
                  </a>
                )
              })}
              <a
                href="#contact"
                data-magnetic
                style={{
                  marginLeft: 8,
                  background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', padding: '8px 20px',
                  borderRadius: 8, transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Get Started
              </a>
            </nav>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setOpen(o => !o)}
              className="show-mobile"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#e8f5f0', padding: 8, position: 'relative', zIndex: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {/* Animated bars → X */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <motion.line
                  x1="3" y1="6" x2="21" y2="6"
                  animate={open ? { y1: 12, y2: 12, rotate: 45, originX: '12px', originY: '12px' } : { y1: 6, y2: 6, rotate: 0 }}
                  transition={{ duration: 0.25 }}
                />
                <motion.line
                  x1="3" y1="12" x2="21" y2="12"
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
                <motion.line
                  x1="3" y1="18" x2="21" y2="18"
                  animate={open ? { y1: 12, y2: 12, rotate: -45, originX: '12px', originY: '12px' } : { y1: 18, y2: 18, rotate: 0 }}
                  transition={{ duration: 0.25 }}
                />
              </svg>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Full-screen mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: '#080f0d',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '0 40px',
              overflow: 'hidden',
            }}
          >
            {/* Subtle teal glow */}
            <div style={{
              position: 'absolute', top: '-20%', right: '-10%',
              width: 400, height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(15,110,86,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Nav links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 'clamp(32px, 10vw, 48px)',
                    fontWeight: 800,
                    color: '#5DCAA5',
                    textDecoration: 'none',
                    letterSpacing: '-1px',
                    lineHeight: 1.2,
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(29,158,117,0.12)',
                    display: 'block',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#5DCAA5')}
                >
                  {l.label}
                </motion.a>
              ))}

              <motion.a
                href="#contact"
                onClick={close}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.33, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  marginTop: 32,
                  background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                  color: '#fff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 17, fontWeight: 700,
                  textDecoration: 'none',
                  padding: '16px 32px',
                  borderRadius: 12,
                  textAlign: 'center',
                  display: 'block',
                  boxShadow: '0 0 32px rgba(29,158,117,0.3)',
                }}
              >
                Get Started →
              </motion.a>
            </nav>

            {/* Bottom contact info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <a href="mailto:joseph@parishdigital.ai" style={{ fontSize: 13, color: '#4a7a68', textDecoration: 'none' }}>
                joseph@parishdigital.ai
              </a>
              <a href="tel:+13187808343" style={{ fontSize: 13, color: '#4a7a68', textDecoration: 'none' }}>
                (318) 780-8343
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-mobile { display: flex !important; }
        .show-mobile { display: flex !important; }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}
