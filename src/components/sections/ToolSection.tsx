import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { SectionReveal } from '@/components/motion/SectionReveal'
import { LetterCascade } from '@/components/ui/letter-cascade'
import { UploadZone } from '@/components/UploadZone'
import { ReportView } from '@/components/ReportView'
import { AnalyzingSkeleton } from '@/components/KineticLoader'
import { analyzeResume, type AnalysisResult } from '@/lib/analysis'
import { saveAnalysis } from '@/lib/history'
import { getSupabase } from '@/lib/supabase'
import type { AuthUser } from '@/lib/session'
import type { ParsedResume } from '@/lib/parsing'

type ToolPhase = 'idle' | 'parsed' | 'analyzing' | 'done'

/** Minimum time the analysing count-up stays visible (Todo 4.4). */
const ANALYZING_MIN_MS = 700

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

/**
 * ToolSection — the analyser workspace.
 * State machine: idle → parsed → analyzing → done. Parsing happens in
 * UploadZone (Todo 2.2); analysis is client-side via analyzeResume
 * (Todo 3.1); the result renders in ReportView (Todo 3.2 minimal,
 * upgraded with graphs in Todo 4.1). Every transition has a kinetic
 * treatment (Todo 4.4). No server calls anywhere — except Todo 3.3:
 * when signed in, the analysis is persisted to the user's history
 * (fire-and-forget; failures toast and never block the report).
 */
export function ToolSection({
  user,
  onSignIn,
}: {
  user: AuthUser | null
  onSignIn: () => void
}) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<ToolPhase>('idle')
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [jdText, setJdText] = useState('')
  const [jdOpen, setJdOpen] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleParsed = (p: ParsedResume) => {
    setParsed(p)
    setResult(null)
    setPhase('parsed')
  }

  const handleAnalyse = async () => {
    if (!parsed) return
    setPhase('analyzing')
    // Analysis is synchronous and fast; keep the count-up skeleton on
    // screen for a beat so the transition reads as kinetic (Todo 4.4).
    const started = performance.now()
    const r = analyzeResume(parsed.text, {
      jdText: jdText.trim() || undefined,
      warnings: parsed.warnings,
    })
    const elapsed = performance.now() - started
    if (elapsed < ANALYZING_MIN_MS) {
      await new Promise((resolve) => setTimeout(resolve, ANALYZING_MIN_MS - elapsed))
    }
    setResult(r)
    setPhase('done')

    // Todo 3.3 — persist history for signed-in users (fire-and-forget).
    // Guest flow is untouched: no save attempt, no toast, no console noise.
    if (user && parsed) {
      void (async () => {
        try {
          await saveAnalysis(getSupabase(), user.id, r, parsed)
        } catch {
          toast.error(
            "Couldn't save this analysis — you're still signed out of history",
          )
        }
      })()
    }
  }

  const handleReset = () => {
    setPhase('idle')
    setParsed(null)
    setJdText('')
    setJdOpen(false)
    setResult(null)
  }

  const phaseTransition = reduce
    ? undefined
    : { duration: 0.2, ease: 'easeOut' as const }

  return (
    <section id="tool" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <SectionReveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              The Analyser
            </p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <LetterCascade
                text="Drop your resume "
                className="cursor-default justify-start"
              />
              <LetterCascade
                text="in."
                letterClassName="font-normal italic text-accent"
                className="cursor-default justify-start"
              />
            </h2>
            <p className="mt-4 max-w-md text-ink-soft">
              PDF, DOCX, or plain text — up to 5MB. Parsed entirely in your
              browser: sections, skills, formatting, and a weighted ATS score.
            </p>
            {parsed && phase !== 'idle' && (
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                ✓ {parsed.format.toUpperCase()} loaded · {wordCount(parsed.text)}{' '}
                words
              </p>
            )}
          </SectionReveal>

          <SectionReveal delay={0.12}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'idle' && (
                <motion.div
                  key="idle"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={phaseTransition}
                >
                  {user ? (
                    <UploadZone onParsed={handleParsed} />
                  ) : (
                    <div className="rounded-2xl border border-ink/10 bg-paper p-6">
                      <div className="flex items-start gap-4">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-surface text-accent">
                          <Lock className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                            Sign in to analyse
                          </p>
                          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                            Your resume stays on your device.
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                            Parsing runs 100% in your browser — files never
                            leave your computer. Sign in to save results to
                            your account and revisit them anytime.
                          </p>
                          <button
                            type="button"
                            onClick={onSignIn}
                            className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                          >
                            Sign in to continue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {phase === 'parsed' && parsed && (
                <motion.div
                  key="parsed"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={phaseTransition}
                >
                  <div className="rounded-2xl border border-ink/10 bg-paper p-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                      ✓ {parsed.format.toUpperCase()} loaded
                    </p>
                    <p
                      role="status"
                      className="mt-1 text-sm text-ink-soft"
                    >
                      {wordCount(parsed.text)} words ready for analysis.
                    </p>

                    <button
                      type="button"
                      onClick={() => setJdOpen((o) => !o)}
                      className="mt-5 flex items-center gap-1.5 text-sm text-ink hover:text-accent"
                      aria-expanded={jdOpen}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${jdOpen ? 'rotate-180' : ''}`}
                      />
                      {jdOpen ? 'Hide' : 'Paste'} a job description to match
                      keywords (optional)
                    </button>

                    <AnimatePresence initial={false}>
                      {jdOpen && (
                        <motion.div
                          key="jd"
                          initial={reduce ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduce ? undefined : { opacity: 0, height: 0 }}
                          transition={
                            reduce
                              ? undefined
                              : { duration: 0.2, ease: 'easeOut' }
                          }
                          className="overflow-hidden"
                        >
                          <textarea
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            placeholder="Paste the job description here…"
                            rows={4}
                            aria-label="Job description"
                            className="mt-3 w-full resize-y rounded-xl border border-ink/15 bg-paper p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleAnalyse()}
                        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                      >
                        Analyse resume
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:border-ink/30"
                      >
                        Try another resume
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === 'analyzing' && (
                <motion.div
                  key="analyzing"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={phaseTransition}
                >
                  <AnalyzingSkeleton />
                </motion.div>
              )}

              {phase === 'done' && result && (
                <motion.div
                  key="done"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={phaseTransition}
                >
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-full border border-ink/15 px-5 py-2 text-sm text-ink transition-colors hover:border-ink/30"
                      >
                        Try another resume
                      </button>
                    </div>
                    <ReportView result={result} parsed={parsed} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}