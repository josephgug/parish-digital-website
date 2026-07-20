import { motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'

const inputStyle = {
  width: '100%',
  background: 'rgba(8,15,13,0.62)',
  border: '1px solid rgba(26,48,40,0.9)',
  borderRadius: 10,
  padding: '12px 16px',
  color: '#e8f5f0',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box' as const,
}

export default function Contact() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [focused, setFocused] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    // Simulate send
    await new Promise(r => setTimeout(r, 1200))
    setStatus('sent')
  }

  return (
    <section id="contact" style={{
      padding: '120px 24px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(15,110,86,0.04) 50%, transparent 100%)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
            Let's Talk
          </span>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800, color: '#e8f5f0',
            margin: '0 0 20px', letterSpacing: '-1.2px', lineHeight: 1.1,
          }}>
            Ready to grow your business?
          </h2>
          <p style={{ fontSize: 17, color: '#6a9e8a', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Tell us about your business and what you're trying to solve. We'll follow up within one business day.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
          gap: 40,
          alignItems: 'start',
        }}>
          {/* Contact info panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              background: 'rgba(10,20,17,0.6)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(26,48,40,0.8)',
              borderRadius: 16, padding: '40px 32px',
            }}
          >
            <h3 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 20, fontWeight: 700,
              color: '#e8f5f0', margin: '0 0 28px',
            }}>
              Contact Information
            </h3>

            {[
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                label: 'Email',
                value: 'joseph@parishdigital.ai',
                href: 'mailto:joseph@parishdigital.ai',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                label: 'Phone',
                value: '(318) 780-8343',
                href: 'tel:+13187808343',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                label: 'Location',
                value: 'Bossier City, Louisiana',
                href: null,
              },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                marginBottom: 24,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(29,158,117,0.1)',
                  border: '1px solid rgba(29,158,117,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#5DCAA5', flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#4a7a68', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  {item.href ? (
                    <a href={item.href} style={{
                      fontSize: 14, color: '#9ac9b8', textDecoration: 'none',
                      fontWeight: 500,
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ac9b8')}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span style={{ fontSize: 14, color: '#9ac9b8', fontWeight: 500 }}>{item.value}</span>
                  )}
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 32, paddingTop: 28,
              borderTop: '1px solid rgba(26,48,40,0.8)',
            }}>
              <div style={{ fontSize: 13, color: '#4a7a68', marginBottom: 12 }}>Response time</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 14, color: '#5DCAA5', fontWeight: 600,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#1D9E75',
                  boxShadow: '0 0 8px #1D9E75',
                  display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }} />
                Within 1 business day
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              background: 'rgba(10,20,17,0.6)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(26,48,40,0.8)',
              borderRadius: 16, padding: '40px 32px',
            }}
          >
            {status === 'sent' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '40px 0' }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(29,158,117,0.15)',
                  border: '2px solid #1D9E75',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: '#5DCAA5',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(19px, 5vw, 22px)', fontWeight: 700, color: '#e8f5f0', marginBottom: 12,
                }}>
                  Message received!
                </h3>
                <p style={{ fontSize: 14, color: '#6a9e8a', lineHeight: 1.65 }}>
                  We'll be in touch within one business day. Looking forward to learning more about your business.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { key: 'name', label: 'Your Name', type: 'text', placeholder: 'John Smith', required: true },
                    { key: 'email', label: 'Email Address', type: 'email', placeholder: 'john@business.com', required: true },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a7a68', marginBottom: 6, letterSpacing: '0.04em' }}>
                        {field.label} {field.required && <span style={{ color: '#1D9E75' }}>*</span>}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.required}
                        value={form[field.key as keyof typeof form]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        onFocus={() => setFocused(field.key)}
                        onBlur={() => setFocused(null)}
                        style={{
                          ...inputStyle,
                          borderColor: focused === field.key ? 'rgba(29,158,117,0.5)' : 'rgba(26,48,40,0.9)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {[
                  { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(318) 555-0000', required: false },
                  { key: 'business', label: 'Business Name', type: 'text', placeholder: 'Your Business Name', required: false },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a7a68', marginBottom: 6, letterSpacing: '0.04em' }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      onFocus={() => setFocused(field.key)}
                      onBlur={() => setFocused(null)}
                      style={{
                        ...inputStyle,
                        borderColor: focused === field.key ? 'rgba(29,158,117,0.5)' : 'rgba(26,48,40,0.9)',
                      }}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a7a68', marginBottom: 6, letterSpacing: '0.04em' }}>
                    Tell us about your project <span style={{ color: '#1D9E75' }}>*</span>
                  </label>
                  <textarea
                    placeholder="What are you trying to build or improve? Any specific services you're interested in?"
                    required
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    onFocus={() => setFocused('message')}
                    onBlur={() => setFocused(null)}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 100,
                      borderColor: focused === 'message' ? 'rgba(29,158,117,0.5)' : 'rgba(26,48,40,0.9)',
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  data-magnetic
                  disabled={status === 'sending'}
                  whileHover={status !== 'sending' ? { scale: 1.02 } : {}}
                  whileTap={status !== 'sending' ? { scale: 0.98 } : {}}
                  style={{
                    background: status === 'sending'
                      ? 'rgba(29,158,117,0.4)'
                      : 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                    border: 'none',
                    borderRadius: 10, padding: '14px 28px',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                    cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'background 0.25s, box-shadow 0.25s',
                    boxShadow: '0 0 24px rgba(29,158,117,0.25)',
                  }}
                  onMouseEnter={e => {
                    if (status === 'sending') return
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#1D9E75'
                    el.style.boxShadow = '0 0 36px rgba(29,158,117,0.5)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'linear-gradient(135deg, #1D9E75, #0F6E56)'
                    el.style.boxShadow = '0 0 24px rgba(29,158,117,0.25)'
                  }}
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message →'}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

    </section>
  )
}
