import { useState } from 'react'
import { SectionReveal } from '@/components/motion/SectionReveal'
import { UploadZone } from '@/components/UploadZone'
import type { ParsedResume } from '@/lib/parsing'

/**
 * ToolSection — the analyser workspace.
 * Two-column split (header left, upload card right). Parsing is wired
 * through UploadZone (Todo 2.2); the Analyse step + JD matching land in
 * Todo 3.2 on top of the parsed result held here.
 */
export function ToolSection() {
  const [parsed, setParsed] = useState<ParsedResume | null>(null)

  return (
    <section id="tool" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
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
            {parsed && (
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                ✓ {parsed.format.toUpperCase()} loaded
              </p>
            )}
          </SectionReveal>

          <SectionReveal delay={0.12}>
            <UploadZone onParsed={(p) => setParsed(p)} />
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}
