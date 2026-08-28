import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X, Mail, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '@/lib/auth-validation'
import {
  signUpWithEmail,
  signInWithPassword,
  sendPasswordResetEmail,
  updatePasswordFromRecovery,
} from '@/lib/auth-flow'
import { cn } from '@/lib/utils'

type AuthMode = 'signin' | 'create' | 'forgot' | 'recovery'

interface LoginPanelProps {
  /** Whether the sign-in modal is open. */
  open: boolean
  /** Called when the modal should open or close. */
  onOpenChange: (open: boolean) => void
  /** True while a PASSWORD_RECOVERY session is active — show the new-password form. */
  isRecovery?: boolean
}

/**
 * LoginPanel — email + password sign-in (authwave).
 *
 * Sign in / Create account tabs, a minimal forgot-password flow, and a
 * recovery view (new password) shown when the user follows a reset link
 * (PASSWORD_RECOVERY event surfaced via useAuthSession). All Supabase calls go
 * through `src/lib/auth-flow.ts` — this component never touches
 * `supabase.auth.*` directly. Modal a11y: focus trap, Escape to close, focus
 * restore on close.
 */
export function LoginPanel({
  open,
  onOpenChange,
  isRecovery = false,
}: LoginPanelProps) {
  const reduce = useReducedMotion()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  // Focus management: remember the trigger, focus the modal, trap Tab,
  // restore focus on close (UploadZone paste-dialog precedent).
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // A recovery session arriving (user followed a reset link) forces the
  // new-password view regardless of the current mode.
  useEffect(() => {
    if (isRecovery) {
      setMode('recovery')
      setError(null)
      setSent(false)
    }
  }, [isRecovery])

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null
      // Reset to the sign-in form on each fresh open (unless recovering).
      if (!isRecovery) {
        setMode('signin')
        setError(null)
        setSent(false)
        setPassword('')
        setConfirm('')
      }
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
    // Restore focus to whatever opened the modal (Escape or backdrop close).
    triggerRef.current?.focus()
  }, [open, isRecovery])

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

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setSent(false)
    setPassword('')
    setConfirm('')
  }

  const handleSignIn = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    const passError = validatePassword(password)
    if (passError) {
      setError(passError)
      return
    }
    setBusy(true)
    setError(null)
    const { error: authError } = await signInWithPassword(
      email.trim(),
      password,
    )
    setBusy(false)
    if (authError) {
      setError(authError)
      return
    }
    toast.success('Signed in — welcome back.')
    onOpenChange(false)
  }

  const handleCreate = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    const passError = validatePassword(password)
    if (passError) {
      setError(passError)
      return
    }
    const confirmError = validatePasswordConfirm(password, confirm)
    if (confirmError) {
      setError(confirmError)
      return
    }
    setBusy(true)
    setError(null)
    const { error: authError } = await signUpWithEmail(email.trim(), password)
    setBusy(false)
    if (authError) {
      setError(authError)
      return
    }
    toast.success('Account created — you\'re signed in.')
    onOpenChange(false)
  }

  const handleForgot = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    setBusy(true)
    setError(null)
    const { error: authError } = await sendPasswordResetEmail(email.trim())
    setBusy(false)
    if (authError) {
      setError(authError)
      return
    }
    setSent(true)
  }

  const handleRecovery = async () => {
    const passError = validatePassword(password)
    if (passError) {
      setError(passError)
      return
    }
    const confirmError = validatePasswordConfirm(password, confirm)
    if (confirmError) {
      setError(confirmError)
      return
    }
    setBusy(true)
    setError(null)
    const { error: authError } = await updatePasswordFromRecovery(password)
    setBusy(false)
    if (authError) {
      setError(authError)
      return
    }
    toast.success('Password updated — you\'re signed in.')
    onOpenChange(false)
  }

  const title =
    mode === 'create'
      ? 'Create account'
      : mode === 'forgot'
        ? 'Reset password'
        : mode === 'recovery'
          ? 'Set a new password'
          : 'Sign in'

  const subtitle =
    mode === 'create'
      ? 'email + password · instant access'
      : mode === 'forgot'
        ? 'we\'ll email you a reset link'
        : mode === 'recovery'
          ? 'choose a new password'
          : 'email + password · stay signed in'

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
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-6 elev-raised"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="login-title"
                  className="font-display text-lg font-semibold text-ink"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  {subtitle}
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

            {/* Sign in / Create account tabs (hidden in forgot/recovery views) */}
            {mode !== 'forgot' && mode !== 'recovery' && (
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-hairline bg-surface p-1"
              >
                {(
                  [
                    ['signin', 'Sign in'],
                    ['create', 'Create account'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    id={`login-tab-${m}`}
                    aria-selected={mode === m}
                    aria-controls="login-tabpanel"
                    onClick={() => switchMode(m)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                      mode === m
                        ? 'bg-ink text-surface'
                        : 'text-ink-soft hover:text-ink',
                    )}
                  >
                    {m === 'signin' ? (
                      <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div
              id="login-tabpanel"
              role="tabpanel"
              aria-labelledby={`login-tab-${mode === 'create' ? 'create' : 'signin'}`}
              className="mt-5"
            >
              {mode === 'forgot' && sent ? (
                <div className="text-sm text-ink-soft">
                  <p className="font-medium text-ink">Check your email.</p>
                  <p className="mt-1">
                    We sent a reset link to <span className="font-mono">{email.trim()}</span>.
                    Follow it to choose a new password.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="mt-4 text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  {mode !== 'recovery' && (
                    <>
                      <label
                        htmlFor="login-email"
                        className="text-[13px] text-muted"
                      >
                        Email address
                      </label>
                      <Input
                        ref={firstFieldRef}
                        id="login-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (mode === 'forgot') void handleForgot()
                            else if (mode === 'signin') void handleSignIn()
                            else void handleCreate()
                          }
                        }}
                        aria-label="Email address"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'login-error' : undefined}
                        placeholder="you@example.com"
                        className="mt-1.5 h-10"
                      />
                    </>
                  )}

                  {mode !== 'forgot' && (
                    <>
                      <label
                        htmlFor="login-password"
                        className="mt-4 block text-[13px] text-muted"
                      >
                        Password
                      </label>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete={
                          mode === 'create' ? 'new-password' : 'current-password'
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (mode === 'recovery') void handleRecovery()
                            else if (mode === 'signin') void handleSignIn()
                            else void handleCreate()
                          }
                        }}
                        aria-label="Password"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'login-error' : undefined}
                        placeholder="••••••••"
                        className="mt-1.5 h-10"
                      />
                    </>
                  )}

                  {(mode === 'create' || mode === 'recovery') && (
                    <>
                      <label
                        htmlFor="login-confirm"
                        className="mt-4 block text-[13px] text-muted"
                      >
                        Confirm password
                      </label>
                      <Input
                        id="login-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (mode === 'recovery') void handleRecovery()
                            else void handleCreate()
                          }
                        }}
                        aria-label="Confirm password"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'login-error' : undefined}
                        placeholder="••••••••"
                        className="mt-1.5 h-10"
                      />
                    </>
                  )}

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
                    disabled={busy}
                    onClick={() => {
                      if (mode === 'forgot') void handleForgot()
                      else if (mode === 'recovery') void handleRecovery()
                      else if (mode === 'signin') void handleSignIn()
                      else void handleCreate()
                    }}
                    className="mt-4 h-10 w-full"
                  >
                    {busy
                      ? 'Please wait…'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : mode === 'recovery'
                          ? 'Set new password'
                          : mode === 'signin'
                            ? 'Sign in'
                            : 'Create account'}
                  </Button>

                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="mt-3 w-full text-center text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}