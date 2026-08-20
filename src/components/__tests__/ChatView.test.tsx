// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ChatView } from '@/components/ChatView'
import type { ChatMessage, EligibilityResult } from '@/lib/placement-types'

vi.mock('@/lib/chat', () => ({
  loadConversation: vi.fn(),
  postChatMessage: vi.fn(),
}))

/**
 * T3.3 — ChatView tests.
 *
 * Cases per the plan: gate, load conversation, send flow, eligibility cards,
 * error retry, Enter-to-send.
 */

const { loadConversation, postChatMessage } = vi.mocked(
  require('@/lib/chat') as typeof import('@/lib/chat'),
)

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
      expect(screen.getByText(/couldn’t reach the assistant/i)).toBeInTheDocument()
    })
    // Input restored so the user can retry.
    expect(screen.getByLabelText(/message the placement assistant/i)).toHaveValue(
      'Hello again',
    )

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Recovered!')).toBeInTheDocument()
    expect(screen.queryByText(/couldn’t reach the assistant/i)).not.toBeInTheDocument()
  })
})