import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { ToolSection } from '@/components/sections/ToolSection'
import { HowItWorks } from '@/components/sections/HowItWorks'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ToolSection />
        <HowItWorks />
      </main>
      <Footer />
    </>
  )
}

export default App