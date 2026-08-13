/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Env gate for the optional LLM feedback tier (Todo 5.1).
   * Off by default; set `VITE_ENABLE_LLM=true` to enable.
   */
  readonly VITE_ENABLE_LLM?: string
}
