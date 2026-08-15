/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Env gate for the optional LLM feedback tier (Todo 5.1).
   * Off by default; set `VITE_ENABLE_LLM=true` to enable.
   */
  readonly VITE_ENABLE_LLM?: string
  /**
   * Supabase project URL (Wave 2). Set in `.env.local` after provisioning.
   */
  readonly VITE_SUPABASE_URL?: string
  /**
   * Supabase anon (public) key (Wave 2). Set in `.env.local` after provisioning.
   */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
