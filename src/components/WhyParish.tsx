import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const pillars = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2v6.5L4.2 17A2 2 0 0 0 6 20h12a2 2 0 0 0 1.8-3L15 8.5V2"/>
        <path d="M8 2h8M7.5 14h9"/>
      </svg>
    ),
    headline: 'We run it before we sell it.',
    body: 'Every automation, agent, and site we offer is already running inside my own companies — including Mudderswag, a business I built and operate profitably. If it doesn\'t work for me, it never reaches you. You\'re not a test case.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
        <path d="M8 7h6M8 11h4"/>
        <circle cx="16.5" cy="14.5" r="3.5"/><path d="M19 17l2.5 2.5"/>
      </svg>
    ),
    headline: 'I learn your business before I touch it.',
    body: 'I spent years as a commercial-bank VP dissecting companies\' financials, tax returns, and operations — from corner stores to $100M+ corporate deals — to decide what to fund. I bring that same analysis to yours. No proposal until I understand exactly how you make money.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="3 17 9 11 13 15 21 7"/>
        <polyline points="15 7 21 7 21 13"/>
      </svg>
    ),
    headline: 'Every build answers one question: Will this make you money?',
    body: 'Most providers sell features. My background is finance and sales, so I build for return — more booked jobs, captured leads, and recovered hours — and I\'ll show you the math before you spend a dollar.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.7 5.5 9.4 2.6A1.6 1.6 0 0 0 7.6 1.8L4.4 3A1.8 1.8 0 0 0 3.4 5c.7 4 2.7 7.6 5.6 10.4"/>
        <path d="M12.6 17.4c2.1 1.5 4.5 2.5 7 3a1.8 1.8 0 0 0 2-1l1.2-3.2a1.6 1.6 0 0 0-.8-1.8l-2.9-1.3a1.6 1.6 0 0 0-1.8.4l-1.2 1.4"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>
    ),
    headline: 'The opposite of the cold-call crowd.',
    body: 'You\'ve met the Instagram-reel "AI agencies" cold-calling with generic, prebuilt automations they can\'t explain or adjust. This is the opposite: custom-built, fully understood, and tuned to your business long after launch.',
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
            Why Parish
          </span>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800, color: '#e8f5f0',
            margin: '0 0 20px', letterSpacing: '-1.2px',
            lineHeight: 1.1,
          }}>
            Anyone can resell AI. Almost no one understands your business first.
          </h2>
          <p style={{
            fontSize: 17, color: '#6a9e8a', maxWidth: 500,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            An operator who reads your numbers first — not another reseller. That's the whole company.
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
