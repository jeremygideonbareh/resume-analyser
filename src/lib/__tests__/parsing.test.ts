/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  extractTextFromFile,
  ParsingError,
  MAX_FILE_BYTES,
} from '../parsing'

const FIXTURES = join(process.cwd(), 'src', 'test', 'fixtures')

function fixtureFile(name: string, type: string): File {
  const bytes = new Uint8Array(readFileSync(join(FIXTURES, name)))
  return new File([bytes], name, { type })
}

describe('extractTextFromFile — happy paths', () => {
  it('extracts expected content from the PDF fixture', async () => {
    const res = await extractTextFromFile(
      fixtureFile('sample.pdf', 'application/pdf')
    )
    expect(res.format).toBe('pdf')
    expect(res.text).toContain('FixtureName')
    expect(res.text).toContain('React, TypeScript')
    expect(res.warnings).toEqual([])
  })

  it('extracts expected content from the DOCX fixture', async () => {
    const res = await extractTextFromFile(
      fixtureFile(
        'sample.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    )
    expect(res.format).toBe('docx')
    expect(res.text).toContain('FixtureName')
    expect(res.text).toContain('Senior Software Engineer')
  })

  it('passes TXT through unchanged', async () => {
    const res = await extractTextFromFile(
      fixtureFile('sample.txt', 'text/plain')
    )
    expect(res.format).toBe('txt')
    expect(res.text).toContain('FixtureName')
    expect(res.text).toContain('BSc Computer Science, Example University')
  })

  it('accepts a .txt file whose MIME falls back to extension', async () => {
    const res = await extractTextFromFile(
      fixtureFile('sample.txt', 'application/octet-stream')
    )
    expect(res.format).toBe('txt')
    expect(res.text).toContain('FixtureName')
  })
})

describe('extractTextFromFile — failure paths', () => {
  it('rejects files over 5MB with code file-too-large', async () => {
    const big = new File(
      [new Uint8Array(MAX_FILE_BYTES + 1)],
      'big.txt',
      { type: 'text/plain' }
    )
    const err = await extractTextFromFile(big).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ParsingError)
    expect((err as ParsingError).code).toBe('file-too-large')
  })

  it('rejects unsupported MIME types with code unsupported-type', async () => {
    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'virus.exe', {
      type: 'application/octet-stream',
    })
    const err = await extractTextFromFile(exe).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ParsingError)
    expect((err as ParsingError).code).toBe('unsupported-type')
  })

  it('surfaces garbage PDF bytes as ParsingError (no-text or parse-error), no unhandled throw', async () => {
    const bad = new File([new Uint8Array([1, 2, 3, 4, 5])], 'bad.pdf', {
      type: 'application/pdf',
    })
    const err = await extractTextFromFile(bad).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ParsingError)
    expect(['no-text', 'parse-error']).toContain((err as ParsingError).code)
  })

  it('throws no-text for a valid PDF with no extractable text (scanned-like)', async () => {
    // A minimal valid PDF whose only content is graphics — no text operators.
    const scannedPdf = new Uint8Array(
      Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length 22>>stream\n0.1 0.1 0.1 rg\n100 100 400 400 re f\nendstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
        'latin1'
      )
    )
    const file = new File([scannedPdf], 'scanned.pdf', {
      type: 'application/pdf',
    })
    const err = await extractTextFromFile(file).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ParsingError)
    expect((err as ParsingError).code).toBe('no-text')
  })

  it('emits possible-scanned warning for short extracted text', async () => {
    // Between MIN_TEXT_CHARS (50) and LOW_CONFIDENCE_CHARS (200): parses but
    // flags a warning.
    const shortText =
      'Software engineer with a brief profile. React, TypeScript, Node.js, ' +
      'SQL, AWS. Seeking senior full-stack roles.'
    const short = new File(
      [new Uint8Array(Buffer.from(shortText, 'utf8'))],
      'short.txt',
      { type: 'text/plain' }
    )
    const res = await extractTextFromFile(short)
    expect(res.warnings).toContain('possible-scanned')
  })
})
