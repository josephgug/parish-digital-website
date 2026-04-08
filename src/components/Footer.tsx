import { motion } from 'motion/react'

const socials = [
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    name: 'X / Twitter',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
]

const footerLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Us', href: '#why' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(26,48,40,0.7)',
      padding: '64px 24px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 48,
          marginBottom: 56,
        }}>
          {/* Brand column */}
          <div style={{ maxWidth: 340 }}>
            <div style={{ marginBottom: 16 }}>
              <img
                src="/parish-digital-logo-horizontal-dark.svg"
                alt="Parish Digital"
                style={{ height: 36, width: 'auto' }}
              />
            </div>
            <p style={{ fontSize: 14, color: '#4a7a68', lineHeight: 1.7, margin: '0 0 24px' }}>
              AI automation for businesses that don't have time to wait. Proudly serving Bossier City, Shreveport, and communities across Louisiana.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {socials.map(s => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  whileHover={{ scale: 1.1 }}
                  aria-label={s.name}
                  style={{
                    width: 38, height: 38, borderRadius: 9,
                    background: 'rgba(29,158,117,0.08)',
                    border: '1px solid rgba(29,158,117,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4a7a68', textDecoration: 'none',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#5DCAA5'
                    el.style.borderColor = 'rgba(93,202,165,0.4)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#4a7a68'
                    el.style.borderColor = 'rgba(29,158,117,0.15)'
                  }}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Nav links */}
          <div>
            <h4 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 700, color: '#e8f5f0',
              margin: '0 0 16px', letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {footerLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: 14, color: '#4a7a68', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a7a68')}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 700, color: '#e8f5f0',
              margin: '0 0 16px', letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Services
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Website Design', 'AI Voice Agents', 'Workflow Automation', 'Social Media', 'Booking Systems'].map(s => (
                <a
                  key={s}
                  href="#services"
                  style={{ fontSize: 14, color: '#4a7a68', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a7a68')}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: 28,
          borderTop: '1px solid rgba(26,48,40,0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#4a7a68' }}>
            © {new Date().getFullYear()} Parish Digital LLC. All rights reserved.
          </span>
          <a
            href="https://parishdigital.ai"
            style={{ fontSize: 13, color: '#4a7a68', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a7a68')}
          >
            parishdigital.ai
          </a>
        </div>
      </div>
    </footer>
  )
}
