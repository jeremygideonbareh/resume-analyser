/**
 * Footer — privacy note + brand, with a mono meta row.
 */
export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/20 bg-surface font-mono text-xs font-medium text-ink"
            >
              RL
            </span>
            <span className="font-display text-base font-semibold text-ink">
              ResumeLab
            </span>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted">
            Privacy first: your resume never leaves your browser. No uploads, no
            storage, no cookies.
          </p>
        </div>
        <div className="border-t border-ink/10 pt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span>© 2026 ResumeLab</span>
            <span>v0.1.0</span>
            <span>Privacy first — no uploads, no storage, no cookies</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
