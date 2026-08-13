import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScanSkeleton } from '@/components/KineticLoader'
import {
  extractTextFromFile,
  ParsingError,
  type ParsedResume,
} from '@/lib/parsing'
import { cn } from '@/lib/utils'

type UploadPhase = 'idle' | 'parsing' | 'error' | 'success'

/** Minimum time the scanning treatment stays visible (Todo 4.4). */
const PARSING_MIN_MS = 400

const ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

function errorMessage(error: unknown): string {
  if (error instanceof ParsingError) {
    switch (error.code) {
      case 'file-too-large':
        return 'File must be under 5MB.'
      case 'unsupported-type':
        return 'Please upload a PDF, DOCX, or TXT file.'
      case 'no-text':
        return 'No readable text found — this looks like a scanned/image PDF. Try pasting the text instead.'
      case 'parse-error':
        return 'Could not read that file. Try converting it to text and pasting it instead.'
    }
  }
  return 'Something went wrong while reading the file. Please try again.'
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

interface UploadZoneProps {
  onParsed: (parsed: ParsedResume) => void
}

/**
 * UploadZone — drag-drop + click-to-browse + paste fallback, with
 * idle / parsing / error / success states. Parsing runs client-side
 * via `extractTextFromFile`; errors map ParsingError codes to copy.
 */
export function UploadZone({ onParsed }: UploadZoneProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ParsedResume | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)

  const openPicker = () => inputRef.current?.click()

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    setPhase('parsing')
    setMessage('')
    const started = performance.now()
    try {
      const parsed = await extractTextFromFile(file)
      // Keep the scanning treatment visible for a beat (Todo 4.4) —
      // well under the 2.5s kinetic budget.
      const elapsed = performance.now() - started
      if (elapsed < PARSING_MIN_MS) {
        await new Promise((r) => setTimeout(r, PARSING_MIN_MS - elapsed))
      }
      setResult(parsed)
      setPhase('success')
      onParsed(parsed)
    } catch (error) {
      setResult(null)
      setMessage(errorMessage(error))
      setPhase('error')
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    const file = new File([pasteText], 'pasted-resume.txt', {
      type: 'text/plain',
    })
    await handleFile(file)
  }

  const reset = () => {
    setPhase('idle')
    setMessage('')
    setResult(null)
    setPasteText('')
    setPasteOpen(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div
        ref={zoneRef}
        role="button"
        tabIndex={0}
        aria-label="Upload your resume — PDF, DOCX, or TXT, up to 5MB"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'group relative rounded-xl border border-dashed p-10 text-center transition-all',
          phase === 'error'
            ? 'border-danger/40 bg-danger/5'
            : phase === 'success'
              ? 'border-accent/40 bg-accent/5'
              : 'border-ink/20 bg-surface hover:border-accent/50',
          dragOver && 'scale-[1.01] border-accent bg-accent-soft/40'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
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
                or click to browse
              </p>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                PDF · DOCX · TXT — ≤ 5 MB — parsed in your browser
              </p>
            </motion.div>
          )}

          {phase === 'parsing' && (
            <motion.div
              key="parsing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ScanSkeleton />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-8 w-8 text-danger"
                  strokeWidth={1.75}
                />
                <p role="alert" className="max-w-sm text-sm text-ink">
                  {message}
                </p>
                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    reset()
                  }}
                >
                  Try again
                </Button>
              </div>
            </motion.div>
          )}

          {phase === 'success' && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-8 w-8 text-accent"
                  strokeWidth={1.75}
                />
                <p className="font-display text-lg font-semibold text-ink">
                  Resume ready
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                  {result.format.toUpperCase()} · {wordCount(result.text)} words
                </p>
                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    reset()
                  }}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Try another resume
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'idle' && (
        <div className="mt-4 text-center">
          {!pasteOpen ? (
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              or paste your resume as text
            </button>
          ) : (
            <div className="mx-auto max-w-md text-left">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the full text of your resume here…"
                rows={5}
                aria-label="Pasted resume text"
                className="mb-2"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!pasteText.trim()}
                  onClick={() => void handlePasteSubmit()}
                >
                  Use pasted text
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
