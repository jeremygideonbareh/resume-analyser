import { afterEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, supabaseConfig } = vi.hoisted(() => ({
  supabaseMock: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
  // When true, getSupabase() throws like it does without .env.local —
  // the config-missing path must degrade gracefully, never crash.
  supabaseConfig: { throwOnGet: false },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => {
    if (supabaseConfig.throwOnGet) {
      throw new Error(
        'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
      )
    }
    return supabaseMock
  },
}))

import * as authFlow from '@/lib/auth-flow'

afterEach(() => {
  vi.clearAllMocks()
  supabaseConfig.throwOnGet = false
})

/** Supabase auth errors carry a human message + optional status. */
function authError(message: string, status?: number) {
  return { error: { message, status } }
}

describe('auth-flow exports (OTP removal)', () => {
  it('no longer exports the OTP functions', () => {
    const flow = authFlow as unknown as Record<string, unknown>
    expect(flow.sendEmailOtp).toBeUndefined()
    expect(flow.verifyEmailOtp).toBeUndefined()
    expect(flow.sendPhoneOtp).toBeUndefined()
    expect(flow.verifyPhoneOtp).toBeUndefined()
  })

  it('exports the email + password functions', () => {
    expect(typeof authFlow.signUpWithEmail).toBe('function')
    expect(typeof authFlow.signInWithPassword).toBe('function')
    expect(typeof authFlow.sendPasswordResetEmail).toBe('function')
    expect(typeof authFlow.updatePasswordFromRecovery).toBe('function')
  })
})

describe('signUpWithEmail', () => {
  it('calls auth.signUp({ email, password }) and resolves with no error on success', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null })
    const result = await authFlow.signUpWithEmail('me@example.com', 'secret123')
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'secret123',
    })
    expect(result).toEqual({ error: null })
  })

  it('maps a duplicate-account error to a user-facing string', async () => {
    supabaseMock.auth.signUp.mockResolvedValue(
      authError('User already registered'),
    )
    const result = await authFlow.signUpWithEmail('me@example.com', 'secret123')
    expect(result.error).toMatch(/already exists/i)
    expect(result.error).toMatch(/sign in instead/i)
  })

  it('maps a rate-limit error to a user-facing string', async () => {
    supabaseMock.auth.signUp.mockResolvedValue(
      authError('Email rate limit exceeded', 429),
    )
    const result = await authFlow.signUpWithEmail('me@example.com', 'secret123')
    expect(result.error).toMatch(/rate limit/i)
  })

  it('degrades gracefully when Supabase is not configured (no .env.local)', async () => {
    supabaseConfig.throwOnGet = true
    const result = await authFlow.signUpWithEmail('me@example.com', 'secret123')
    expect(result.error).toMatch(/set up yet/i)
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled()
  })
})

describe('signInWithPassword', () => {
  it('calls auth.signInWithPassword({ email, password }) and resolves on success', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null })
    const result = await authFlow.signInWithPassword(
      'me@example.com',
      'secret123',
    )
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'secret123',
    })
    expect(result).toEqual({ error: null })
  })

  it('maps invalid credentials to a user-facing string', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue(
      authError('Invalid login credentials'),
    )
    const result = await authFlow.signInWithPassword(
      'me@example.com',
      'wrongpass',
    )
    expect(result.error).toMatch(/incorrect email or password/i)
  })

  it('surfaces a thrown exception as a graceful string', async () => {
    supabaseMock.auth.signInWithPassword.mockRejectedValue(
      new Error('network'),
    )
    const result = await authFlow.signInWithPassword(
      'me@example.com',
      'secret123',
    )
    expect(result.error).toBeTruthy()
  })
})

describe('sendPasswordResetEmail', () => {
  it('calls resetPasswordForEmail with redirectTo = origin + pathname in a browser', async () => {
    // Regression pattern (2026-08-19, live): supabase-js defaults the redirect
    // to window.location.origin alone, which on GitHub Pages lands on the
    // github.io ROOT (404) instead of /resume-analyser/. The recovery link
    // must redirect back to the app so the PASSWORD_RECOVERY event fires.
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const g = globalThis as Record<string, unknown>
    const originalWindow = g.window
    g.window = {
      location: {
        origin: 'https://jeremygideonbareh.github.io',
        pathname: '/resume-analyser/',
      },
    }
    try {
      const result = await authFlow.sendPasswordResetEmail('me@example.com')
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'me@example.com',
        {
          redirectTo: 'https://jeremygideonbareh.github.io/resume-analyser/',
        },
      )
      expect(result).toEqual({ error: null })
    } finally {
      g.window = originalWindow
    }
  })

  it('maps an invalid-token error to a user-facing string', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue(
      authError('Token has expired or is invalid'),
    )
    const result = await authFlow.sendPasswordResetEmail('me@example.com')
    expect(result.error).toMatch(/link/i)
  })
})

describe('updatePasswordFromRecovery', () => {
  it('calls auth.updateUser({ password }) and resolves on success', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null })
    const result = await authFlow.updatePasswordFromRecovery('newpass123')
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      password: 'newpass123',
    })
    expect(result).toEqual({ error: null })
  })

  it('maps a short-password error to a user-facing string', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue(
      authError('Password should be at least 6 characters'),
    )
    const result = await authFlow.updatePasswordFromRecovery('short')
    expect(result.error).toMatch(/at least 6 characters/i)
  })
})