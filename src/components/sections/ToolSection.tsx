import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionReveal } from '@/components/motion/SectionReveal'
import { UploadZone } from '@/components/UploadZone'
import { ReportView } from '@/components/ReportView'
import { analyzeResume, type AnalysisResult } from '@/lib/analysis'
import type { ParsedResume } from '@/lib/parsing'

type ToolPhase = 'idle' | 'parsed' | 'analyzing' | 'done'

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

/**
 * ToolSection — the analyser workspace.
 * State machine: idle → parsed → analyzing → done. Parsing happens in
 * UploadZone (Todo 2.2); analysis is client-side via analyzeResume
 * (Todo 3.1); the result renders in ReportView (Todo 3.2 minimal,
 * upgraded with graphs in Todo 4.1). No server calls anywhere.
 */
export function ToolSection() {
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

  const handleAnalyse = () => {
    if (!parsed) return
    setPhase('analyzing')
    // Synchronous and fast — the rAF only lets the analysing state paint
    // for one frame before the result renders (no artificial delay).
    requestAnimationFrame(() => {
      const r = analyzeResume(parsed.text, {
        jdText: jdText.trim() || undefined,
        warnings: parsed.warnings,
      })
      setResult(r)
      setPhase('done')
    })
  }

  const handleReset = () => {
    setPhase('idle')
    setParsed(null)
    setJdText('')
    setJdOpen(false)
    setResult(null)
  }

  return (
    <section id="tool" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <SectionReveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              The Analyser
            </p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Drop your resume{' '}
              <em className="font-normal italic text-accent">in.</em>
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
            {phase === 'idle' && <UploadZone onParsed={handleParsed} />}

            {phase === 'parsed' && parsed && (
              <div className="rounded-2xl border border-ink/10 bg-paper p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  ✓ {parsed.format.toUpperCase()} loaded
                </p>
                <p className="mt-1 text-sm text-ink-soft">
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

                {jdOpen && (
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the job description here…"
                    rows={4}
                    aria-label="Job description"
                    className="mt-3 w-full resize-y rounded-xl border border-ink/15 bg-paper p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
                  />
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyse}
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
            )}

            {phase === 'analyzing' && (
              <div className="rounded-2xl border border-ink/10 bg-paper p-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink/10 border-t-accent" />
                <p className="mt-4 text-sm text-ink-soft">Analysing…</p>
              </div>
            )}

            {phase === 'done' && result && (
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
            )}
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}