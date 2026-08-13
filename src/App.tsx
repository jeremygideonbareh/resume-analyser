import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { SkillsMarquee } from '@/components/sections/SkillsMarquee'
import { ToolSection } from '@/components/sections/ToolSection'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { SampleReport } from '@/components/sections/SampleReport'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SkillsMarquee />
        <ToolSection />
        <HowItWorks />
        <SampleReport />
      </main>
      <Footer />
    </>
  )
}

export default App