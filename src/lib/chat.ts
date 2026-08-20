/**
 * Placement chatbot client (T3.2) — thin wrapper around `/api/chat`.
 *
 * `postChatMessage` POSTs the user's message with the Supabase session JWT in
 * the Authorization header (the server authenticates it). `loadConversation`
 * reads the user's chat history via the anon-key client — RLS scopes rows to
 * the signed-in user.
 */
import { getSupabase } from '@/lib/supabase'
import type { ChatMessage, EligibilityResult } from '@/lib/placement-types'

export interface ChatReply {
  reply: string
  eligibility: EligibilityResult[] | null
}

const CHAT_URL = '/api/chat'
const CLIENT_TIMEOUT_MS = 10_000

/**
 * POST a message to the placement chatbot. Throws on any failure — callers
 * render a friendly fallback with a retry affordance.
 */
export async function postChatMessage(message: string): Promise<ChatReply> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Not signed in')
  }

  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Chat request failed with status ${res.status}`)
    }
    return (await res.json()) as ChatReply
  } finally {
    globalThis.clearTimeout(timer)
  }
}

/** Load the signed-in user's conversation, oldest first. */
export async function loadConversation(): Promise<ChatMessage[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}