import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@/lib/placement-types'

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    getSupabase: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: supabaseMock.getSupabase,
}))

/**
 * T3.2 — src/lib/chat.ts tests.
 *
 * Cases per the plan: fetch ok/error/timeout, JWT header present,
 * conversation ordering.
 */

async function loadChat() {
  vi.resetModules()
  return await import('@/lib/chat')
}

function makeSupabaseMock(opts: {
  token?: string | null
  rows?: ChatMessage[]
  error?: Error | null
} = {}) {
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: opts.token ? { access_token: opts.token } : null },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: opts.rows ?? [], error: opts.error ?? null })),
      })),
    })),
  }
  supabaseMock.getSupabase.mockReturnValue(client as never)
  return client
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('postChatMessage', () => {
  it('POSTs the message to /api/chat with the session JWT and returns the reply', async () => {
    makeSupabaseMock({ token: 'jwt-token-123' })
    const reply = { reply: 'You are eligible for IBM.', eligibility: [] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => reply })
    vi.stubGlobal('fetch', fetchMock)

    const chat = await loadChat()
    const result = await chat.postChatMessage('Am I eligible for IBM?')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/chat')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer jwt-token-123')
    expect(JSON.parse(init.body)).toEqual({ message: 'Am I eligible for IBM?' })
    expect(result).toEqual(reply)
  })

  it('throws when the user is not signed in (no session token)', async () => {
    makeSupabaseMock({ token: null })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const chat = await loadChat()
    await expect(chat.postChatMessage('hi')).rejects.toThrow(/not signed in/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when the endpoint responds with an error status', async () => {
    makeSupabaseMock({ token: 'jwt-token-123' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))

    const chat = await loadChat()
    await expect(chat.postChatMessage('hi')).rejects.toThrow(/status 429/)
  })

  it('throws on a client-side timeout', async () => {
    makeSupabaseMock({ token: 'jwt-token-123' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )

    const chat = await loadChat()
    await expect(chat.postChatMessage('hi')).rejects.toThrow()
  })
})

describe('loadConversation', () => {
  it('selects chatbot_messages ordered oldest first', async () => {
    const rows: ChatMessage[] = [
      {
        id: 'm1',
        created_at: '2026-08-20T10:00:00Z',
        user_id: 'user_1',
        role: 'user',
        content: 'hi',
      },
      {
        id: 'm2',
        created_at: '2026-08-20T10:00:05Z',
        user_id: 'user_1',
        role: 'assistant',
        content: 'hello',
      },
    ]
    const client = makeSupabaseMock({ rows })
    const chat = await loadChat()
    const result = await chat.loadConversation()

    expect(client.from).toHaveBeenCalledWith('chatbot_messages')
    expect(result).toEqual(rows)
  })

  it('throws when the query errors', async () => {
    makeSupabaseMock({ error: new Error('RLS denied') })
    const chat = await loadChat()
    await expect(chat.loadConversation()).rejects.toThrow(/RLS denied/)
  })
})