import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const services = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: 'Website Design',
    description: 'Custom-built sites that convert visitors into customers. Fast, mobile-first, and designed to represent your brand at its best.',
    tags: ['Custom Design', 'SEO-Ready', 'Mobile-First'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>
      </svg>
    ),
    title: 'AI Voice Agents',
    description: 'Intelligent phone agents that answer calls, book appointments, and qualify leads 24/7 — so you never miss an opportunity.',
    tags: ['24/7 Coverage', 'Lead Capture', 'Appointment Booking'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    title: 'Workflow Automation',
    description: 'Eliminate repetitive tasks with AI-powered workflows. From follow-up sequences to data entry — we automate what slows you down.',
    tags: ['CRM Integration', 'Auto Follow-ups', 'Data Sync'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 4s-2.4 1.8-4 3C16.3 3.7 13.3 2 10 2a9 9 0 0 0 0 18c3.7 0 7-2 8.5-5"/>
        <path d="M22 4v4h-4"/>
      </svg>
    ),
    title: 'Social Media Management',
    description: 'Consistent, on-brand content across your channels. We plan, create, and schedule posts that keep your audience engaged.',
    tags: ['Content Strategy', 'Scheduling', 'Engagement'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
      </svg>
    ),
    title: 'Booking System Integration',
    description: 'Seamlessly connect scheduling tools to your website, CRM, and voice agents. Clients book themselves — you just show up.',
    tags: ['Calendar Sync', 'Automated Reminders', 'Payment Ready'],
  },
]

function ServiceCard({ service, index }: { service: typeof services[0], index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      style={{
        background: 'rgba(13,26,21,0.7)',
        border: '1px solid rgba(26,48,40,0.8)',
        borderRadius: 16,
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        cursor: 'default',
        transition: 'border-color 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(29,158,117,0.4)'
        el.style.background = 'rgba(13,26,21,0.95)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(26,48,40,0.8)'
        el.style.background = 'rgba(13,26,21,0.7)'
      }}
    >
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: 'radial-gradient(circle at top right, rgba(29,158,117,0.08), transparent 70%)',
      }} />

      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: 'rgba(29,158,117,0.12)',
        border: '1px solid rgba(29,158,117,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#5DCAA5',
        flexShrink: 0,
      }}>
        {service.icon}
      </div>

      <div>
        <h3 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 19, fontWeight: 700,
          color: '#e8f5f0', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          {service.title}
        </h3>
        <p style={{
          fontSize: 14, color: '#6a9e8a',
          lineHeight: 1.65, margin: 0,
        }}>
          {service.description}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {service.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 11, fontWeight: 600,
            color: '#1D9E75',
            background: 'rgba(29,158,117,0.08)',
            border: '1px solid rgba(29,158,117,0.15)',
            padding: '3px 10px', borderRadius: 100,
            letterSpacing: '0.02em',
          }}>
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

export default function Services() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="services" style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 64 }}
      >
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
          color: '#1D9E75', textTransform: 'uppercase',
          display: 'block', marginBottom: 16,
        }}>
          What We Build
        </span>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800, color: '#e8f5f0',
          margin: '0 0 20px', letterSpacing: '-1.2px',
          lineHeight: 1.1,
        }}>
          Everything your business needs<br />
          <span style={{ color: '#5DCAA5' }}>to run smarter</span>
        </h2>
        <p style={{
          fontSize: 17, color: '#6a9e8a', maxWidth: 520,
          margin: '0 auto', lineHeight: 1.65,
        }}>
          From your first impression online to your automated follow-up system — we handle the full stack of digital and AI tools.
        </p>
      </motion.div>

      <div className="services-grid">
        {services.map((service, i) => (
          <ServiceCard key={service.title} service={service} index={i} />
        ))}
      </div>
    </section>
  )
}
