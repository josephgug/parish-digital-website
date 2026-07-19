import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

export default function About() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const textRef = useRef(null)
  const textInView = useInView(textRef, { once: true, margin: '-60px' })

  return (
    <section id="about" style={{ padding: '120px 24px' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 64,
        alignItems: 'center',
      }}>
        {/* Visual panel */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative' }}
        >
          <div style={{
            background: 'rgba(10,20,17,0.6)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(26,48,40,0.8)',
            borderRadius: 20,
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Teal glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(29,158,117,0.15), transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Louisiana icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(15,110,86,0.3), rgba(29,158,117,0.15))',
              border: '1px solid rgba(29,158,117,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, fontSize: 28,
            }}>
              ⚜️
            </div>

            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 28, fontWeight: 800,
              color: '#e8f5f0', lineHeight: 1.2,
              marginBottom: 16, letterSpacing: '-0.5px',
            }}>
              Built in<br />
              <span style={{ color: '#5DCAA5' }}>Louisiana,</span><br />
              for Louisiana.
            </div>

            <p style={{
              fontSize: 14, color: '#5a8c7a',
              lineHeight: 1.65, margin: 0,
            }}>
              "Parish" isn't just a word — it's our identity. In Louisiana, a parish is the foundation of community. That's exactly how we approach our work.
            </p>

            {/* Divider */}
            <div style={{
              margin: '28px 0',
              height: 1,
              background: 'linear-gradient(90deg, rgba(29,158,117,0.3), transparent)',
            }} />

            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Parish', sub: 'Louisiana Roots' },
                { label: 'Digital', sub: 'AI-Powered Future' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 16, fontWeight: 700,
                    color: '#1D9E75', marginBottom: 2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#4a7a68' }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Text content */}
        <motion.div
          ref={textRef}
          initial={{ opacity: 0, x: 40 }}
          animate={textInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
            color: '#1D9E75', textTransform: 'uppercase',
            display: 'block', marginBottom: 16,
          }}>
            Our Story
          </span>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800, color: '#e8f5f0',
            margin: '0 0 24px', letterSpacing: '-0.8px',
            lineHeight: 1.15,
          }}>
            Small town feel.<br />
            <span style={{ color: '#5DCAA5' }}>Enterprise-grade results.</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 15.5, color: '#6a9e8a', lineHeight: 1.75, margin: 0 }}>
              Parish Digital was founded with a simple belief: local businesses in Louisiana deserve the same cutting-edge digital tools that big-city brands have — without the big-city price tag or the runaround.
            </p>
            <p style={{ fontSize: 15.5, color: '#6a9e8a', lineHeight: 1.75, margin: 0 }}>
              We work with gun ranges, med spas, restaurants, contractors, and service businesses across the Bossier City and Shreveport area. We know this market, and we know what works here.
            </p>
            <p style={{ fontSize: 15.5, color: '#6a9e8a', lineHeight: 1.75, margin: 0 }}>
              Our approach is straightforward: understand your business, build smart systems, and stay in your corner long after launch day.
            </p>
          </div>

          <div style={{
            marginTop: 36,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {['Bossier City, LA', 'Locally Owned', 'AI Specialists'].map(tag => (
              <span key={tag} style={{
                fontSize: 13, fontWeight: 600,
                color: '#5DCAA5',
                background: 'rgba(29,158,117,0.08)',
                border: '1px solid rgba(29,158,117,0.2)',
                padding: '6px 14px', borderRadius: 100,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
