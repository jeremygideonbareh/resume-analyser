/** Which top-level view of the app is currently mounted. */
export type AppView = 'landing' | 'dashboard' | 'profile' | 'chat'

/**
 * Scroll to a landing-page section (`#tool`, `#how-it-works`, `#top`, …).
 * If a non-landing view is active, the target doesn't exist in the DOM yet —
 * navigate to 'landing' first, then scroll on the next frame once the
 * landing sections have mounted. Shared by Header and MobileNav so both
 * "Analyser" entry points behave identically.
 */
export function navigateToSection(
  id: string,
  view: AppView,
  onNavigate: (view: AppView) => void,
): void {
  if (view !== 'landing') {
    onNavigate('landing')
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    })
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
}
