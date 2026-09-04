import { LayoutDashboard, FileText, MessageCircle, UserRound } from 'lucide-react'
import { navigateToSection, type AppView } from '@/lib/navigate'
import type { AuthUser } from '@/lib/session'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  user: AuthUser | null
  view: AppView
  onNavigate: (view: AppView) => void
  /** Opens the sign-in modal — used when a signed-out tap hits a gated tab. */
  onSignIn: () => void
}

interface Tab {
  target: AppView
  label: string
  icon: typeof FileText
  /** Requires a signed-in user (Dashboard / Profile / Assistant). */
  gated?: boolean
}

const TABS: Tab[] = [
  { target: 'landing', label: 'Analyser', icon: FileText },
  { target: 'chat', label: 'Assistant', icon: MessageCircle, gated: true },
  { target: 'profile', label: 'Profile', icon: UserRound, gated: true },
  { target: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, gated: true },
]

/**
 * MobileNav — fixed bottom service switcher, shown only below the `md`
 * breakpoint. Header.tsx hides the desktop service links (Dashboard /
 * Profile / Assistant) behind `hidden … md:flex` with nothing standing in
 * for them below that width, so a mobile user otherwise has no way to move
 * between services once off the landing page. All four tabs are always
 * visible for discoverability; tapping a gated one while signed out opens
 * sign-in instead of navigating (same gate Header/ToolSection enforce
 * elsewhere — this bar doesn't bypass it, just surfaces the destination).
 */
export function MobileNav({ user, view, onNavigate, onSignIn }: MobileNavProps) {
  const handleTab = (tab: Tab) => {
    if (tab.gated && !user) {
      onSignIn()
      return
    }
    if (tab.target === 'landing') {
      navigateToSection('tool', view, onNavigate)
    } else {
      onNavigate(tab.target)
    }
  }

  return (
    <nav
      aria-label="Mobile"
      className="glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid h-16 grid-cols-4">
        {TABS.map((tab) => {
          const { target, label, icon: Icon } = tab
          const active = view === target
          return (
            <button
              key={target}
              type="button"
              onClick={() => handleTab(tab)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-accent' : 'text-ink-soft hover:text-ink'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
