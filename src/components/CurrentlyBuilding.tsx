import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

/**
 * Copy v2 §7, Option A — live work described BY TYPE, no client names, so
 * nothing here needs a client's permission to publish. Upgrading to Option B
 * (named clients + logos) is a copy swap in this array, not a rebuild.
 */
const builds = [
  {
    type: 'Regional firearms range & retailer',
    work: 'New site, online booking for range time and concealed-carry classes, a firearms showcase, and automated social posting.',
  },
  {
    type: 'Med-spa & wellness clinic',
    work: 'Full rebuild plus an AI voice agent with live calendar integration for appointments, and back-office automations.',
  },
  {
    type: 'Law firm',
    work: 'Automated client intake, document handling and review, and a voice agent that answers and routes calls.',
  },
  {
    type: 'Residential home builders',
    work: 'Websites and 24/7 automated answering.',
  },
]

export default function CurrentlyBuilding() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section
      id="building"
      style={{
        padding: '120px 24px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
            color: '#1D9E75', textTransform: 'uppercase',
            display: 'block', marginBottom: 16,
          }}>
            Currently Building
          </span>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 800, color: '#e8f5f0',
            margin: 0, letterSpacing: '-1.2px', lineHeight: 1.1,
          }}>
            Work in progress right now.
          </h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {builds.map((b, i) => (
            <motion.div
              key={b.type}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 18,
                background: 'rgba(10,20,17,0.55)',
                border: '1px solid rgba(26,48,40,0.8)',
                borderRadius: 14,
                padding: '22px 24px',
              }}
            >
              {/* live indicator — the same pulse the hero badge uses */}
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#1D9E75',
                boxShadow: '0 0 8px #1D9E75',
                animation: 'pulse 2s infinite',
                flexShrink: 0, marginTop: 8,
              }} />
              <div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 700,
                  color: '#e8f5f0', marginBottom: 6,
                }}>
                  {b.type}
                </div>
                <div style={{ fontSize: 15, color: '#6a9e8a', lineHeight: 1.65 }}>
                  {b.work}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
