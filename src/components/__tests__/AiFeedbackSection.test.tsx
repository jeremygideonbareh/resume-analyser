// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AiFeedbackSection } from '@/components/AiFeedbackSection'

const { llmMock } = vi.hoisted(() => ({
  llmMock: {
    LLM_ENABLED: true,
    fetchAiFeedback: vi.fn(),
    fetchGrammarIssues: vi.fn(),
  },
}))

vi.mock('@/lib/llm', () => ({
  get LLM_ENABLED() {
    return llmMock.LLM_ENABLED
  },
  fetchAiFeedback: llmMock.fetchAiFeedback,
  fetchGrammarIssues: llmMock.fetchGrammarIssues,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  llmMock.LLM_ENABLED = true
})

const feedback = {
  summary: 'Strong resume overall.',
  strengths: ['Clear headings'],
  improvements: ['Add metrics to your project bullets'],
  suggestions: ['Add a professional summary section'],
}

const issues = [
  {
    message: 'Possible typo',
    suggestion: 'Change "recieve" to "receive"',
    context: 'recieve the award',
  },
]

describe('AiFeedbackSection', () => {
  it('renders nothing when the LLM tier is disabled', () => {
    llmMock.LLM_ENABLED = false
    const { container } = render(<AiFeedbackSection text="resume" />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText(/AI Feedback/)).toBeNull()
  })

  it('POSTs the resume text to both endpoints and renders feedback', async () => {
    llmMock.fetchAiFeedback.mockResolvedValue(feedback)
    llmMock.fetchGrammarIssues.mockResolvedValue(issues)

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(llmMock.fetchAiFeedback).toHaveBeenCalledWith('My resume text')
    expect(llmMock.fetchGrammarIssues).toHaveBeenCalledWith('My resume text')
    expect(await screen.findByText('Strong resume overall.')).toBeInTheDocument()
    expect(screen.getByText('Clear headings')).toBeInTheDocument()
  })

  it('renders grammar issues as a checklist with context, message, and Apply', async () => {
    llmMock.fetchAiFeedback.mockResolvedValue(feedback)
    llmMock.fetchGrammarIssues.mockResolvedValue(issues)

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(await screen.findByText('Grammar issues')).toBeInTheDocument()
    expect(screen.getByText('“recieve the award”')).toBeInTheDocument()
    expect(screen.getByText('Possible typo')).toBeInTheDocument()
    expect(screen.getByText(/Change "recieve" to "receive"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
  })

  it('copies the suggestion to the clipboard when Apply is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    llmMock.fetchAiFeedback.mockResolvedValue(feedback)
    llmMock.fetchGrammarIssues.mockResolvedValue(issues)

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    const apply = await screen.findByRole('button', { name: /apply/i })
    fireEvent.click(apply)

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Change "recieve" to "receive"')
    })
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('renders improvements and suggestions as actionable cards', async () => {
    llmMock.fetchAiFeedback.mockResolvedValue(feedback)
    llmMock.fetchGrammarIssues.mockResolvedValue([])

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(
      await screen.findByText('AI-generated resume improvements'),
    ).toBeInTheDocument()
    expect(screen.getByText('Add metrics to your project bullets')).toBeInTheDocument()
    expect(screen.getByText('Add a professional summary section')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /copy/i }).length).toBe(2)
  })

  it('renders a friendly message when either request fails', async () => {
    llmMock.fetchAiFeedback.mockResolvedValue(feedback)
    llmMock.fetchGrammarIssues.mockRejectedValue(new Error('boom'))

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(
      await screen.findByText(/temporarily unavailable/i),
    ).toBeInTheDocument()
  })

  it('shows a loading state while the requests are in flight', async () => {
    let resolveFeedback!: (v: unknown) => void
    let resolveIssues!: (v: unknown) => void
    llmMock.fetchAiFeedback.mockImplementation(
      () =>
        new Promise((r) => {
          resolveFeedback = r
        }),
    )
    llmMock.fetchGrammarIssues.mockImplementation(
      () =>
        new Promise((r) => {
          resolveIssues = r
        }),
    )

    render(<AiFeedbackSection text="My resume text" />)
    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }))

    expect(screen.getByRole('status')).toBeInTheDocument()

    resolveFeedback({ summary: 's', strengths: [], improvements: [], suggestions: [] })
    resolveIssues([])
    expect(await screen.findByText('s')).toBeInTheDocument()
  })
})