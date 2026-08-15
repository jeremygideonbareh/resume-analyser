import { getSupabase } from '@/lib/supabase'

/**
 * Real Supabase OTP auth flow (Todo 2.3).
 *
 * All Supabase calls live here — components never touch `supabase.auth.*`
 * directly (grep-verifiable acceptance criterion). Each function returns
 * `{ error: string | null }`; `null` means success. Supabase error codes are
 * mapped to user-facing strings (rate limit, invalid code, missing SMS
 * provider).
 */

export type AuthResult = { error: string | null }

/** Maps a Supabase auth error to a user-facing string. */
function mapAuthError(
  error: { message?: string; status?: number },
  context: 'email' | 'phone',
): string {
  const message = (error.message ?? '').toLowerCase()
  const status = error.status

  // Missing SMS provider — phone OTP can't be delivered without one.
  if (
    context === 'phone' &&
    (message.includes('sms_provider') ||
      message.includes('provider') ||
      status === 422)
  ) {
    return 'Phone sign-in needs an SMS provider — use email for now.'
  }

  // Rate limiting (Supabase: 429 or "rate limit" messaging).
  if (status === 429 || message.includes('rate limit')) {
    return 'Too many requests — you\'ve hit the rate limit. Wait a minute and try again.'
  }

  // Invalid / expired OTP code.
  if (
    message.includes('token') ||
    message.includes('expired') ||
    message.includes('invalid')
  ) {
    return 'That code didn\'t work — check it and try again.'
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
  context: 'email' | 'phone',
): Promise<AuthResult> {
  try {
    const { error } = await action()
    if (error) return { error: mapAuthError(error, context) }
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

/** Sends a 6-digit OTP to an email address via Supabase. */
export function sendEmailOtp(email: string): Promise<AuthResult> {
  return handle(() => getSupabase().auth.signInWithOtp({ email }), 'email')
}

/** Sends a 6-digit OTP to a phone number via Supabase. */
export function sendPhoneOtp(phone: string): Promise<AuthResult> {
  return handle(() => getSupabase().auth.signInWithOtp({ phone }), 'phone')
}

/** Verifies an email OTP code. */
export function verifyEmailOtp(
  email: string,
  token: string,
): Promise<AuthResult> {
  return handle(
    () => getSupabase().auth.verifyOtp({ email, token, type: 'email' }),
    'email',
  )
}

/** Verifies a phone (SMS) OTP code. */
export function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<AuthResult> {
  return handle(
    () => getSupabase().auth.verifyOtp({ phone, token, type: 'sms' }),
    'phone',
  )
}
