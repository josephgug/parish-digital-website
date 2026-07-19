import { motion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
})

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 72,
      }}
    >
      {/* No DOM orbs / grid here — the WebGL mesh behind the canvas IS the background. */}

      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Badge */}
        <motion.div {...fadeUp(0)} style={{ marginBottom: 32 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(29,158,117,0.1)',
            border: '1px solid rgba(29,158,117,0.3)',
            borderRadius: 100, padding: '6px 16px',
            fontSize: 13, fontWeight: 600, color: '#5DCAA5',
            letterSpacing: '0.05em',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#1D9E75',
              boxShadow: '0 0 8px #1D9E75',
              animation: 'pulse 2s infinite',
            }} />
            Bossier City, Louisiana
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fadeUp(0.1)} style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(38px, 7vw, 80px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: 'clamp(-1px, -0.025em, -2px)',
          color: '#e8f5f0',
          margin: '0 0 28px',
        }}>
          AI automation for<br />
          <span style={{
            background: 'linear-gradient(135deg, #5DCAA5 0%, #1D9E75 50%, #0F6E56 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            businesses that don't
          </span>
          <br />have time to wait.
        </motion.h1>

        {/* Subtext */}
        <motion.p {...fadeUp(0.2)} style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: '#7ab5a0',
          lineHeight: 1.7,
          maxWidth: 600,
          margin: '0 auto 48px',
          fontWeight: 400,
        }}>
          Your business, amplified.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.3)} style={{
          display: 'flex', gap: 16, justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              textDecoration: 'none', padding: '14px 32px',
              borderRadius: 10,
              boxShadow: '0 0 32px rgba(29,158,117,0.35)',
              display: 'inline-block',
            }}
          >
            Start Your Project →
          </motion.a>
          <motion.a
            href="#services"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'rgba(29,158,117,0.08)',
              border: '1px solid rgba(29,158,117,0.3)',
              color: '#5DCAA5', fontWeight: 600, fontSize: 15,
              textDecoration: 'none', padding: '14px 32px',
              borderRadius: 10,
              display: 'inline-block',
            }}
          >
            See Our Services
          </motion.a>
        </motion.div>

        {/* Social proof strip */}
        <motion.div {...fadeUp(0.4)} style={{
          marginTop: 72,
          display: 'flex', gap: 48, justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {[
            { value: 'Local', label: 'Louisiana-Based' },
            { value: 'AI-First', label: 'Every Solution' },
            { value: '24/7', label: 'Voice Agents' },
            { value: 'Real', label: 'Results, Not Fluff' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 22, fontWeight: 800,
                color: '#5DCAA5', lineHeight: 1,
                marginBottom: 4,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#5a8c7a', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: 36, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(93,202,165,0.4)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </motion.div>

    </section>
  )
}
