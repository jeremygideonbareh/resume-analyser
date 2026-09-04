// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ChatView } from '@/components/ChatView'
import { loadConversation, postChatMessage } from '@/lib/chat'
import { startPractice, submitAnswer } from '@/lib/practice'
import type { ChatMessage, EligibilityResult } from '@/lib/placement-types'

vi.mock('@/lib/chat', () => ({
  loadConversation: vi.fn(),
  postChatMessage: vi.fn(),
}))

vi.mock('@/lib/practice', () => ({
  startPractice: vi.fn(),
  submitAnswer: vi.fn(),
  completeSession: vi.fn(),
}))

/**
 * T3.3 — ChatView tests.
 *
 * Cases per the plan: gate, load conversation, send flow, eligibility cards,
 * error retry, Enter-to-send.
 */

const history: ChatMessage[] = [
  {
    id: 'm1',
    created_at: '2026-08-20T00:00:00Z',
    user_id: 'user_1',
    role: 'user',
    content: 'Am I eligible for TCS?',
  },
  {
    id: 'm2',
    created_at: '2026-08-20T00:00:01Z',
    user_id: 'user_1',
    role: 'assistant',
    content: 'Based on your profile, here is the TCS breakdown.',
  },
]

const eligibility: EligibilityResult[] = [
  {
    company: 'TCS',
    eligible: true,
    reasons: ['CGPA 8.5 meets the 7.0 cutoff', 'Backlogs (0) within the limit'],
  },
  {
    company: 'Microsoft',
    eligible: false,
    reasons: ['Missing: system design'],
  },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ChatView — gate', () => {
  it('shows a sign-in prompt when no userId is provided', () => {
    render(<ChatView />)
    expect(
      screen.getByText(/sign in to chat with your placement assistant/i),
    ).toBeInTheDocument()
  })
})

describe('ChatView — load conversation', () => {
  it('renders the persisted conversation oldest first', async () => {
    loadConversation.mockResolvedValue(history)
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByText('Am I eligible for TCS?')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Based on your profile, here is the TCS breakdown.'),
    ).toBeInTheDocument()
  })

  it('shows an empty-state prompt when there is no history', async () => {
    loadConversation.mockResolvedValue([])
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByText(/ask things like/i)).toBeInTheDocument()
    })
  })
})

describe('ChatView — send flow', () => {
  it('appends the user message and the assistant reply', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockResolvedValue({
      reply: 'You are eligible for TCS.',
      eligibility: null,
    })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Am I eligible for TCS?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(postChatMessage).toHaveBeenCalledWith('Am I eligible for TCS?')
    })
    expect(await screen.findByText('You are eligible for TCS.')).toBeInTheDocument()
    expect(screen.getByText('Am I eligible for TCS?')).toBeInTheDocument()
  })

  it('sends on Enter key', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockResolvedValue({ reply: 'Sure!', eligibility: null })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Hello' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /chat form/i }))

    await waitFor(() => {
      expect(postChatMessage).toHaveBeenCalledWith('Hello')
    })
  })

  it('clears the input after sending', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockResolvedValue({ reply: 'Sure!', eligibility: null })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toHaveValue('')
    })
  })
})

describe('ChatView — eligibility cards', () => {
  it('renders eligible and not-eligible cards from the reply', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockResolvedValue({
      reply: 'Here is your eligibility breakdown.',
      eligibility,
    })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Am I eligible for TCS?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByText('TCS')).toBeInTheDocument()
    expect(screen.getByText('Microsoft')).toBeInTheDocument()
    expect(screen.getByText('Eligible')).toBeInTheDocument()
    expect(screen.getByText('Not eligible')).toBeInTheDocument()
    expect(screen.getByText('CGPA 8.5 meets the 7.0 cutoff')).toBeInTheDocument()
    expect(screen.getByText('Missing: system design')).toBeInTheDocument()
  })

  it('does not render cards when the reply has no eligibility data', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockResolvedValue({
      reply: 'Sure, here is some advice.',
      eligibility: null,
    })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Give me interview tips' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByText('Sure, here is some advice.')).toBeInTheDocument()
    })
    expect(screen.queryByText('Eligible')).not.toBeInTheDocument()
  })
})

describe('ChatView — error retry', () => {
  it('shows an error, restores the input, and retries on click', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ reply: 'Recovered!', eligibility: null })
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Hello again' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByText(/couldn't reach the assistant/i)).toBeInTheDocument()
    })
    // Input restored so the user can retry.
    expect(screen.getByLabelText(/message the placement assistant/i)).toHaveValue(
      'Hello again',
    )

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Recovered!')).toBeInTheDocument()
    expect(screen.queryByText(/couldn't reach the assistant/i)).not.toBeInTheDocument()
  })
})
describe('ChatView — profile-required', () => {
  it('shows full-page profile prompt when chat returns profile-required', async () => {
    loadConversation.mockResolvedValue([])
    postChatMessage.mockRejectedValue(new Error('profile-required'))
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/message the placement assistant/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/message the placement assistant/i), {
      target: { value: 'Hi' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByText(/complete your placement profile first/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument()
  })
})

describe('ChatView — mode toggle', () => {
  it('renders Chat and Practice toggle buttons', async () => {
    loadConversation.mockResolvedValue([])
    render(<ChatView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^chat$/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /^practice$/i })).toBeInTheDocument()
  })
})

describe('ChatView — practice MCQ flow', () => {
  it('renders multiple-choice options and grades a correct selection', async () => {
    loadConversation.mockResolvedValue([])
    startPractice.mockResolvedValue({
      session: {
        id: 'sess_1',
        difficulty: 'medium',
        totalQuestions: 1,
        completedQuestions: 0,
        scoreSum: 0,
      },
      questions: [
        {
          id: 'q_1',
          seq: 1,
          type: 'technical',
          prompt: 'What does SQL stand for?',
          options: ['Structured Query Language', 'Simple Query Line', 'Sequential Query Logic', 'System Question List'],
          correctIndex: 0,
          explanation: 'SQL stands for Structured Query Language.',
        },
      ],
    })
    submitAnswer.mockResolvedValue({
      correct: true,
      correctIndex: 0,
      explanation: 'SQL stands for Structured Query Language.',
      score: 10,
      completed: 1,
      total: 1,
    })
    render(<ChatView userId="user_1" />)

    fireEvent.click(await screen.findByRole('button', { name: /^practice$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /start practice/i }))

    expect(await screen.findByText('What does SQL stand for?')).toBeInTheDocument()
    expect(
      screen.getByText('Structured Query Language'),
    ).toBeInTheDocument()
    expect(screen.getByText('Simple Query Line')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Structured Query Language/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    await waitFor(() => {
      expect(submitAnswer).toHaveBeenCalledWith('sess_1', 'q_1', 0)
    })
    expect(await screen.findByText(/correct.*10\/10/i)).toBeInTheDocument()
    expect(screen.getByText('SQL stands for Structured Query Language.')).toBeInTheDocument()
  })
})

describe('ChatView — practice errors are humanized', () => {
  it('shows a friendly message (not the raw code) for an upstream LLM failure', async () => {
    loadConversation.mockResolvedValue([])
    startPractice.mockRejectedValue(new Error('llm-upstream-error'))
    render(<ChatView userId="user_1" />)

    fireEvent.click(await screen.findByRole('button', { name: /^practice$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /start practice/i }))

    expect(
      await screen.findByText(/AI service is temporarily unavailable/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('llm-upstream-error')).not.toBeInTheDocument()
  })

  it('shows a connectivity-specific message for a raw fetch failure', async () => {
    loadConversation.mockResolvedValue([])
    startPractice.mockRejectedValue(new Error('Failed to fetch'))
    render(<ChatView userId="user_1" />)

    fireEvent.click(await screen.findByRole('button', { name: /^practice$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /start practice/i }))

    expect(
      await screen.findByText(/check your internet connection/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  })
})
