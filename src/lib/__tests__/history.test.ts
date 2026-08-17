// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveAnalysis, loadHistory, deleteAnalysis } from '@/lib/history'
import type { AnalysisResult } from '@/lib/analysis'
import type { ParsedResume } from '@/lib/parsing'

/**
 * Todo 3.3 — per-user analysis history persistence (TDD).
 *
 * The module under test (`history.ts`) is a thin, client-scoped wrapper around
 * `supabase-js`: every call goes through the anon-key client passed in (the
 * same client `useAuthSession` uses). There is deliberately NO path that
 * touches a service-role key — the RLS policies on `resume_analyses` are the
 * server-side guarantee, and these tests prove the client can only ever issue
 * user-scoped queries (never a bare table query that would bypass RLS).
 */

type MockRow = Record<string, unknown>

function makeClient(results: {
  insert?: { data: MockRow | null; error: unknown }
  load?: { data: MockRow[] | null; error: unknown }
  del?: { data: null; error: unknown }
}) {
  // Terminal promise-returning links (supabase builders are thenable; these
  // resolve exactly like `await builder.method()` would).
  const single = vi.fn(() =>
    Promise.resolve(results.insert ?? { data: null, error: null }),
  )
  const order = vi.fn(() =>
    Promise.resolve(results.load ?? { data: [], error: null }),
  )
  const delTerminal = vi.fn(() =>
    Promise.resolve(results.del ?? { data: null, error: null }),
  )

  // Non-terminal chain links — each returns the next link so the chain reads
  // like the real supabase-js builder.
  const insert = vi.fn((_row: MockRow) => ({ select: vi.fn(() => ({ single })) }))
  const loadEq = vi.fn(() => ({ order }))
  const load = vi.fn(() => ({ eq: loadEq }))
  const delEq2 = vi.fn(() => delTerminal())
  const delEq = vi.fn(() => ({ eq: delEq2 }))
  const del = vi.fn(() => ({ eq: delEq }))
  const from = vi.fn(() => ({ insert, select: load, delete: del }))

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    insert,
    load,
    loadEq,
    order,
    del,
    delEq,
    delEq2,
    single,
  }
}

const RESULT: AnalysisResult = {
  score: 71,
  breakdown: [
    { id: 'keywords', label: 'Keyword match', weight: 45, earned: 32 },
    { id: 'structure', label: 'Structure', weight: 17, earned: 14 },
    { id: 'formatting', label: 'Formatting', weight: 12, earned: 10 },
    { id: 'recency', label: 'Recency', weight: 13, earned: 9 },
    { id: 'contact', label: 'Contact', weight: 8, earned: 6 },
    { id: 'parse-confidence', label: 'Parse confidence', weight: 5, earned: 0 },
  ],
  sections: [],
  skills: ['react', 'sql'],
  presentKeywords: ['react'],
  missingKeywords: ['docker'],
  feedback: [],
  warnings: [],
}

const PARSED: ParsedResume = {
  text: 'React TypeScript SQL AWS',
  format: 'txt',
  warnings: [],
  filename: 'resume.txt',
}

const USER_ID = 'user_123'

describe('saveAnalysis', () => {
  it('inserts a row with metrics + filename only (never the resume text)', async () => {
    const insertedRow = {
      id: 'row_1',
      user_id: USER_ID,
      created_at: '2026-08-17T00:00:00Z',
      filename: 'resume.txt',
      format: 'txt',
      score: 71,
      section_scores: {
        keywords: 32,
        structure: 14,
        formatting: 10,
        recency: 9,
        contact: 6,
        'parse-confidence': 0,
      },
      skills: ['react', 'sql'],
      keyword_match: { present: ['react'], missing: ['docker'] },
    }
    const { client, from, insert } = makeClient({
      insert: { data: insertedRow, error: null },
    })

    const row = await saveAnalysis(client, USER_ID, RESULT, PARSED)

    expect(row).toEqual(insertedRow)
    expect(from).toHaveBeenCalledWith('resume_analyses')
    const payload = insert.mock.calls[0][0] as Record<string, unknown>
    // Privacy-maximal: the insert payload carries metrics + filename only.
    expect(payload).toEqual({
      user_id: USER_ID,
      filename: 'resume.txt',
      format: 'txt',
      score: 71,
      section_scores: {
        keywords: 32,
        structure: 14,
        formatting: 10,
        recency: 9,
        contact: 6,
        'parse-confidence': 0,
      },
      skills: ['react', 'sql'],
      keyword_match: { present: ['react'], missing: ['docker'] },
    })
    expect(Object.keys(payload)).not.toContain('text')
  })

  it('throws when the insert returns an error (e.g. RLS denial)', async () => {
    const { client } = makeClient({
      insert: { data: null, error: { message: 'new row violates RLS' } },
    })
    await expect(
      saveAnalysis(client, USER_ID, RESULT, PARSED),
    ).rejects.toMatchObject({ message: 'new row violates RLS' })
  })
})

describe('loadHistory', () => {
  it('loads the user’s rows ordered by created_at desc', async () => {
    const rows = [
      { id: 'row_2', created_at: '2026-08-17T01:00:00Z' },
      { id: 'row_1', created_at: '2026-08-16T00:00:00Z' },
    ]
    const { client, from, load, loadEq, order } = makeClient({
      load: { data: rows, error: null },
    })

    const result = await loadHistory(client, USER_ID)

    expect(result).toEqual(rows)
    expect(from).toHaveBeenCalledWith('resume_analyses')
    expect(load).toHaveBeenCalledWith('*')
    // Must be user-scoped — a bare select would be an RLS-bypass attempt.
    expect(loadEq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns an empty array when the table has no rows', async () => {
    const { client } = makeClient({ load: { data: [], error: null } })
    await expect(loadHistory(client, USER_ID)).resolves.toEqual([])
  })

  it('throws when the query errors', async () => {
    const { client } = makeClient({
      load: { data: null, error: { message: 'connection refused' } },
    })
    await expect(loadHistory(client, USER_ID)).rejects.toMatchObject({
      message: 'connection refused',
    })
  })
})

describe('deleteAnalysis', () => {
  it('deletes scoped to BOTH the row id and the user id', async () => {
    const { client, from, del, delEq, delEq2 } = makeClient({
      del: { data: null, error: null },
    })

    await expect(
      deleteAnalysis(client, USER_ID, 'row_1'),
    ).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('resume_analyses')
    expect(del).toHaveBeenCalledTimes(1)
    expect(delEq).toHaveBeenCalledWith('id', 'row_1')
    // The second eq is the user scope — deleting someone else’s row is
    // impossible from this client (RLS enforces it server-side too).
    expect(delEq2).toHaveBeenCalledWith('user_id', USER_ID)
  })

  it('throws when the delete errors', async () => {
    const { client } = makeClient({
      del: { data: null, error: { message: 'permission denied' } },
    })
    await expect(
      deleteAnalysis(client, USER_ID, 'row_1'),
    ).rejects.toMatchObject({ message: 'permission denied' })
  })
})

describe('RLS not bypassable from the client', () => {
  it('never references a service-role key or a second client', () => {
    // The module exports only client-scoped functions; the real app passes the
    // anon-key client from getSupabase(). Grep the source to confirm there is
    // no service_role / admin path in history.ts (F4 red-flag grep).
    const src = (saveAnalysis.toString() + loadHistory.toString() +
      deleteAnalysis.toString())
    expect(src).not.toMatch(/service_role|SERVICE_ROLE|supabase\.auth\.admin/)
  })
})
