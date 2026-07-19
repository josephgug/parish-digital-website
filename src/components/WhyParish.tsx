import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const pillars = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    headline: 'We\'re Local',
    body: 'Based in Bossier City, we understand Louisiana businesses — the culture, the market, and what actually drives results here. When you need us, we\'re nearby.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    headline: 'AI-First by Default',
    body: 'We don\'t bolt AI onto existing workflows as an afterthought. Every system we build is designed with automation at its core from day one.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    headline: 'Results-Focused',
    body: 'We measure success in leads, bookings, and revenue — not vanity metrics. If it doesn\'t move your business forward, we don\'t build it.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    headline: 'A Firm, Not a Freelancer',
    body: 'You get a dedicated team with a defined process — not a solo contractor juggling fifteen clients. We operate like a firm because that\'s what your business deserves.',
  },
]

function PillarCard({ pillar, index }: { pillar: typeof pillars[0], index: number }) {
  const cardRef = useRef(null)
  const cardInView = useInView(cardRef, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={cardInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`pillar-cell pillar-${index}`}
      style={{
        padding: '40px 36px',
        background: 'rgba(10,20,17,0.45)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRight: index % 2 === 0 ? '1px solid rgba(26,48,40,0.6)' : 'none',
        borderBottom: index < 2 ? '1px solid rgba(26,48,40,0.6)' : 'none',
        transition: 'background 0.3s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,20,17,0.72)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,20,17,0.45)')}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(15,110,86,0.15)',
        border: '1px solid rgba(15,110,86,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#5DCAA5', marginBottom: 20,
      }}>
        {pillar.icon}
      </div>
      <h3 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 20, fontWeight: 700,
        color: '#e8f5f0', margin: '0 0 12px',
        letterSpacing: '-0.3px',
      }}>
        {pillar.headline}
      </h3>
      <p style={{
        fontSize: 14.5, color: '#6a9e8a',
        lineHeight: 1.7, margin: 0,
      }}>
        {pillar.body}
      </p>
    </motion.div>
  )
}

export default function WhyParish() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      id="why"
      style={{
        padding: '120px 24px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,110,86,0.04) 50%, transparent 100%)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 72 }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
            color: '#1D9E75', textTransform: 'uppercase',
            display: 'block', marginBottom: 16,
          }}>
            The Difference
          </span>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800, color: '#e8f5f0',
            margin: '0 0 20px', letterSpacing: '-1.2px',
            lineHeight: 1.1,
          }}>
            Why Parish Digital
          </h2>
          <p style={{
            fontSize: 17, color: '#6a9e8a', maxWidth: 500,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            There are a lot of agencies. Here's why local businesses choose us.
          </p>
        </motion.div>

        <div className="why-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          border: '1px solid rgba(26,48,40,0.6)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          {pillars.map((p, i) => (
            <PillarCard key={p.headline} pillar={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
