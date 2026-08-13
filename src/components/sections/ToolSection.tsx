import { FileText } from 'lucide-react'
import { SectionReveal } from '@/components/motion/SectionReveal'

/**
 * ToolSection — the analyser workspace.
 * Two-column split (header left, dropzone card right) — adapted from the
 * 21st.dev `upload-ui` UploadCard states (larsen66): idle / uploading /
 * success / error. This is a DESIGNED SHELL for Todo 1.2; real parsing
 * wires in via UploadZone in Wave 2 (Todo 2.2). All visual states are
 * represented here so the section is not a placeholder.
 */
export function ToolSection() {
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
          </SectionReveal>

          <SectionReveal delay={0.12}>
            {/* Dropzone shell — UploadCard idle state (Todo 2.2 wires parsing) */}
            <div className="group relative rounded-xl border border-dashed border-ink/20 bg-surface p-10 text-center transition-colors hover:border-accent/50">
              <div
                aria-hidden="true"
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-ink/10 bg-paper text-ink-soft transition-colors group-hover:text-accent"
              >
                <FileText className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <p className="font-display text-lg font-semibold text-ink">
                Drop your resume here
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-muted">
                PDF · DOCX · TXT
              </p>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                ≤ 5 MB · parsed in your browser · nothing uploaded
              </p>
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}
