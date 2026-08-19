// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { maskIdentifier, useAuthSession } from '@/lib/session'

const { supabaseAuthMock, supabaseConfig } = vi.hoisted(() => ({
  supabaseAuthMock: {
    onAuthStateChange: vi.fn(
      // Typed callback param so mock.calls[0][0] is callable (the real
      // supabase-js signature is (callback: AuthChangeCallback) => …).
      // A zero-arg implementation would type mock.calls as [][] and make
      // mock.calls[0][0] an empty-tuple index error under tsc -b.
      (_callback: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
  // When true, getSupabase() throws like it does without .env.local — the
  // hook must degrade to signed-out without crashing (Todo 2.3 lesson).
  supabaseConfig: { throwOnGet: false },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => {
    if (supabaseConfig.throwOnGet) {
      throw new Error(
        'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
      )
    }
    return { auth: supabaseAuthMock }
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  supabaseConfig.throwOnGet = false
})

function fakeUser(overrides: Partial<{ email: string | null; phone: string | null }> = {}) {
  return {
    id: 'user_123',
    email: 'john@example.com',
    phone: null,
    ...overrides,
  }
}

function fakeSession(user = fakeUser()) {
  return {
    access_token: 'a',
    refresh_token: 'r',
    expires_at: 4_102_444_800,
    user,
  }
}

describe('maskIdentifier', () => {
  it('masks an email as first char + *** + domain', () => {
    expect(maskIdentifier('john@example.com')).toBe('j***@example.com')
  })

  it('masks an email with an empty local part without crashing', () => {
    expect(maskIdentifier('@example.com')).toBe('***@example.com')
  })

  it('masks a phone keeping country code + last 3 digits', () => {
    expect(maskIdentifier('+44 7911 123456')).toBe('+44 **** 456')
  })

  it('masks a phone without a leading plus', () => {
    expect(maskIdentifier('07911 123456')).toBe('07 **** 456')
  })

  it('returns **** for a too-short phone', () => {
    expect(maskIdentifier('+1')).toBe('****')
  })

  it('returns empty string for empty input', () => {
    expect(maskIdentifier('')).toBe('')
    expect(maskIdentifier('   ')).toBe('')
  })
})

describe('useAuthSession', () => {
  it('subscribes to onAuthStateChange on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuthSession())
    expect(supabaseAuthMock.onAuthStateChange).toHaveBeenCalledTimes(1)
    unmount()
    const subscription = supabaseAuthMock.onAuthStateChange.mock.results[0]
      ?.value?.data?.subscription
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates user when a session arrives via onAuthStateChange', () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('SIGNED_IN', fakeSession())
    })
    expect(result.current.user).toEqual({
      id: 'user_123',
      email: 'john@example.com',
      phone: null,
    })
    expect(result.current.session).not.toBeNull()
  })

  it('clears user on SIGNED_OUT', () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('SIGNED_IN', fakeSession())
      callback('SIGNED_OUT', null)
    })
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('signOut calls supabase.auth.signOut and clears local state', async () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('SIGNED_IN', fakeSession())
    })
    await act(async () => {
      await result.current.signOut()
    })
    expect(supabaseAuthMock.signOut).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('degrades to signed-out without crashing when Supabase is not configured', () => {
    supabaseConfig.throwOnGet = true
    const { result } = renderHook(() => useAuthSession())
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(supabaseAuthMock.onAuthStateChange).not.toHaveBeenCalled()
  })

  it('signOut swallows errors when Supabase is not configured', async () => {
    supabaseConfig.throwOnGet = true
    const { result } = renderHook(() => useAuthSession())
    await act(async () => {
      await expect(result.current.signOut()).resolves.toBeUndefined()
    })
  })
})

describe('useAuthSession — recovery flag', () => {
  it('sets isRecovery true on the PASSWORD_RECOVERY event', () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('PASSWORD_RECOVERY', fakeSession())
    })
    expect(result.current.isRecovery).toBe(true)
    expect(result.current.user).not.toBeNull()
  })

  it('resets isRecovery false on a later SIGNED_IN event', () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('PASSWORD_RECOVERY', fakeSession())
      callback('SIGNED_IN', fakeSession())
    })
    expect(result.current.isRecovery).toBe(false)
  })

  it('resets isRecovery false on signOut', async () => {
    const { result } = renderHook(() => useAuthSession())
    const callback = supabaseAuthMock.onAuthStateChange.mock.calls[0][0]
    act(() => {
      callback('PASSWORD_RECOVERY', fakeSession())
    })
    await act(async () => {
      await result.current.signOut()
    })
    expect(result.current.isRecovery).toBe(false)
  })
})
