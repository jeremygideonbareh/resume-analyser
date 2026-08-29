import { useEffect, useState } from 'react'
import { Header, type AppView } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { ParseSection } from '@/components/sections/ParseSection'
import { ResolutionBand } from '@/components/sections/ResolutionBand'
import { VerdictSection } from '@/components/sections/VerdictSection'
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
      {/* The landing page has no sticky masthead: the hero carries its own
          transparent nav over the video, and stacking the solid Header above
          it produced two navigation bars on top of each other. The Header
          still serves every other view, which has no hero to host it. */}
      {view !== 'landing' && (
        <Header
          user={user}
          onSignIn={() => setLoginOpen(true)}
          onSignOut={signOut}
          view={view}
          onNavigate={setView}
        />
      )}
      <main>
        {view === 'dashboard' && user ? (
          <Dashboard userId={user.id} onNavigate={setView} />
        ) : view === 'profile' && user ? (
          <ProfileView userId={user.id} onNavigate={setView} />
        ) : view === 'chat' && user ? (
          <ChatView userId={user.id} onNavigate={setView} />
        ) : (
          // One argument, in order: here is your document → here is what the
          // machine turns it into → here is what that costs you → here is how
          // it's fixed → here is what you get back → now hand it over.
          //
          // The tool used to sit second, which asked for the upload before
          // anything had earned it. It sits last now, with the hero CTA
          // anchored straight to it so an impatient visitor still skips
          // directly to the product.
          <>
            <Hero
              user={user}
              onSignIn={() => setLoginOpen(true)}
              onSignOut={signOut}
              onNavigate={setView}
            />
            <ParseSection />
            <ResolutionBand />
            <VerdictSection />
            <HowItWorks />
            <SampleReport />
            <ToolSection user={user} onSignIn={() => setLoginOpen(true)} />
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
