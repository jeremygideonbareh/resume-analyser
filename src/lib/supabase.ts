import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Returns the single Supabase client for the app.
 *
 * Module-level singleton: repeated calls return the same instance. Throws a
 * clear error when the env vars are missing, so misconfiguration fails fast
 * at the call site instead of silently sending anonymous requests.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
    )
  }

  client = createClient(url, anonKey)
  return client
}
