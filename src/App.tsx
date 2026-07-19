import World from './components/World'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import WhyParish from './components/WhyParish'
import About from './components/About'
import Contact from './components/Contact'
import Footer from './components/Footer'

/**
 * Bands of open world between content blocks. This is where the camera does
 * its work — without runway the fly-through has nowhere to travel and the
 * sections read as a stack of cards over a busy background.
 */
function Band({ vh = 85, label }: { vh?: number; label?: string }) {
  return (
    <div style={{ height: `${vh}vh`, pointerEvents: 'none' }}>
      {/* The band's display type is rendered as MSDF in the canvas; this keeps
          the same words in the document for search engines and screen readers. */}
      {label && <p className="sr-only">{label}</p>}
    </div>
  )
}

/**
 * Architecture: the WebGL world is the spine. <body> never scrolls — the
 * VirtualScroll accumulator drives both the camera and this DOM layer's
 * transform, so copy stays in the document for SEO/a11y while the canvas
 * behind it carries the motion.
 */
function App() {
  return (
    <>
      <World />
      <Navbar />
      <div id="scroll-root">
        <div id="scroll-content">
          <Hero />
          <Band vh={130} label="We build the machine that runs your business." />
          <Services />
          <Band vh={120} label="Agents" />
          <WhyParish />
          <Band vh={120} label="Automations" />
          <About />
          <Band vh={120} label="Loops" />
          <Contact />
          <Band vh={100} />
          <Footer />
        </div>
      </div>
    </>
  )
}

export default App
