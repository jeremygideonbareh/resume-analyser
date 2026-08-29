import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * VerdictSection — the stakes, made tangible.
 *
 * The parse band shows what the machine reads; this shows what it does with
 * it. Rather than asserting "70% is the filter line" in a paragraph, it hands
 * the reader the dial: drag across the threshold and watch the outcome flip.
 * Understanding a cutoff you moved yourself is a different thing from reading
 * a number in body copy.
 *
 * The control is a real <input type="range">, not a custom drag handle, so it
 * is keyboard-operable and announces its value for free. Everything visual is
 * driven off that one input.
 *
 * Colour never carries the verdict alone — the state is spelled out in words
 * as well, because a red/blue distinction is invisible to a meaningful share
 * of readers and pointless in a screenshot.
 */

const THRESHOLD = 70

const OUTCOMES = {
  pass: {
    label: 'Shortlisted for human review',
    detail:
      'Above the line, your resume reaches a recruiter. From here, keyword depth and quantified bullets decide the ranking.',
  },
  fail: {
    label: 'Filtered before anyone reads it',
    detail:
      'Below the line, the rejection is automatic. No person sees the document, and no feedback is sent — which is why the gap is so hard to diagnose from the outside.',
  },
} as const

export function VerdictSection() {
  const [score, setScore] = useState(58)
  const sliderId = useId()
  const passes = score >= THRESHOLD
  const outcome = passes ? OUTCOMES.pass : OUTCOMES.fail

  return (
    <section
      id="verdict"
      aria-labelledby="verdict-heading"
      className="relative overflow-hidden border-b border-hairline"
    >
      {/* Thousands of identical sheet edges with exactly one lit — the section's
          argument as a picture. Stays high-key so this remains a light section:
          the hero and the parse band are the page's dark register, and a third
          dark moment would stop the inversion meaning anything.

          Heavily scrimmed because a dial and a paragraph sit on top; the image
          is here to give the section weight, not to be looked at directly. */}
      <MediaBackdrop
        src="the-stack"
        video="the-stack-loop"
        scrim={0.86}
        scrimColor="canvas"
        scrimDirection="flat"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          {/* ── The dial ──────────────────────────────────────── */}
          <div className="rounded-xl bg-surface p-6 elev-soft sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div
                  className="font-mono text-[4rem] font-medium leading-none tabular-nums text-ink"
                  // The number is the slider's value; the slider already
                  // announces it, so don't let AT read it twice.
                  aria-hidden="true"
                >
                  {score}
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted">
                  ATS match score
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-[13px] font-medium',
                  passes
                    ? 'bg-accent-soft text-link'
                    : 'bg-sticker-orange/15 text-warning',
                )}
              >
                {passes ? 'Passes' : 'Filtered'}
              </span>
            </div>

            {/* Track + threshold marker */}
            <div className="relative mt-6">
              <div className="h-2.5 overflow-hidden rounded-full bg-hairline">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none',
                    passes ? 'bg-accent' : 'bg-sticker-orange',
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              {/* The line itself — the whole point of the section */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 bottom-0 w-px bg-ink/40"
                style={{ left: `${THRESHOLD}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-6 -translate-x-1/2 font-mono text-[10px] text-muted"
                style={{ left: `${THRESHOLD}%` }}
              >
                {THRESHOLD}
              </span>
            </div>

            <label
              htmlFor={sliderId}
              className="mt-6 block text-body-sm text-ink-soft"
            >
              Drag to see what changes at the cutoff
            </label>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              aria-describedby={`${sliderId}-outcome`}
              className="mt-2 w-full accent-accent"
            />
          </div>

          {/* ── What it means ─────────────────────────────────── */}
          <div>
            <h2 id="verdict-heading" className="text-display-2 text-ink">
              Most resumes are rejected
              <br />
              <span className="text-link">by software, not people.</span>
            </h2>

            <div
              id={`${sliderId}-outcome`}
              aria-live="polite"
              className="mt-6"
            >
              <p className="text-title text-ink">{outcome.label}</p>
              <p className="measure mt-2 text-body-md text-ink-soft">
                {outcome.detail}
              </p>
            </div>

            <p className="measure mt-6 text-body-sm text-muted">
              Employers commonly screen at a {THRESHOLD}% keyword match.
              careerBoT scores against that same threshold, so the number you
              see here is the number that decides your application.
            </p>

            <a
              href="#tool"
              className="mt-8 inline-flex items-center rounded-full bg-accent px-6 py-3 text-[16px] font-medium text-surface transition-colors hover:bg-accent-strong"
            >
              Score my resume
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
