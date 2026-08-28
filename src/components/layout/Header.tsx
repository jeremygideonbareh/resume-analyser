import { motion, useReducedMotion } from 'motion/react'
import { FlippingWordSwap } from '@/components/ui/flipping-word-swap'
import { maskIdentifier, type AuthUser } from '@/lib/session'

export type AppView = 'landing' | 'dashboard' | 'profile' | 'chat'

interface HeaderProps {
  /** Signed-in user from useAuthSession(), or null when signed out. */
  user: AuthUser | null
  /** Opens the LoginPanel modal (signed-out affordance). */
  onSignIn: () => void
  /** Calls supabase signOut (signed-in affordance). */
  onSignOut: () => void
  /** Active app view (Todo 3.4). Optional so existing consumers/tests stay valid. */
  view?: AppView
  /** Switches the app view (Todo 3.4). Optional for the same reason. */
  onNavigate?: (view: AppView) => void
}

/**
 * Header — sticky ResumeLab masthead.
 * Logo mark: a small scorecard glyph (mono "RL" in a ruled box).
 * Right side: auth control (Sign in / masked id + Log out), a signed-in
 * "Dashboard" link (next to the Analyse CTA, same pattern as Sign in), and
 * the Analyse CTA. Nav links + CTA scroll to landing sections — when the
 * dashboard view is active they switch back to `'landing'` first.
 */
export function Header({
  user,
  onSignIn,
  onSignOut,
  view = 'landing',
  onNavigate = () => {},
}: HeaderProps) {
  const reduce = useReducedMotion()

  const masked = user
    ? maskIdentifier(user.email ?? user.phone ?? '')
    : ''

  /**
   * Scroll to a landing-page section. If the dashboard view is active the
   * target doesn't exist yet — navigate to 'landing' first, then scroll on
   * the next frame once the landing sections have mounted.
   */
  const goToSection = (id: string) => {
    if (view !== 'landing') {
      onNavigate('landing')
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.header
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-hairline bg-surface/85 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            if (view !== 'landing') {
              e.preventDefault()
              goToSection('top')
            }
          }}
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface font-mono text-sm font-medium text-ink"
          >
            RL
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">
            ResumeLab
          </span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          <a
            href="#tool"
            onClick={(e) => {
              e.preventDefault()
              goToSection('tool')
            }}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Analyser
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault()
              goToSection('how-it-works')
            }}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            How it works
          </a>
        </nav>
        {/* Every one of these used to be a bordered button — four outlined
            boxes plus a filled CTA, all shouting equally, so nothing read as
            the action. Navigation is text; exactly one thing is a button. */}
        <div className="flex items-center gap-5">
          {user && (
            <div className="hidden items-center gap-5 md:flex">
              {(
                [
                  ['dashboard', 'Dashboard'],
                  ['profile', 'Profile'],
                  ['chat', 'Assistant'],
                ] as const
              ).map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => onNavigate(target)}
                  aria-current={view === target ? 'page' : undefined}
                  className={
                    view === target
                      ? 'text-sm font-medium text-ink'
                      : 'text-sm font-medium text-ink-soft transition-colors hover:text-ink'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span
                className="hidden font-mono text-xs text-muted sm:inline"
                title="Signed in"
              >
                {masked}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Sign in
            </button>
          )}

          {/* Utility radius (8px), not the marketing pill — the nav CTA sits
              in chrome, and the size contrast is deliberate. */}
          <FlippingWordSwap
            word1="Analyse"
            word2="Score it"
            onClick={() => goToSection('tool')}
            className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
            toClassName="text-surface"
          />
        </div>
      </div>
    </motion.header>
  )
}
