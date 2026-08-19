import { getSupabase } from '@/lib/supabase'

/**
 * Real Supabase email + password auth flow (authwave).
 *
 * All Supabase calls live here — components never touch `supabase.auth.*`
 * directly (grep-verifiable acceptance criterion). Each function returns
 * `{ error: string | null }`; `null` means success. Supabase error codes are
 * mapped to user-facing strings (rate limit, duplicate account, bad
 * credentials).
 *
 * Sessions persist via Supabase's default token storage (localStorage) — a
 * signed-in user stays signed in across reloads until they log out.
 */

export type AuthResult = { error: string | null }

/** Maps a Supabase auth error to a user-facing string. */
function mapAuthError(error: { message?: string; status?: number }): string {
  const message = (error.message ?? '').toLowerCase()
  const status = error.status

  // Rate limiting (Supabase: 429 or "rate limit" messaging).
  if (status === 429 || message.includes('rate limit')) {
    return 'Too many requests — you\'ve hit the rate limit. Wait a minute and try again.'
  }

  // Duplicate account on sign-up.
  if (
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'An account with that email already exists — sign in instead.'
  }

  // Bad credentials on sign-in.
  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'Incorrect email or password.'
  }

  // Password too short (Supabase default minimum is 6).
  if (message.includes('password should be at least')) {
    return 'Password must be at least 6 characters.'
  }

  // Invalid / expired recovery token.
  if (
    message.includes('token') ||
    message.includes('expired') ||
    message.includes('invalid')
  ) {
    return 'That link didn\'t work — request a new one and try again.'
  }

  return 'Something went wrong — please try again.'
}

/** Message shown when Supabase env keys are missing (.env.local not present). */
const CONFIG_MESSAGE =
  'Sign-in isn\'t set up yet — add your Supabase keys to get started.'

async function handle(
  action: () => Promise<{
    error: { message?: string; status?: number } | null
  }>,
): Promise<AuthResult> {
  try {
    const { error } = await action()
    if (error) return { error: mapAuthError(error) }
    return { error: null }
  } catch (err) {
    // Config missing (getSupabase threw) — tell the user setup is incomplete.
    const raw = err instanceof Error ? err.message.toLowerCase() : ''
    if (raw.includes('not configured') || raw.includes('env.local')) {
      return { error: CONFIG_MESSAGE }
    }
    // Network / unexpected failure — never surface raw Supabase internals.
    return { error: 'Something went wrong — please try again.' }
  }
}

/**
 * Creates an account and signs in immediately (Supabase `mailer_autoconfirm`
 * is enabled for this project — no confirmation email required).
 */
export function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  return handle(() => getSupabase().auth.signUp({ email, password }))
}

/** Signs in with email + password. */
export function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  return handle(() =>
    getSupabase().auth.signInWithPassword({ email, password }),
  )
}

/**
 * Sends a password-reset email. The recovery link must redirect back to THIS
 * app (origin + pathname), not the bare origin: supabase-js defaults to
 * window.location.origin alone, which on GitHub Pages points at the github.io
 * root (404) instead of /resume-analyser/. Same fix as the magic-link flow
 * (verified live 2026-08-19).
 */
export function sendPasswordResetEmail(email: string): Promise<AuthResult> {
  return handle(() => {
    const options: { redirectTo: string } = {
      redirectTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '',
    }
    return getSupabase().auth.resetPasswordForEmail(email, options)
  })
}

/**
 * Sets a new password from the recovery flow. The app detects the
 * `PASSWORD_RECOVERY` event (via useAuthSession) and shows the new-password
 * form; this completes it.
 */
export function updatePasswordFromRecovery(
  password: string,
): Promise<AuthResult> {
  return handle(() => getSupabase().auth.updateUser({ password }))
}