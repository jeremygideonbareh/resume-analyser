# careerBoT — ATS Resume Analyser

**Privacy-first ATS resume analyser.** Drop in a PDF, DOCX, or TXT resume and get an instant ATS score with a category breakdown, detected sections, and actionable feedback — **100% in your browser**. No uploads, no cookies — parsing runs entirely on your device. Analyses run while signed in are saved to your account so you can review them in your dashboard; your resume text is never stored. Sign out or delete your history any time.

> Brand name: **careerBoT** (chosen in Todo 1.2 — see `HANDOFF.md` for the rationale).

## Features

- **Zero-upload parsing** — PDF (pdfjs-dist), DOCX (mammoth), and plain text are parsed client-side. No server round-trip.
- **Rule-based ATS scoring** — weighted category scorecard (keyword match, structure, formatting, recency, contact info, parse confidence) normalized from 2026 industry research.
- **Optional job-description matching** — paste a JD to compare keyword overlap and see what's missing.
- **Interactive report** — score gauge, category bars (click for feedback), sections detected, skills extracted, print/summary export.
- **Kinetic UX** — scroll reveals, magnetic CTAs, count-up score animation, reduced-motion support.
- **Sign in (Supabase Auth)** — email OTP is live out of the box; phone OTP is wired and shows a graceful "needs an SMS provider" message until a paid provider (e.g. Twilio) is enabled in the Supabase dashboard. The session token lives on your device (localStorage) and is removable by logging out or clearing site data. Signed-in analyses are saved to your account (metrics + filename only — never the resume text) so you can review them in your personal dashboard; sign out or delete your history any time.
- **Optional LLM feedback tier** — env-gated (`VITE_ENABLE_LLM`, default **off**); when enabled, a serverless function calls an OpenAI-compatible LLM with the API key **server-side only**.
- **Placement Assistant (Core 4 modules)** — for students, on top of the analyser:
  1. **Student profile** — academic details (CGPA, department, semester, backlogs), skills, certifications, programming languages, portfolio/GitHub/LinkedIn links, target role; completeness meter.
  2. **AI placement chatbot** — ask "Am I eligible for IBM?" and get a deterministic eligibility verdict (computed from your profile against seeded company criteria — the LLM only words it, never decides it) plus a conversational answer; history persists per account.
  3. **Resume-analyzer completion** — grammar checking (`POST /api/grammar`) and AI-generated improvement suggestions on top of the existing ATS score.
  4. **Placement dashboard** — readiness score (resume + skill coverage + profile completeness), eligible-company list with reasons, applications tracker, skill progress, Phase-2 placeholder cards.
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
- With the gate on: after analysis, a "Get AI feedback" button appears → POST `{ text }` to `/api/analyze` → the serverless function calls the LLM and returns `{ summary, strengths[], improvements[], suggestions[] }`. The same gate also enables the **grammar checker** (`POST /api/grammar` → `{ issues: [{ message, suggestion, context }] }`) and the **placement chatbot** (`POST /api/chat` → `{ reply, eligibility[] }`).
- The functions enforce POST-only (405), body limits (413), a 10 s timeout (504), and never log or persist resume text. Upstream/malformed responses degrade to a friendly "AI feedback is temporarily unavailable" — the core report is unaffected.

## Placement Assistant (Core 4 modules)

The analyser is extended with four student-placement modules (see `HANDOFF.md` → "Placement Assistant (Core 4)" for the full design, decisions D1–D12, and the Phase-2 list):

1. **Student profile** (`Profile` in the signed-in header) — academic details, skills, certifications, languages, links, target role; completeness meter; saved to `student_profiles` (RLS: owner only).
2. **AI placement chatbot** (`Assistant` in the signed-in header) — deterministic eligibility against 8 seeded companies (IBM, TCS, Infosys, Wipro, Deloitte, Accenture, Amazon, Microsoft) + LLM conversation; history in `chatbot_messages` (RLS: owner only).
3. **Resume-analyzer completion** — grammar issues checklist + AI improvement cards in the AI feedback section (gate-on only).
4. **Placement dashboard** — readiness score, eligible companies, applications tracker, skill progress, Phase-2 placeholders.

**Setup** — the placement tables are created by `.omo/scripts/migrate-placement.mjs` (Management API, `SUPABASE_PAT` from `.env.local`, never committed; same pattern as `migrate-resume-analyses.mjs`). The AI modules need the LLM env vars above **and** a serverless host (Vercel) — GitHub Pages cannot run `api/` functions. Server-side env vars for the host's store:

| Env var | Default | Purpose |
|---|---|---|
| `LLM_API_KEY` | *(none — required)* | API key for the LLM provider. **Never set in the client.** |
| `LLM_MODEL` | `gpt-4o-mini` | Model name (any OpenAI-compatible chat-completions model). |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint. |
| `LLM_TIMEOUT_MS` | `10000` | Upstream call timeout before the function returns 504. |
| `SUPABASE_URL` | *(none — required)* | Supabase project URL (server-side reads). |
| `SUPABASE_SERVICE_ROLE_KEY` | *(none — required)* | Server-only key for `api/chat.ts` to load profiles/companies. **Never in the client.** |

**Privacy stance (changed for these modules, D9)** — the placement modules store student profile data, chat history, and applications per account (that is their purpose). Resume **text** is still never stored — analysis stays client-side; only metrics + filename are saved, as before.

## Sign in (Supabase Auth)

Email OTP is live out of the box; phone OTP is wired and degrades gracefully until a paid SMS provider is enabled.

**1. Create a Supabase project** and note the project URL + anon key (Dashboard → Settings → API):

```bash
# .env.local (never commit — .gitignore covers it)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**2. Enable the email provider** — Auth → Providers → Email → **Enable** (Supabase's built-in emailer sends the 6-digit OTP; no SMTP config needed).

**3. Phone OTP (optional)** — requires a paid SMS provider: Auth → Providers → Phone → enable and configure Twilio (or Vonage/MessageBird/Telefonica). Until one is set, the phone tab shows "Phone sign-in needs an SMS provider — use email for now." instead of a raw error.

**4. Behavior**

- Sign-in is a modal from the header ("Sign in"); the email tab sends a real OTP, then verifies the 6-digit code you receive.
- The session token is persisted on your device (Supabase's default `localStorage` storage) — a reload keeps you signed in. Log out (header) removes it. Analyses run while signed in are saved to your account (metrics + filename only) so you can review them in your dashboard; your resume text is never stored.
- No secrets ship in the client: only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are used client-side. If the vars are missing, sign-in shows "Sign-in isn't set up yet" — the rest of the app still works (zero-upload analysis is untouched).

**5. Deploy note** — set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's env store **before** building/deploying (Vite inlines them at build time).

## Deployment

**Vercel is the primary host** (required for the AI modules — GitHub Pages cannot run `api/` functions):

- Build command: `npm run build` (output: `dist/`).
- `vercel.json` pins `outputDirectory: dist` (the app is a single page with anchor links — no SPA rewrites needed) and routes `api/*` to serverless functions.
- The Content-Security-Policy is injected into `dist/index.html` at build time — no host header config required.
- No `.env*` files are committed; secrets live in the host's environment-variable store. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client, inlined at build) and the server vars from the Placement Assistant table above.
- **GitHub Pages remains a static mirror only** (deployed at `https://jeremygideonbareh.github.io/resume-analyser/`) — the analyser works there, but the AI modules (chat/grammar/improvements) require the Vercel deployment.

## Project structure

```
api/analyze.ts              # Optional serverless LLM proxy (env-gated)
api/chat.ts                 # Placement chatbot: JWT auth, deterministic eligibility, LLM reply, guards
api/grammar.ts              # Grammar-check API for resume text (strict-JSON LLM)
src/
  components/               # UI + sections + motion primitives
    ProfileView.tsx         # Student profile form + completeness meter
    ChatView.tsx            # Placement chatbot UI + eligibility cards
    dashboard.tsx           # Placement dashboard (readiness, eligible companies, applications)
  lib/
    parsing.ts              # PDF/DOCX/TXT extraction (pdfjs lazy-loaded)
    analysis.ts             # Rule-based scoring engine + feedback
    skills-lexicon.ts       # 200+ detected skills (swap point)
    llm.ts / llm-types.ts   # LLM gate + client fetch
    placement-types.ts      # StudentProfile, Company, ChatMessage, Application, GrammarIssue
    eligibility.ts          # Deterministic eligibility evaluator (client copy; D12)
    readiness.ts            # Readiness score formula (D8)
    chat.ts                 # postChatMessage + loadConversation
  test/fixtures/            # QA fixtures (strong / weak / sample)
.omo/                       # Work plan, evidence, notepads (internal)
```

## Privacy

- Resume text never leaves the browser unless **you** enable the LLM tier, in which case it is sent only to your own `api/analyze`/`api/grammar` functions and only when a user clicks the relevant button.
- No analytics, no cookies. Analyses run while signed in are saved to your account (metrics + filename only — never the resume text) so you can review them in your dashboard; sign out or delete your history any time. Guests: nothing is stored.
- **Placement modules (D9):** student profile data, chat history, and applications ARE stored per account — that is their purpose (RLS: owner-only on every table). Resume text is still never stored. See `HANDOFF.md` for the full design rationale.
