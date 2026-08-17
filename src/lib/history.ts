import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisResult } from './analysis'
import type { ParsedResume } from './parsing'

/**
 * Todo 3.3 — per-user analysis history persistence.
 *
 * Thin, client-scoped wrapper around supabase-js for the `resume_analyses`
 * table. The client passed in is ALWAYS the anon-key client from
 * `getSupabase()` — there is deliberately no service-role path here; the
 * RLS policies on the table are the server-side guarantee that a user can
 * only ever read/write/delete their own rows (select/insert/delete where
 * `user_id = auth.uid()`).
 *
 * Privacy-maximal: only metrics + filename are persisted. RAW RESUME TEXT IS
 * NEVER STORED for any user — `saveAnalysis` receives `parsed` solely for its
 * `filename`/`format` metadata and never touches `parsed.text`.
 */

export interface AnalysisHistoryRow {
  id: string
  user_id: string
  created_at: string
  filename: string
  format: string
  score: number
  section_scores: Record<string, number>
  skills: string[]
  keyword_match: { present: string[]; missing: string[] } | null
}

type HistoryClient = Pick<SupabaseClient, 'from'>

function sectionScores(result: AnalysisResult): Record<string, number> {
  return Object.fromEntries(result.breakdown.map((b) => [b.id, b.earned]))
}

/**
 * Persist one analysis as a history row (metrics + filename only). Resolves
 * with the inserted row; rejects on any error (including RLS denial).
 */
export async function saveAnalysis(
  client: HistoryClient,
  userId: string,
  result: AnalysisResult,
  parsed: ParsedResume,
): Promise<AnalysisHistoryRow> {
  const { data, error } = await client
    .from('resume_analyses')
    .insert({
      user_id: userId,
      filename: parsed.filename,
      format: parsed.format,
      score: result.score,
      section_scores: sectionScores(result),
      skills: result.skills,
      keyword_match:
        result.presentKeywords.length > 0 || result.missingKeywords.length > 0
          ? { present: result.presentKeywords, missing: result.missingKeywords }
          : null,
    })
    .select()
    .single()
  if (error) throw error
  return data as AnalysisHistoryRow
}

/** Load a user's history, newest first. */
export async function loadHistory(
  client: HistoryClient,
  userId: string,
): Promise<AnalysisHistoryRow[]> {
  const { data, error } = await client
    .from('resume_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AnalysisHistoryRow[]
}

/** Delete one row, scoped to BOTH the row id and the owning user id. */
export async function deleteAnalysis(
  client: HistoryClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('resume_analyses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
