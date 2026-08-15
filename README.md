# ResumeLab — ATS Resume Analyser

**Privacy-first ATS resume analyser.** Drop in a PDF, DOCX, or TXT resume and get an instant ATS score with a category breakdown, detected sections, and actionable feedback — **100% in your browser**. No uploads, no analysis storage, no cookies. Sign-in keeps a session token on your device — removable any time by logging out or clearing site data.

> Brand name: **ResumeLab** (chosen in Todo 1.2 — see `HANDOFF.md` for the rationale).

## Features

- **Zero-upload parsing** — PDF (pdfjs-dist), DOCX (mammoth), and plain text are parsed client-side. No server round-trip.
- **Rule-based ATS scoring** — weighted category scorecard (keyword match, structure, formatting, recency, contact info, parse confidence) normalized from 2026 industry research.
- **Optional job-description matching** — paste a JD to compare keyword overlap and see what's missing.
- **Interactive report** — score gauge, category bars (click for feedback), sections detected, skills extracted, print/summary export.
- **Kinetic UX** — scroll reveals, magnetic CTAs, count-up score animation, reduced-motion support.
- **Optional LLM feedback tier** — env-gated (`VITE_ENABLE_LLM`, default **off**); when enabled, a serverless function calls an OpenAI-compatible LLM with the API key **server-side only**.
- **Hardened** — strict Content-Security-Policy injected at build time, `npm audit` clean, pdf.js lazy-loaded as a separate chunk (LCP ~256 ms), full keyboard-only flow with visible focus indicators.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Motion (framer-motion successor) · recharts · pdfjs-dist · mammoth · Vitest

## Getting started

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (CSP meta injected here)
npm run preview    # serve the production build locally
npm run test       # Vitest (57 tests across parsing/analysis/upload/report/LLM)
npm run lint       # oxlint
npm run typecheck  # tsc -b --noEmit
```

Windows gotcha: PowerShell does not support `&&` — chain commands with `;`.

## Enabling the optional LLM feedback tier

The AI feedback section is **disabled by default** — no API calls fire, no key ships in the client bundle.

**1. Enable the UI gate** — create `.env.local`:

```bash
VITE_ENABLE_LLM=true
```

**2. Deploy the `api/` function with server env vars** (Vercel/Netlify auto-detect the `api/` directory):

| Env var | Default | Purpose |
|---|---|---|
| `LLM_API_KEY` | *(none — required)* | API key for the LLM provider. **Never set in the client.** |
| `LLM_MODEL` | `gpt-4o-mini` | Model name (any OpenAI-compatible chat-completions model). |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint. |
| `LLM_TIMEOUT_MS` | `10000` | Upstream call timeout before the function returns 504. |

**3. Behavior**

- With the gate off: the "AI Feedback" section is hidden entirely and the literal `/api/analyze` string is stripped from the built bundle (grep-verified).
- With the gate on: after analysis, a "Get AI feedback" button appears → POST `{ text }` to `/api/analyze` → the serverless function calls the LLM and returns `{ summary, strengths[], improvements[], suggestions[] }`.
- The function enforces POST-only (405), a 100 KB body limit (413), a 10 s timeout (504), and never logs or persists resume text. Upstream/malformed responses degrade to a friendly "AI feedback is temporarily unavailable" — the core report is unaffected.

## Deployment

Deploy to Vercel (or any static host) — the production build is a static site plus optional `api/` serverless functions:

- Build command: `npm run build` (output: `dist/`).
- `vercel.json` pins `outputDirectory: dist` (the app is a single page with anchor links — no SPA rewrites needed).
- The Content-Security-Policy is injected into `dist/index.html` at build time — no host header config required.
- No `.env*` files are committed; secrets live in the host's environment-variable store.

## Project structure

```
api/analyze.ts              # Optional serverless LLM proxy (env-gated)
src/
  components/               # UI + sections + motion primitives
  lib/
    parsing.ts              # PDF/DOCX/TXT extraction (pdfjs lazy-loaded)
    analysis.ts             # Rule-based scoring engine + feedback
    skills-lexicon.ts       # 200+ detected skills (swap point)
    llm.ts / llm-types.ts   # LLM gate + client fetch
  test/fixtures/            # QA fixtures (strong / weak / sample)
.omo/                       # Work plan, evidence, notepads (internal)
```

## Privacy

- Resume text never leaves the browser unless **you** enable the LLM tier, in which case it is sent only to your own `api/analyze` function and only when a user clicks "Get AI feedback".
- No analytics, no cookies, no analysis storage. Sign-in keeps a session token on your device — removable any time by logging out or clearing site data. See `HANDOFF.md` for the full design rationale.
