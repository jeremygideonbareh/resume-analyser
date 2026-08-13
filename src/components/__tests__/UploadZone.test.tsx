// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { UploadZone } from '@/components/UploadZone'
import { extractTextFromFile, type ParsedResume } from '@/lib/parsing'

vi.mock('@/lib/parsing', () => {
  class ParsingError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.name = 'ParsingError'
      this.code = code
    }
  }
  return {
    extractTextFromFile: vi.fn(),
    ParsingError,
  }
})

const mockedExtract = vi.mocked(extractTextFromFile)

const SAMPLE_PARSED: ParsedResume = {
  text: 'React TypeScript SQL AWS',
  format: 'txt',
  warnings: [],
}

beforeEach(() => {
  mockedExtract.mockReset()
})

// Vitest globals are disabled, so RTL's auto-cleanup never hooks in —
// without this, DOM accumulates across tests and getByRole sees duplicates.
afterEach(() => {
  cleanup()
})

describe('UploadZone', () => {
  it('shows the idle dropzone with keyboard-operable role button', () => {
    render(<UploadZone onParsed={vi.fn()} />)
    const zone = screen.getByRole('button', {
      name: /upload your resume — pdf, docx, or txt, up to 5mb/i,
    })
    expect(zone).toBeInTheDocument()
    expect(screen.getByText('Drop your resume here')).toBeInTheDocument()
  })

  it('parses a selected file, shows word count, and calls onParsed', async () => {
    mockedExtract.mockResolvedValue(SAMPLE_PARSED)
    const onParsed = vi.fn()
    render(<UploadZone onParsed={onParsed} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['React TypeScript SQL AWS'], 'resume.txt', {
      type: 'text/plain',
    })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/TXT · 4 words/i)).toBeInTheDocument()
    await waitFor(() => expect(onParsed).toHaveBeenCalledWith(SAMPLE_PARSED))
    expect(mockedExtract).toHaveBeenCalledTimes(1)
  })

  it('maps file-too-large to its user-facing message', async () => {
    const { ParsingError } = await import('@/lib/parsing')
    mockedExtract.mockRejectedValue(
      new ParsingError('file-too-large', 'File must be under 5MB.')
    )
    render(<UploadZone onParsed={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'big.txt', { type: 'text/plain' })],
      },
    })

    expect(await screen.findByText('File must be under 5MB.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('File must be under 5MB.')
  })

  it('maps no-text (scanned PDF) to the paste-suggestion message', async () => {
    const { ParsingError } = await import('@/lib/parsing')
    mockedExtract.mockRejectedValue(
      new ParsingError('no-text', 'No readable text found')
    )
    render(<UploadZone onParsed={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array([1, 2, 3])], 'scanned.pdf', { type: 'application/pdf' })] },
    })

    expect(
      await screen.findByText(/No readable text found — this looks like a scanned\/image PDF\. Try pasting the text instead\./i)
    ).toBeInTheDocument()
  })

  it('opens the file picker on Enter key on the dropzone', async () => {
    render(<UploadZone onParsed={vi.fn()} />)
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {})
    const zone = screen.getByRole('button', {
      name: /upload your resume/i,
    })
    fireEvent.keyDown(zone, { key: 'Enter' })
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('parses pasted text through the paste expander', async () => {
    mockedExtract.mockResolvedValue(SAMPLE_PARSED)
    const user = userEvent.setup()
    render(<UploadZone onParsed={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: /or paste your resume as text/i })
    )
    const textarea = screen.getByLabelText('Pasted resume text')
    await user.type(textarea, 'React TypeScript SQL AWS')

    const useButton = screen.getByRole('button', { name: 'Use pasted text' })
    expect(useButton).toBeEnabled()
    await user.click(useButton)

    expect(await screen.findByText(/TXT · 4 words/i)).toBeInTheDocument()
    expect(mockedExtract).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pasted-resume.txt', type: 'text/plain' })
    )
  })
})
