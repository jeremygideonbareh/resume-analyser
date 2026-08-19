import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

/**
 * Session state (Todo 2.4).
 *
 * `useAuthSession()` wraps `supabase.auth.onAuthStateChange` so components
 * never touch `supabase.auth.*` directly. Persisted via Supabase's default
 * token storage (localStorage) — reloads restore the session automatically.
 *
 * When `.env.local` is missing (Supabase not configured) the hook degrades to
 * signed-out without crashing (Todo 2.3 lesson: getSupabase() throws — it must
 * be caught, never escape as a page error).
 */

export type AuthUser = {
  id: string
  email: string | null
  phone: string | null
}

export type AuthSession = {
  session: Session | null
  user: AuthUser | null
  /** True while a PASSWORD_RECOVERY session is active (reset-password flow). */
  isRecovery: boolean
  signOut: () => Promise<void>
}

/**
 * Masks a sign-in identifier for the header: email → `j***@example.com`,
 * phone → `+44 **** 456` (country code + last 3 digits kept).
 */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim()
  if (!value) return ''

  if (value.includes('@')) {
    const [local = '', ...rest] = value.split('@')
    const domain = rest.join('@')
    if (!local) return `***@${domain}`
    return `${local[0]}***@${domain}`
  }

  // Phone — keep the leading country code and the last 3 digits.
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return '****'
  const lastThree = digits.slice(-3)
  if (value.startsWith('+')) {
    return `+${digits.slice(0, 2)} **** ${lastThree}`
  }
  return `${digits.slice(0, 2)} **** ${lastThree}`
}

function toAuthUser(
  user: { id: string; email?: string | null; phone?: string | null },
): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
  }
}

/** App-level auth session hook — mount once in App, pass down via props. */
export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabase>
    try {
      supabase = getSupabase()
    } catch {
      // Not configured (no .env.local) — stay signed out, no crash.
      return
    }
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // PASSWORD_RECOVERY fires when the user follows a reset-password link —
      // the app shows the new-password form until the password is updated.
      setIsRecovery(event === 'PASSWORD_RECOVERY')
      if (!nextSession?.user) {
        setSession(null)
        setUser(null)
        return
      }
      setUser(toAuthUser(nextSession.user))
      setSession(nextSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut()
    } catch {
      // Not configured — nothing to sign out of.
    }
    setSession(null)
    setUser(null)
    setIsRecovery(false)
  }, [])

  return { session, user, isRecovery, signOut }
}
