import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { SkillsMarquee } from '@/components/sections/SkillsMarquee'
import { ToolSection } from '@/components/sections/ToolSection'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { SampleReport } from '@/components/sections/SampleReport'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { useAuthSession } from '@/lib/session'

function App() {
  const { user, signOut } = useAuthSession()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      <Header
        user={user}
        onSignIn={() => setLoginOpen(true)}
        onSignOut={signOut}
      />
      <main>
        <Hero />
        <SkillsMarquee />
        <ToolSection />
        <HowItWorks />
        <SampleReport />
      </main>
      <Footer />
      <LoginPanel open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  )
}

export default App