import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadConversation, postChatMessage } from '@/lib/chat'
import type { ChatMessage, EligibilityResult } from '@/lib/placement-types'
import { cn } from '@/lib/utils'

type AppView = 'landing' | 'dashboard' | 'profile' | 'chat'

interface ChatViewProps {
  /** Signed-in user id — gates the chat behind authentication. */
  userId?: string
  /** Switches the app view (e.g. to the profile to complete it first). */
  onNavigate?: (view: AppView) => void
}

interface LocalMessage extends ChatMessage {
  /** Client-generated id for messages not yet persisted server-side. */
  localId: string
}

/**
 * ChatView — the placement chatbot module (T3.3).
 *
 * Message list + composer. Sends via `postChatMessage` (JWT-authenticated),
 * renders deterministic eligibility cards (D7) when the reply carries them,
 * and loads the persisted conversation on mount. Signed-out users see a
 * sign-in prompt instead of the chat.
 */
export function ChatView({ userId, onNavigate = () => {} }: ChatViewProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [eligibilityByMessage, setEligibilityByMessage] = useState<
    Record<string, EligibilityResult[]>
  >({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const history = await loadConversation()
        if (cancelled) return
        setMessages(
          history.map((m) => ({ ...m, localId: m.id })),
        )
      } catch {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    // jsdom (tests) does not implement scrollIntoView — guard the call.
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSendError(false)

    const userMessage: LocalMessage = {
      id: '',
      localId: `local-user-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: userId ?? '',
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMessage])
    setSending(true)

    try {
      const { reply, eligibility } = await postChatMessage(text)
      const assistantId = `local-assistant-${Date.now()}`
      const assistantMessage: LocalMessage = {
        id: '',
        localId: assistantId,
        created_at: new Date().toISOString(),
        user_id: userId ?? '',
        role: 'assistant',
        content: reply,
      }
      setMessages((prev) => [...prev, assistantMessage])
      if (eligibility && eligibility.length > 0) {
        setEligibilityByMessage((prev) => ({
          ...prev,
          [assistantId]: eligibility,
        }))
      }
    } catch {
      setSendError(true)
      setMessages((prev) => prev.filter((m) => m.localId !== userMessage.localId))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Placement assistant
        </p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Sign in to chat with your placement assistant.
        </h2>
        <p className="mt-4 max-w-md text-ink-soft">
          Ask about eligibility, companies, or interview prep — grounded in
          your profile and the seeded company data.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="mt-6 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
        >
          Back to home
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your conversation…
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Placement assistant
        </p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Couldn’t load your conversation.
        </h2>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
        >
          Reload
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Placement assistant
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Ask about your placements
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('profile')}
          className="h-9 px-4 text-xs"
        >
          Edit profile
        </Button>
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-4 sm:p-6">
        {messages.length === 0 && !sendError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-8 w-8 text-accent" />
            <p className="max-w-sm text-sm text-ink-soft">
              Ask things like “Am I eligible for TCS?” or “Which companies can
              I apply to?” — answers are grounded in your profile and the
              seeded company data.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.localId} className="space-y-2">
              <div
                className={cn(
                  'flex items-start gap-2',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {m.role === 'assistant' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Bot className="h-4 w-4 text-accent" />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'rounded-br-sm bg-ink text-paper'
                      : 'rounded-bl-sm bg-surface text-ink',
                  )}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10">
                    <UserRound className="h-4 w-4 text-ink" />
                  </span>
                )}
              </div>

              {m.role === 'assistant' &&
                eligibilityByMessage[m.localId] &&
                eligibilityByMessage[m.localId].length > 0 && (
                  <div className="ml-9 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {eligibilityByMessage[m.localId].map((e) => (
                      <div
                        key={e.company}
                        className={cn(
                          'rounded-xl border p-3',
                          e.eligible
                            ? 'border-accent/30 bg-accent/5'
                            : 'border-danger/30 bg-danger/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink">
                            {e.company}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
                              e.eligible
                                ? 'bg-accent/15 text-ink'
                                : 'bg-danger/15 text-danger',
                            )}
                          >
                            {e.eligible ? 'Eligible' : 'Not eligible'}
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {e.reasons.map((reason) => (
                            <li
                              key={reason}
                              className="text-xs leading-snug text-ink-soft"
                            >
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-start gap-2">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <Bot className="h-4 w-4 text-accent" />
            </span>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        {sendError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">
              Couldn’t reach the assistant. Your message is back in the box —
              try again.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSend()}
              className="h-8 shrink-0 px-3 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        aria-label="Chat form"
        className="mt-4 flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSend()
        }}
      >
        <input
          aria-label="Message the placement assistant"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about eligibility, companies, interview prep…"
          className="h-11 flex-1 rounded-full border border-ink/15 bg-paper px-5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink/40"
        />
        <Button
          type="submit"
          disabled={sending || !input.trim()}
          className="h-11 w-11 rounded-full p-0"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}