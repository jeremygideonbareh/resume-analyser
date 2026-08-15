import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateEmail, validatePhone } from '@/lib/auth-validation'
import {
  sendEmailOtp,
  sendPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
} from '@/lib/auth-flow'
import { cn } from '@/lib/utils'

type AuthTab = 'email' | 'phone'
type AuthStep = 'identifier' | 'otp'

interface LoginPanelProps {
  /** Whether the sign-in modal is open. */
  open: boolean
  /** Called when the modal should open or close. */
  onOpenChange: (open: boolean) => void
}

/**
 * LoginPanel — real Supabase OTP sign-in (Todo 2.3).
 *
 * Email or phone → Supabase sends a 6-digit code → verify → session established
 * (Todo 2.4 reads it via onAuthStateChange). All Supabase calls go through
 * `src/lib/auth-flow.ts` — this component never touches `supabase.auth.*`
 * directly. Modal a11y: focus trap, Escape to close, focus restore on close.
 */
export function LoginPanel({ open, onOpenChange }: LoginPanelProps) {
  const reduce = useReducedMotion()

  const [tab, setTab] = useState<AuthTab>('email')
  const [step, setStep] = useState<AuthStep>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Focus management: remember the trigger, focus the modal, trap Tab,
  // restore focus on close (UploadZone paste-dialog precedent).
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null
      // Reset to identifier step on each fresh open.
      setStep('identifier')
      setError(null)
      setCode('')
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
    // Restore focus to whatever opened the modal (Escape or backdrop close).
    triggerRef.current?.focus()
  }, [open])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onOpenChange(false)
      return
    }
    if (event.key !== 'Tab') return
    // Simple focus trap: cycle between the first and last focusable elements.
    const panel = panelRef.current
    if (!panel) return
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled'))
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const switchTab = (next: AuthTab) => {
    setTab(next)
    setStep('identifier')
    setError(null)
    setCode('')
  }

  const validate = (value: string): string | null =>
    tab === 'email' ? validateEmail(value) : validatePhone(value)

  const handleSendCode = async () => {
    const validationError = validate(identifier)
    if (validationError) {
      setError(validationError)
      return
    }
    setSending(true)
    setError(null)
    const { error: sendError } =
      tab === 'email'
        ? await sendEmailOtp(identifier.trim())
        : await sendPhoneOtp(identifier.trim())
    setSending(false)
    if (sendError) {
      setError(sendError)
      return
    }
    setStep('otp')
    toast.success('Check your inbox for a 6-digit code.')
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from the message.')
      return
    }
    setVerifying(true)
    setError(null)
    const { error: verifyError } =
      tab === 'email'
        ? await verifyEmailOtp(identifier.trim(), code)
        : await verifyPhoneOtp(identifier.trim(), code)
    setVerifying(false)
    if (verifyError) {
      setError(verifyError)
      return
    }
    toast.success('Signed in — welcome back.')
    onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={reduce ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false)
          }}
        >
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={
              reduce ? false : { opacity: 0, y: 12, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            className="w-full max-w-sm rounded-xl border border-ink/10 bg-paper p-6 shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="login-title"
                  className="font-display text-lg font-semibold text-ink"
                >
                  Sign in
                </h2>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  code sign-in · no password
                </p>
              </div>
              <button
                type="button"
                aria-label="Close sign-in"
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Email / Phone tabs */}
            <div
              role="tablist"
              aria-label="Sign-in method"
              className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-ink/10 bg-surface p-1"
            >
              {(['email', 'phone'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`login-tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls="login-tabpanel"
                  onClick={() => switchTab(t)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                    tab === t
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {t === 'email' ? (
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  {t === 'email' ? 'Email' : 'Phone'}
                </button>
              ))}
            </div>

            <div
              id="login-tabpanel"
              role="tabpanel"
              aria-labelledby={`login-tab-${tab}`}
              className="mt-5"
            >
              {step === 'identifier' ? (
                <>
                  <label
                    htmlFor="login-identifier"
                    className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                  >
                    {tab === 'email'
                      ? 'Email address'
                      : 'Phone number (E.164)'}
                  </label>
                  <Input
                    ref={firstFieldRef}
                    id="login-identifier"
                    type={tab === 'email' ? 'email' : 'tel'}
                    inputMode={tab === 'email' ? 'email' : 'tel'}
                    autoComplete={tab === 'email' ? 'email' : 'tel'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSendCode()
                    }}
                    aria-label={
                      tab === 'email'
                        ? 'Email address'
                        : 'Phone number in E.164 format'
                    }
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                    placeholder={
                      tab === 'email'
                        ? 'you@example.com'
                        : '+44 7911 123456'
                    }
                    className="mt-1.5 h-10"
                  />
                  <p className="mt-1.5 font-mono text-[11px] text-muted">
                    We&apos;ll send you a one-time 6-digit code.
                  </p>
                  {error && (
                    <p
                      id="login-error"
                      role="alert"
                      className="mt-2 text-xs text-danger"
                    >
                      {error}
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSendCode()}
                    className="mt-4 h-10 w-full"
                  >
                    {sending ? 'Sending code…' : 'Send code'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    Check{' '}
                    {tab === 'email'
                      ? 'your inbox'
                      : 'your phone'}{' '}
                    for a 6-digit code.
                  </p>
                  <label
                    htmlFor="login-code"
                    className="mt-4 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                  >
                    Verification code
                  </label>
                  <Input
                    id="login-code"
                    ref={firstFieldRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleVerify()
                    }}
                    aria-label="6-digit verification code"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                    placeholder="••••••"
                    className="mt-1.5 h-10 text-center font-mono text-lg tracking-[0.3em]"
                  />
                  {error && (
                    <p
                      id="login-error"
                      role="alert"
                      className="mt-2 text-xs text-danger"
                    >
                      {error}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('identifier')
                        setError(null)
                        setCode('')
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                    >
                      ← Change {tab === 'email' ? 'email' : 'phone'}
                    </button>
                    <Button
                      type="button"
                      disabled={verifying || code.length !== 6}
                      onClick={() => void handleVerify()}
                      className="h-10"
                    >
                      {verifying ? 'Verifying…' : 'Verify code'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
