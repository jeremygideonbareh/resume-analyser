import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import * as mammoth from 'mammoth'

/**
 * Client-side resume parsing: PDF (pdfjs-dist), DOCX (mammoth), TXT passthrough.
 * Zero-upload — text is extracted entirely in the browser.
 */

export type ParsedFormat = 'pdf' | 'docx' | 'txt'

export interface ParsedResume {
  text: string
  format: ParsedFormat
  warnings: string[]
}

export type ParsingErrorCode =
  | 'file-too-large'
  | 'unsupported-type'
  | 'no-text'
  | 'parse-error'

export class ParsingError extends Error {
  readonly code: ParsingErrorCode

  constructor(code: ParsingErrorCode, message: string) {
    super(message)
    this.name = 'ParsingError'
    this.code = code
  }
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024
const MIN_TEXT_CHARS = 50
const LOW_CONFIDENCE_CHARS = 200

const MIME_TO_FORMAT: Record<string, ParsedFormat> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
}

function detectFormat(type: string, name: string): ParsedFormat | null {
  const byMime = MIME_TO_FORMAT[type]
  if (byMime) return byMime
  if (type.startsWith('text/')) return 'txt'
  // Some browsers send an empty/generic MIME — fall back to the extension.
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf' || ext === 'docx' || ext === 'txt') {
    return ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt'
  }
  return null
}

async function extractPdf(file: File): Promise<string> {
  // Lazy-load pdf.js only when a PDF is actually analysed (Todo 5.2) so the
  // library ships as a dynamic chunk instead of inflating the main bundle.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Browser-only: the real Web Worker needs an explicit src. In Node/Vitest
  // `window` is undefined and pdf.js falls back to its built-in main-thread
  // "fake worker" — setting workerSrc there would make it try to dynamic-import
  // the worker file and fail (path mangling under Vitest's ?url resolution).
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  }
  const data = new Uint8Array(await file.arrayBuffer())
  // pdfjs v6: cleanup happens on the LoadingTask (doc.destroy was removed).
  const loadingTask = pdfjsLib.getDocument({ data })
  const doc = await loadingTask.promise
  try {
    const pageTexts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const line = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      pageTexts.push(line)
    }
    return pageTexts.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  // mammoth's Node build's unzip only accepts `path`/`buffer` (the
  // `arrayBuffer` key exists in the browser build only). Detect at runtime.
  const nodeBuffer = (
    globalThis as { Buffer?: { from(data: ArrayBuffer): unknown } }
  ).Buffer
  const result = nodeBuffer
    ? await mammoth.extractRawText({
        buffer: nodeBuffer.from(arrayBuffer) as never,
      })
    : await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * Extract text from an uploaded file. Pure-function shaped so it is
 * unit-testable; rejects with `ParsingError` (code field) on failure.
 */
export async function extractTextFromFile(file: File): Promise<ParsedResume> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ParsingError('file-too-large', 'File must be under 5MB.')
  }

  const format = detectFormat(file.type, file.name)
  if (!format) {
    throw new ParsingError(
      'unsupported-type',
      'Please upload a PDF, DOCX, or TXT file.'
    )
  }

  let text: string
  try {
    text =
      format === 'pdf'
        ? await extractPdf(file)
        : format === 'docx'
          ? await extractDocx(file)
          : await file.text()
  } catch (error) {
    if (error instanceof ParsingError) throw error
    const detail = error instanceof Error ? ` (${error.name}: ${error.message})` : ''
    throw new ParsingError(
      'parse-error',
      `Could not read the file. Try converting it to text and pasting it instead.${detail}`
    )
  }

  const trimmed = text.trim()
  if (trimmed.length < MIN_TEXT_CHARS) {
    throw new ParsingError(
      'no-text',
      'No readable text found — this looks like a scanned/image PDF. Try pasting the text instead.'
    )
  }

  const warnings = trimmed.length < LOW_CONFIDENCE_CHARS ? ['possible-scanned'] : []
  return { text: trimmed, format, warnings }
}
