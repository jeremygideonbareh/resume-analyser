import { motion, useReducedMotion } from 'motion/react'
import { FlippingWordSwap } from '@/components/ui/flipping-word-swap'
import { maskIdentifier, type AuthUser } from '@/lib/session'

interface HeaderProps {
  /** Signed-in user from useAuthSession(), or null when signed out. */
  user: AuthUser | null
  /** Opens the LoginPanel modal (signed-out affordance). */
  onSignIn: () => void
  /** Calls supabase signOut (signed-in affordance). */
  onSignOut: () => void
}

/**
 * Header — sticky ResumeLab masthead.
 * Logo mark: a small scorecard glyph (mono "RL" in a ruled box).
 * Right side: auth control (Sign in / masked id + Log out) + Analyse CTA.
 */
export function Header({ user, onSignIn, onSignOut }: HeaderProps) {
  const reduce = useReducedMotion()

  const masked = user
    ? maskIdentifier(user.email ?? user.phone ?? '')
    : ''

  return (
    <motion.header
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-ink/20 bg-surface font-mono text-sm font-medium text-ink"
          >
            RL
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            ResumeLab
          </span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          <a
            href="#tool"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Analyser
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span
                className="font-mono text-xs text-ink-soft"
                title="Signed in"
              >
                {masked}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
            >
              Sign in
            </button>
          )}
          <FlippingWordSwap
            word1="Analyse"
            word2="Score it"
            onClick={() =>
              document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
            toClassName="text-paper"
          />
        </div>
      </div>
    </motion.header>
  )
}