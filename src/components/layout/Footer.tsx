import { LetterCascade } from '@/components/ui/letter-cascade'

/**
 * Footer — the privacy claim, stated plainly, plus the wordmark.
 *
 * The privacy paragraph used to be wrapped in LetterCascade. That component
 * splits its text per character and renders each one twice (a front and an
 * echo face) inside its own motion span, so a 250-character sentence became
 * roughly 500 animated nodes that flipped on hover. Per-letter motion is a
 * wordmark treatment; on body copy it is a cost with no reader benefit, and it
 * makes the one paragraph people actually need to trust hard to read. The
 * cascade stays on the wordmark, which is two words long and is the place the
 * flourish belongs.
 */
export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface font-mono text-xs font-medium text-ink"
            >
              RL
            </span>
            <LetterCascade
              text="ResumeLab"
              className="justify-start text-[17px] font-bold tracking-tight text-ink"
            />
          </div>

          <p className="measure text-body-sm text-ink-soft sm:max-w-md">
            Parsing runs entirely in your browser — no uploads, no cookies.
            Analyses you run while signed in are saved to your account so you
            can review them later; your resume text itself is never stored.
            Sign out or delete your history at any time.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-6 text-caption text-muted">
          <span>© 2026 ResumeLab</span>
          <span className="font-mono">v0.1.0</span>
        </div>
      </div>
    </footer>
  )
}
