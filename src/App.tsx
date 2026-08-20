import { useEffect, useState } from 'react'
import { Header, type AppView } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { ToolSection } from '@/components/sections/ToolSection'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { SampleReport } from '@/components/sections/SampleReport'
import { Dashboard } from '@/components/dashboard'
import { ProfileView } from '@/components/ProfileView'
import { ChatView } from '@/components/ChatView'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { useAuthSession } from '@/lib/session'

function App() {
  const { user, isRecovery, signOut } = useAuthSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [view, setView] = useState<AppView>('landing')

  // Todo 3.4 — signed-out users can never land on the dashboard, profile, or
  // chat views: any forced state (e.g. a stale link after sign-out) is
  // redirected to the landing view. The render guard below also prevents a
  // flash of a gated view with no user.
  useEffect(() => {
    if (!user && view !== 'landing') setView('landing')
  }, [user, view])

  return (
    <>
      <Header
        user={user}
        onSignIn={() => setLoginOpen(true)}
        onSignOut={signOut}
        view={view}
        onNavigate={setView}
      />
      <main>
        {view === 'dashboard' && user ? (
          <Dashboard userId={user.id} onNavigate={setView} />
        ) : view === 'profile' && user ? (
          <ProfileView userId={user.id} onNavigate={setView} />
        ) : view === 'chat' && user ? (
          <ChatView userId={user.id} onNavigate={setView} />
        ) : (
          <>
            <Hero />
            <ToolSection user={user} onSignIn={() => setLoginOpen(true)} />
            <HowItWorks />
            <SampleReport />
          </>
        )}
      </main>
      <Footer />
      <LoginPanel
        open={loginOpen}
        onOpenChange={setLoginOpen}
        isRecovery={isRecovery}
      />
    </>
  )
}

export default App
