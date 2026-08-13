// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AiFeedbackSection } from '@/components/AiFeedbackSection'

const { llmMock } = vi.hoisted(() => ({
  llmMock: {
    LLM_ENABLED: true,
    fetchAiFeedback: vi.fn(),
  },
}))

vi.mock('@/lib/llm', () => ({
  get LLM_ENABLED() {
    return llmMock.LLM_ENABLED
  },
  fetchAiFeedback: llmMock.fetchAiFeedback,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  llmMock.LLM_ENABLED = true
})

describe('AiFeedbackSection', () => {
  it('renders nothing when the LLM tier is disabled', () => {
    llmMock.LLM_ENABLED = false
    const { container } = render(<AiFeedbackSection text="resume" />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText(/AI Feedback/)).toBeNull()
  })

  it('shows the CTA, POSTs the resume text, and renders feedback', async () => {
    llmMock.fetchAiFeedback.mockResolvedValue({
      summary: 'Strong resume overall.',
      strengths: ['Clear headings'],
      improvements: ['Add metrics'],
      suggestions: ['Add a summary'],
    })

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(llmMock.fetchAiFeedback).toHaveBeenCalledWith('My resume text')
    expect(await screen.findByText('Strong resume overall.')).toBeInTheDocument()
    expect(screen.getByText('Clear headings')).toBeInTheDocument()
    expect(screen.getByText('Add metrics')).toBeInTheDocument()
    expect(screen.getByText('Add a summary')).toBeInTheDocument()
  })

  it('renders a friendly message when the request fails', async () => {
    llmMock.fetchAiFeedback.mockRejectedValue(new Error('boom'))

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(
      await screen.findByText(/temporarily unavailable/i),
    ).toBeInTheDocument()
  })

  it('shows a loading state while the request is in flight', async () => {
    let resolve!: (v: unknown) => void
    llmMock.fetchAiFeedback.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(screen.getByRole('status')).toBeInTheDocument()

    resolve({
      summary: 's',
      strengths: [],
      improvements: [],
      suggestions: [],
    })
    expect(await screen.findByText('s')).toBeInTheDocument()
  })
})
