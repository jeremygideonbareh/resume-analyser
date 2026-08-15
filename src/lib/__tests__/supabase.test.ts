import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ __mockClient: true })),
}))

import { createClient } from '@supabase/supabase-js'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

/** Re-import the module so `import.meta.env` gates are evaluated fresh. */
async function loadSupabase() {
  vi.resetModules()
  return await import('@/lib/supabase')
}

const mockedCreateClient = vi.mocked(createClient)

describe('getSupabase', () => {
  it('throws a clear error when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const supabase = await loadSupabase()
    expect(() => supabase.getSupabase()).toThrow(
      /VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY/,
    )
  })

  it('creates the client with the configured URL and anon key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdef.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123')
    const supabase = await loadSupabase()
    const client = supabase.getSupabase()
    expect(mockedCreateClient).toHaveBeenCalledWith(
      'https://abcdef.supabase.co',
      'anon-key-123',
    )
    expect(client).toBeDefined()
  })

  it('returns the same singleton instance on repeated calls', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdef.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123')
    const supabase = await loadSupabase()
    const a = supabase.getSupabase()
    const b = supabase.getSupabase()
    expect(a).toBe(b)
    expect(mockedCreateClient).toHaveBeenCalledTimes(1)
  })
})