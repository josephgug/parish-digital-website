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
function Band({ vh = 85 }: { vh?: number }) {
  return <div aria-hidden="true" style={{ height: `${vh}vh`, pointerEvents: 'none' }} />
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
          <Band vh={130} />
          <Services />
          <Band vh={120} />
          <WhyParish />
          <Band vh={120} />
          <About />
          <Band vh={120} />
          <Contact />
          <Band vh={100} />
          <Footer />
        </div>
      </div>
    </>
  )
}

export default App
