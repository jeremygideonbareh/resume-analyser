import { afterEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, supabaseConfig } = vi.hoisted(() => ({
  supabaseMock: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
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

import {
  sendEmailOtp,
  sendPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
} from '@/lib/auth-flow'

afterEach(() => {
  vi.clearAllMocks()
  supabaseConfig.throwOnGet = false
})

/** Supabase auth errors carry a human message + optional status. */
function authError(message: string, status?: number) {
  return { error: { message, status } }
}

describe('sendEmailOtp', () => {
  it('calls signInWithOtp({ email }) and resolves with no error on success', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: null })
    const result = await sendEmailOtp('me@example.com')
    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
    })
    expect(result).toEqual({ error: null })
  })

  it('passes emailRedirectTo = origin + pathname in a browser (GitHub Pages fix)', async () => {
    // Regression (2026-08-19, live): supabase-js defaults the magic-link
    // redirect to window.location.origin alone, which on GitHub Pages lands on
    // the github.io ROOT (404 "Site not found") instead of /resume-analyser/.
    // The fix pins emailRedirectTo to origin + pathname so the link lands on
    // the app and the session in the URL hash is detected.
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: null })
    const g = globalThis as Record<string, unknown>
    const originalWindow = g.window
    g.window = {
      location: {
        origin: 'https://jeremygideonbareh.github.io',
        pathname: '/resume-analyser/',
      },
    }
    try {
      const result = await sendEmailOtp('me@example.com')
      expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'me@example.com',
        options: {
          emailRedirectTo: 'https://jeremygideonbareh.github.io/resume-analyser/',
        },
      })
      expect(result).toEqual({ error: null })
    } finally {
      g.window = originalWindow
    }
  })

  it('maps a Supabase error to a user-facing string', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue(
      authError('Email rate limit exceeded', 429),
    )
    const result = await sendEmailOtp('me@example.com')
    expect(result.error).toMatch(/try again/i)
    expect(result.error).toMatch(/rate/i)
  })

  it('surfaces a thrown exception as a graceful string', async () => {
    supabaseMock.auth.signInWithOtp.mockRejectedValue(new Error('network'))
    const result = await sendEmailOtp('me@example.com')
    expect(result.error).toBeTruthy()
  })

  it('degrades gracefully when Supabase is not configured (no .env.local)', async () => {
    // Regression: getSupabase() used to throw OUTSIDE the try/catch (it was
    // evaluated as handle()'s argument), escaping as an uncaught page error.
    supabaseConfig.throwOnGet = true
    const result = await sendEmailOtp('me@example.com')
    expect(result.error).toMatch(/set up yet/i)
    expect(supabaseMock.auth.signInWithOtp).not.toHaveBeenCalled()
  })
})

describe('sendPhoneOtp', () => {
  it('calls signInWithOtp({ phone }) and resolves with no error on success', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: null })
    const result = await sendPhoneOtp('+447911123456')
    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+447911123456',
    })
    expect(result).toEqual({ error: null })
  })

  it('returns the graceful SMS-provider message when the provider is missing', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue(
      authError('sms_provider disabled', 422),
    )
    const result = await sendPhoneOtp('+447911123456')
    expect(result.error).toMatch(/SMS provider/i)
    expect(result.error).toMatch(/use email for now/i)
  })

  it('surfaces other Supabase errors as user-facing strings', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue(
      authError('Phone rate limit exceeded', 429),
    )
    const result = await sendPhoneOtp('+447911123456')
    expect(result.error).toMatch(/try again/i)
  })
})

describe('verifyEmailOtp', () => {
  it('calls verifyOtp({ email, token, type: "email" }) and resolves on success', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({ error: null })
    const result = await verifyEmailOtp('me@example.com', '123456')
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      token: '123456',
      type: 'email',
    })
    expect(result).toEqual({ error: null })
  })

  it('maps an invalid-token error to a user-facing string', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue(
      authError('Token has expired or is invalid'),
    )
    const result = await verifyEmailOtp('me@example.com', '999999')
    expect(result.error).toMatch(/code/i)
  })
})

describe('verifyPhoneOtp', () => {
  it('calls verifyOtp({ phone, token, type: "sms" }) and resolves on success', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({ error: null })
    const result = await verifyPhoneOtp('+447911123456', '123456')
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+447911123456',
      token: '123456',
      type: 'sms',
    })
    expect(result).toEqual({ error: null })
  })

  it('maps an invalid-token error to a user-facing string', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue(
      authError('Token has expired or is invalid'),
    )
    const result = await verifyPhoneOtp('+447911123456', '999999')
    expect(result.error).toMatch(/code/i)
  })
})