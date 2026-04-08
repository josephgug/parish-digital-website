import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import WhyParish from './components/WhyParish'
import About from './components/About'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div style={{ background: '#080f0d', minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <Services />
      <WhyParish />
      <About />
      <Contact />
      <Footer />
    </div>
  )
}

export default App
