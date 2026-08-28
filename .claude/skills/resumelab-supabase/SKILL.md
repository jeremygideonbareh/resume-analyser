---
name: resumelab-supabase
description: >-
  How Supabase is wired into ResumeLab — the singleton client, the env
  contract, the strict privacy rule (resume text is NEVER persisted), and the
  RLS-first persistence-helper pattern used by history/dashboard code. Use this
  skill whenever you touch auth, sign-in/out, the personal dashboard, analysis
  history, any `src/lib/` file that reads or writes a Supabase table, or any
  `api/` endpoint that uses a service-role key. Also use it before adding a new
  table or a new persisted field — there are hard rules about what may be
  stored and how access is scoped.
---

# ResumeLab + Supabase

Supabase provides **Auth** (email sign-in) and **per-user persistence** for
analysis history + the dashboard. The public app is otherwise zero-upload and
client-only; Supabase is the one place user data lives.

## The client is a lazy singleton

[src/lib/supabase.ts](../../../src/lib/supabase.ts) exports `getSupabase()`.
It builds the client on first call from `import.meta.env.VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY`, caches it, and **throws a descriptive error when
either env var is missing** so misconfiguration fails loudly instead of firing
anonymous requests.

- Always go through `getSupabase()`. Never call `createClient` elsewhere.
- Callers that render UI must wrap `getSupabase()` in `try/catch` and degrade
  to an error state — it throws when `.env.local` is absent (common in fresh
  checkouts and some CI). `src/components/dashboard.tsx` is the reference.
- In tests, never import the real module for logic — build a fake with a
  free-standing `makeClient()` and pass it in (see persistence pattern below).

## Environment contract

Client-safe, required for auth + dashboard (from Supabase Dashboard →
Settings → API):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Server / provisioning only — **never** referenced from `src/` and never
committed:

- `SUPABASE_PAT` (`sbp_…`) — Management API token, used once by the gitignored
  migration script to run DDL. Rotate after setup.
- `SUPABASE_SERVICE_ROLE_KEY` — only inside `api/` endpoints, never bundled.

Full annotated list is in [.env.example](../../../.env.example). `.env.local`
is gitignored; `npm run secrets:check` and `npm run secrets:sync` manage the
Vercel runtime store.

## Privacy rule — non-negotiable

**Resume text is never sent to Supabase, never logged, never persisted.**
Signed-in analyses save *metrics + filename only* (score, category breakdown,
detected skills, `parsed.filename`). Guests save nothing and produce no toast
and no console noise.

When you add or change anything that writes a row:

- The insert payload must have **no `text` key** and no field derived from the
  resume body. Existing tests assert this explicitly (`expect(payload).not.to
  toHaveProperty('text')`) — keep that assertion alive for any new writer.
- The LLM tier (`api/analyze.ts`) likewise uses the resume text for the single
  completion only — no persistence, no logging.

## Persistence-helper pattern (RLS-first)

History/dashboard writers live in `src/lib/` (`history.ts`, `dashboard-data.ts`)
and follow one shape:

- The function takes the client as its **first argument**, typed as the
  narrowest slice it needs, e.g. `type HistoryClient = Pick<SupabaseClient,
  'from'>`. This keeps helpers pure and trivially fakeable.
- It takes `userId` explicitly and **always** scopes queries with
  `.eq('user_id', userId)` on select / update / delete. Do not rely on RLS
  alone — the client-side filter and the RLS policy are defence in depth, and
  the tests assert the `user_id` predicate is present.
- Reads that feed timelines order `created_at` descending and clip to a small
  window (last 7) in the helper, not the DB.
- Dates handed to chart/format code are **date-only strings** (`YYYY-MM-DD`),
  never full ISO timestamps — the formatter anchors to noon and a timestamp
  produces `Invalid Date`.

Test a helper by passing a hand-rolled client:

```ts
function makeClient(result: unknown) {
  const q: any = {
    insert: vi.fn(() => q),
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    then: (r: any) => Promise.resolve(result).then(r), // thenable
  }
  return { from: vi.fn(() => q) }
}
```

## Tables + RLS

`resume_analyses` is the current table: RLS enabled, three policies (select /
insert / delete) all keyed on `auth.uid() = user_id`. Schema + policies are
created by `.omo/scripts/migrate-resume-analyses.mjs` — **gitignored, never
committed** (the whole `.omo/scripts/` folder is). supabase-js's data API can't
run DDL, so the script uses the Management API `database/query` endpoint with
the `sbp_` PAT.

When adding a table: enable RLS, write select/insert/(delete/update) policies
on `auth.uid() = user_id`, add the DDL to a one-off script under
`.omo/scripts/`, and note it in `HANDOFF.md`. Never leave a user table without
RLS.
