import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadConversation, postChatMessage } from '@/lib/chat'
import {
  startPractice,
  submitAnswer,
  completeSession,
} from '@/lib/practice'
import type {
  ChatMessage,
  EligibilityResult,
  PracticeDifficulty,
  PracticeQuestion,
  PracticeSession,
} from '@/lib/placement-types'
import { cn } from '@/lib/utils'

type AppView = 'landing' | 'dashboard' | 'profile' | 'chat'

interface ChatViewProps {
  userId?: string
  onNavigate?: (view: AppView) => void
}

interface LocalMessage extends ChatMessage {
  localId: string
}

type PracticePhase = 'idle' | 'active' | 'complete'

function PracticeMode({
  onNavigate,
}: {
  onNavigate: (view: AppView) => void
}) {
  const [phase, setPhase] = useState<PracticePhase>('idle')
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium')
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{
    correct: boolean
    correctIndex: number
    explanation: string
    score: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finalResult, setFinalResult] = useState<{
    scoreSum: number
    totalQuestions: number
    percent: number
  } | null>(null)

  const current = questions[index]

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await startPractice(difficulty)
      setSession(result.session)
      setQuestions(result.questions)
      setIndex(0)
      setSelectedIndex(null)
      setFeedback(null)
      setPhase('active')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start'
      if (msg === 'profile-required') {
        onNavigate('profile')
        return
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (selectedIndex === null || !session || !current) return
    setLoading(true)
    setError(null)
    try {
      const result = await submitAnswer(session.id, current.id, selectedIndex)
      setFeedback({
        correct: result.correct,
        correctIndex: result.correctIndex,
        explanation: result.explanation,
        score: result.score,
      })
      setSession((prev) =>
        prev
          ? {
              ...prev,
              completedQuestions: result.completed,
              scoreSum: (prev.scoreSum ?? 0) + result.score,
            }
          : prev,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setSelectedIndex(null)
      setFeedback(null)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    if (!session) return
    setLoading(true)
    try {
      const result = await completeSession(session.id)
      setFinalResult(result)
      setPhase('complete')
    } catch {
      setPhase('complete')
    } finally {
      setLoading(false)
    }
  }

  const handleNewSession = () => {
    setPhase('idle')
    setSession(null)
    setQuestions([])
    setIndex(0)
    setSelectedIndex(null)
    setFeedback(null)
    setFinalResult(null)
    setError(null)
  }

  if (phase === 'idle') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-accent" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Practice mode
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Interview practice questions
            </h2>
          </div>
        </div>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Get 10 multiple-choice questions tailored to your profile — a mix of
          technical questions based on your skills and behavioral questions.
          Pick the best answer and get instant grading with an explanation.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                difficulty === d
                  ? 'border-accent bg-accent/10 text-ink'
                  : 'border-ink/15 text-ink-soft hover:border-ink/30',
              )}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button
          type="button"
          onClick={() => void handleStart()}
          disabled={loading}
          className="mt-6 h-11 px-6"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start practice'}
        </Button>
      </div>
    )
  }

  if (phase === 'complete' && finalResult) {
    const band =
      finalResult.percent >= 80
        ? 'Excellent'
        : finalResult.percent >= 60
          ? 'Good'
          : finalResult.percent >= 40
            ? 'Needs practice'
            : 'Keep practicing'
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-accent" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Practice complete
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Your results
            </h2>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-ink/10 bg-paper p-6 text-center">
          <p className="font-mono text-5xl font-semibold tracking-tight text-ink">
            {finalResult.scoreSum}
            <span className="text-2xl text-ink-soft">
              /{finalResult.totalQuestions * 10}
            </span>
          </p>
          <p className="mt-2 font-mono text-sm uppercase tracking-[0.12em] text-accent">
            {finalResult.percent}% — {band}
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="button" onClick={handleNewSession} className="h-11 px-6">
            New session
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="h-11 px-6"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  const scoreColor = (s: number) =>
    s >= 8 ? 'text-accent' : s >= 5 ? 'text-yellow-600' : 'text-danger'

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Practice — {session?.difficulty}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Question {index + 1} of {questions.length}
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-ink-soft">
            Score: {session?.scoreSum ?? 0}
          </p>
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>
      <div className="mt-6 flex-1 overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-4 sm:p-6">
        {current && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
                  current.type === 'technical'
                    ? 'bg-accent/15 text-ink'
                    : 'bg-ink/10 text-ink-soft',
                )}
              >
                {current.type}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                #{current.seq}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink">{current.prompt}</p>
            {!feedback ? (
              <div className="mt-4 space-y-3">
                <div className="space-y-2" role="radiogroup" aria-label="Answer options">
                  {current.options.map((option, i) => {
                    const letter = String.fromCharCode(65 + i)
                    return (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={selectedIndex === i}
                        onClick={() => setSelectedIndex(i)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm leading-relaxed transition-colors',
                          selectedIndex === i
                            ? 'border-accent bg-accent/5 text-ink'
                            : 'border-ink/15 bg-surface text-ink hover:border-ink/30',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-medium',
                            selectedIndex === i
                              ? 'border-accent bg-accent text-surface'
                              : 'border-ink/25 text-ink-soft',
                          )}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    )
                  })}
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button
                  type="button"
                  onClick={() => void handleSubmitAnswer()}
                  disabled={loading || selectedIndex === null}
                  className="h-10 px-5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Submit answer'
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div
                  className={cn(
                    'rounded-xl border p-4',
                    feedback.correct
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-danger/30 bg-danger/5',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {feedback.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )}
                    <span
                      className={cn(
                        'font-mono text-lg font-semibold',
                        scoreColor(feedback.score),
                      )}
                    >
                      {feedback.correct ? 'Correct' : 'Wrong'} — {feedback.score}/10
                    </span>
                  </div>
                  {!feedback.correct && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      Correct answer:{' '}
                      <span className="font-medium text-ink">
                        {String.fromCharCode(65 + feedback.correctIndex)}.{' '}
                        {current.options[feedback.correctIndex]}
                      </span>
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {feedback.explanation}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="h-10 px-5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : index + 1 < questions.length ? (
                    'Next question'
                  ) : (
                    'Finish'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: 'chat' | 'practice'
  onModeChange: (m: 'chat' | 'practice') => void
}) {
  return (
    <div className="mt-3 flex gap-1 rounded-lg border border-ink/10 bg-surface p-0.5">
      {(['chat', 'practice'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onModeChange(m)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            mode === m
              ? 'bg-paper text-ink shadow-sm'
              : 'text-ink-soft hover:text-ink',
          )}
        >
          {m === 'chat' ? 'Chat' : 'Practice'}
        </button>
      ))}
    </div>
  )
}

export function ChatView({ userId, onNavigate = () => {} }: ChatViewProps) {
  const [mode, setMode] = useState<'chat' | 'practice'>('chat')
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [profileRequired, setProfileRequired] = useState(false)
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
        setMessages(history.map((m) => ({ ...m, localId: m.id })))
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
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSendError(false)
    setProfileRequired(false)

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
    } catch (err) {
      if (err instanceof Error && err.message === 'profile-required') {
        setProfileRequired(true)
        setMessages((prev) =>
          prev.filter((m) => m.localId !== userMessage.localId),
        )
        setInput(text)
      } else {
        setSendError(true)
        setMessages((prev) =>
          prev.filter((m) => m.localId !== userMessage.localId),
        )
        setInput(text)
      }
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

  if (loading && mode === 'chat') {
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
          Couldn't load your conversation.
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

  if (profileRequired && mode === 'chat') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-accent" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Placement assistant
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Complete your placement profile first
            </h2>
          </div>
        </div>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Your profile powers the eligibility answers, chat context, and
          practice questions. Fill it in once and everything works.
        </p>
        <Button
          type="button"
          onClick={() => onNavigate('profile')}
          className="mt-6 h-11 px-6"
        >
          Go to profile
        </Button>
      </div>
    )
  }

  if (mode === 'practice') {
    return (
      <>
        <ModeToggle mode={mode} onModeChange={setMode} />
        <PracticeMode onNavigate={onNavigate} />
      </>
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

      <ModeToggle mode={mode} onModeChange={setMode} />

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-4 sm:p-6">
        {messages.length === 0 && !sendError && !profileRequired ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-8 w-8 text-accent" />
            <p className="max-w-sm text-sm text-ink-soft">
              Ask things like "Am I eligible for TCS?" or "Which companies can
              I apply to?" — answers are grounded in your profile and the
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
                      ? 'rounded-br-sm bg-ink text-surface'
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

        {profileRequired && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-sm text-ink">
              Complete your placement profile first — it powers the eligibility answers.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => onNavigate('profile')}
              className="h-8 shrink-0 px-3 text-xs"
            >
              Go to profile
            </Button>
          </div>
        )}

        {sendError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">
              Couldn't reach the assistant. Your message is back in the box —
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
