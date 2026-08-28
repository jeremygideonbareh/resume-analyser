---
name: resumelab-testing
description: >-
  How to write and run tests in this repo (Vitest 4 + React Testing Library +
  serverless-handler tests). Use this skill whenever you add or change a test,
  a component, a `src/lib/` helper, or an `api/` endpoint — the repo has
  several non-obvious conventions (Vitest globals are OFF, the default test
  environment is `node`, RTL auto-cleanup is not wired up, handler tests fake
  `req`/`res`) that tests silently get wrong without them. Also use it when a
  test fails in a way that looks environmental (duplicate DOM nodes, `document
  is not defined`, env var bleed between tests).
---

# ResumeLab testing conventions

Test runner is **Vitest 4**, config lives in the `test:` block of
[vite.config.ts](../../../vite.config.ts). Run tests with:

```bash
npm test
```

`npm test` runs `vitest run` over `src/**/*.test.{ts,tsx}` and `api/**/*.test.ts`.
Use `npm run test:watch` while iterating. `npm run typecheck` and `npm run lint`
(oxlint) are separate gates — a change is not done until all three are clean.

Tests live next to the code they cover in a `__tests__/` folder
(`src/components/__tests__/`, `src/lib/__tests__/`, `api/__tests__/`).

## The conventions that bite you

### 1. The default test environment is `node`, not jsdom

`vite.config.ts` sets `environment: 'node'`. Pure logic tests (`src/lib/*`,
`api/*`) want that. **Any test that renders a component or touches `document`
must opt in per-file** with a pragma on line 1:

```ts
// @vitest-environment jsdom
```

Symptom when you forget: `ReferenceError: document is not defined`.

### 2. Vitest globals are disabled — import everything

There is no `globals: true`. Import `describe`, `it`, `expect`, `vi`,
`beforeEach`, `afterEach` from `vitest` explicitly in every file.

### 3. RTL auto-cleanup is not active — clean up by hand

Because globals are off, `@testing-library/react`'s automatic `afterEach`
cleanup never registers. Without manual cleanup the DOM accumulates across
tests in a file and `getByRole` / `getByText` throw "found multiple elements".
Every component test file needs:

```ts
import { cleanup } from '@testing-library/react'
afterEach(() => {
  cleanup()
})
```

### 4. jest-dom matchers are opt-in

Add `import '@testing-library/jest-dom/vitest'` to any file that uses
`toBeInTheDocument`, `toHaveTextContent`, `toBeEnabled`, etc.

### 5. Env vars: stub, then unstub

Handlers read `process.env`; the client reads `import.meta.env`. Use
`vi.stubEnv('LLM_API_KEY', 'sk-test')` / `vi.stubGlobal('fetch', ...)` and
reset in `afterEach` with `vi.unstubAllEnvs()` + `vi.unstubAllGlobals()`,
otherwise state leaks into the next test.

## Component tests (React 19 + RTL)

Standard header for a component test:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { UploadZone } from '@/components/UploadZone'

afterEach(() => cleanup())
```

- The `@/` alias maps to `src/` (see `resolve.alias` in vite.config).
- Prefer role/label queries (`getByRole('button', { name: /…/i })`,
  `getByLabelText(...)`) — the components are built to be accessible and the
  existing tests assert on that. Reach for `document.querySelector` only for
  things with no accessible handle (e.g. `input[type="file"]`).
- Mock sibling modules with `vi.mock('@/lib/parsing', () => ({...}))` and drive
  them via `vi.mocked(fn)`. When a mock needs a class the code `instanceof`-checks
  (e.g. `ParsingError`), define the class inside the factory and re-`import()` it
  in the test to construct instances.
- Async UI: `await screen.findByText(...)` for appearance, `waitFor(() =>
  expect(spy).toHaveBeenCalled())` for side effects.
- `userEvent.setup()` per test for realistic interaction; `fireEvent` is fine
  for low-level `change` on file inputs.

## Serverless handler tests (`api/`)

Handlers export `default async function handler(req, res)` typed as
`VercelRequest` / `VercelResponse` from `@vercel/node`. There is no HTTP server
in tests — fake both objects:

```ts
import handler from '../analyze.js'   // NOTE: .js suffix, see below

function makeReq(body: unknown, method = 'POST'): VercelRequest {
  return { method, headers: {}, body } as VercelRequest
}
function makeRes() {
  const res: Record<string, unknown> = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(payload: unknown) { this.body = payload; return this },
  }
  return res as unknown as VercelResponse & { statusCode: number; body: unknown }
}
```

Then assert on `res.statusCode` / `res.body`. Cover the guard rails the handler
documents in its header comment (method → 405, missing key → 503, oversized body
→ 413, bad JSON → 400, upstream failure → 502, timeout → 504). Stub `fetch` with
`vi.stubGlobal` to simulate the LLM provider; never hit the network.

### The `.js` import suffix in `api/`

`api/` compiles as NodeNext ESM, so **relative imports inside `api/` and its
tests must carry a `.js` extension** even though the source file is `.ts`
(`import handler from '../analyze.js'`, `import type { AiFeedback } from
'../src/lib/llm-types.js'`). Omitting it fails typecheck. `src/` code does not
use the suffix — it goes through the Vite/`@` resolver.

## Before you say a test task is done

1. `npm test` — all green. One occasional forks-pool timeout flake is known;
   re-run once to confirm it's the flake and not your change.
2. `npm run typecheck` — 0 errors (the `.js`-suffix rule trips this most).
3. `npm run lint` — no new findings.
