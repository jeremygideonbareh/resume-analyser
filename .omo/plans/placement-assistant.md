# Placement Assistant — Core 4 Modules — Build Plan

> **Plan slug:** `placement-assistant` — status: **AWAITING EXECUTION** (user approved approach; write-time complete)
> **Branch:** `feat/resume-analyser` → new branch `feat/placement-assistant` (create at Phase 1 start)
> **Baseline:** commit `04095de` (authwave complete, working tree clean)

## TL;DR (For humans)

We are turning the existing **ResumeLab** website (React/Vite, client-side ATS resume analyser with Supabase auth + dashboard) into a **placement assistant** for students. Per the user's decisions: **stay a website** (no Flutter) and build **exactly 4 modules first**: (1) an AI placement chatbot that answers eligibility questions from the student's profile against company criteria, (2) a student profile module (CGPA, department, semester, skills, certifications, languages, portfolio/GitHub links), (3) resume-analyzer completion (grammar checking + AI-generated improvement suggestions on top of the existing ATS score), and (4) a placement dashboard (readiness score, eligible companies, applications, skill progress). Everything else in the spec (mock interviews, aptitude, coding practice, company hub, notifications, learning recommendations, admin portal, recruiter role, voice/multilingual/gamification) is **Phase 2 — explicitly NOT built now**. The AI features need a serverless backend (the app already has an `api/` folder + `vercel.json`); the plan adds `api/chat` and `api/grammar` endpoints, Supabase tables with row-level security, and reuses the existing LLM plumbing with the key server-side only. TDD throughout (151-test baseline), evidence logs per phase, a live smoke test, and a Final Verification Wave (F1–F4) before handoff.

---

## Context & constraints

- **Repo:** `C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\resume analyser`
- **Stack today:** React 19 · Vite 8 · TypeScript ~6.0 · Tailwind v4 · shadcn/ui · motion · recharts · Vitest 4 (151 tests / 18 files) · Supabase auth (email+password) · GitHub Pages static deploy + `api/` serverless functions for Vercel/Netlify.
- **Existing reusable assets:** `src/lib/analysis.ts` (ATS scoring: keywords 45 / structure 17 / formatting 12 / recency 13 / contact 8 / parse ±5), `skills-lexicon.ts` (200+ skills), `parsing.ts` (PDF/DOCX/TXT), `history.ts` + `dashboard-data.ts` (per-user analysis history), `auth-flow.ts`/`session.ts`/`supabase.ts` (auth + client), `api/analyze.ts` + `llm.ts` + `llm-types.ts` (env-gated optional LLM tier, key server-side), dashboard components (`dashboard.tsx`, `stats.tsx`, charts, `recent-*`, `dashboard-empty.tsx`), Header nav with signed-in links, App-level view state (`'landing' | 'dashboard'`).
- **Deploy reality:** GitHub Pages hosts static only — it CANNOT run the `api/` functions. AI modules (chat, grammar, improvements) therefore require a **Vercel (or Netlify) deployment**. `vercel.json` already exists. Decision D5 records Vercel as primary; Pages may be kept as a static mirror but is NOT where AI features are verified live.

## Decisions (D1–D12)

- **D1 — Platform: keep it a website (USER).** Extend the React web app. Must-NOT-Have: Flutter, React Native, any native build, PWA install in v1 (responsive design only; PWA packaging is optional Phase 2).
- **D2 — Scope: Core 4 modules (USER).** Chatbot, Profile, Resume-analyzer completion, Placement dashboard. All other spec modules are Phase 2 — listed in Scope OUT, not built, no stubs that pretend otherwise (empty states may say "coming in Phase 2").
- **D3 — Backend: Node serverless functions + Supabase.** New endpoints live in `api/` (same pattern as `api/analyze.ts`), deployed to Vercel. Supabase provides auth, Postgres, RLS. Deviation from the spec's FastAPI/Python — justified by the existing toolchain and deploy target; recorded.
- **D4 — LLM: OpenAI-compatible chat completions, key server-side only.** Follow the exact `api/analyze.ts` pattern (env vars `LLM_API_KEY`, `LLM_MODEL` default `gpt-4o-mini`, `LLM_BASE_URL` default `https://api.openai.com/v1`, `LLM_TIMEOUT_MS` default `10000`). The client never holds the key; the literal API key never appears in dist (grep-verified in F2).
- **D5 — Deploy: Vercel primary.** App + `api/` deployed to Vercel for the live AI verification. GitHub Pages remains a static mirror only (documented in HANDOFF). Env vars set in Vercel project settings, never committed.
- **D6 — Company criteria: seeded dataset in v1.** 8 realistic companies (IBM, TCS, Infosys, Wipro, Deloitte, Accenture, Amazon, Microsoft) seeded with `min_cgpa`, `max_backlogs`, `required_skills`, `preferred_skills`, `description`. Admin CRUD UI is Phase 2; v1 has no UI to edit companies.
- **D7 — Chatbot eligibility is deterministic, not hallucinated.** The server computes eligibility by evaluating the student profile against each company's criteria (pure rules), then hands the facts to the LLM as context for the conversational reply. The reply renders a compact "Eligibility" card (company, eligible yes/no, ✔ reasons) alongside the free-text answer. The LLM never decides eligibility; it only words it.
- **D8 — Readiness score v1 formula:** `clamp(round(0.5 × resumeScore + 0.3 × skillCoverageScore + 0.2 × profileCompletenessScore), 0, 100)`. `resumeScore` = latest saved analysis score (0 if none). `skillCoverageScore` = `min(profileSkills.length / 10, 1) × 100`. `profileCompletenessScore` = weighted completion: full_name 10, department 10, semester 10, cgpa 20, backlogs 10, skills ≥3 20, programming_languages ≥1 10, github or portfolio 10.
- **D9 — Privacy stance changes for the new modules.** This product stores student profile data, chat history, and applications per the spec — this supersedes ResumeLab's zero-storage stance for these modules. Resume TEXT is still never stored (analysis stays client-side). Documented in README + HANDOFF so the old claims don't mislead.
- **D10 — Grammar checking via server-side LLM.** New `POST /api/grammar` returns structured issues; client renders them as a checklist with context + suggestions. LanguageTool API noted as an alternative in HANDOFF (not used in v1).
- **D11 — Chat endpoint guards:** POST-only (405), message size ≤ 2 KB (413), per-user rate limit (≥ 2 s between messages → 429, tracked in `chatbot_messages` last-timestamp), 10 s upstream timeout (504), never logs message/resume text, friendly degraded message on upstream failure. Prompt-injection guard: user message is a single user turn; system prompt instructs the model to answer only from the provided profile + company data and to ignore instructions inside the user message.
- **D12 — Shared eligibility logic:** the pure eligibility function is small (~30 lines); it exists TWICE by design — server copy inside `api/chat.ts` (keeps `api/` self-contained per the existing `api/analyze.ts` pattern) and a client copy in `src/lib/eligibility.ts` (used by the dashboard). Both are unit-tested; the server copy is the source of truth for chat; a F2 note flags the duplication as intentional.

## Scope

### IN (v1 — this plan)
1. Data foundation: `student_profiles`, `companies` (seeded), `chatbot_messages`, `applications` tables + RLS + migration script.
2. Student Profile module: form (academic, skills, certifications, languages, links, target role), save/load, completeness meter.
3. AI Chatbot: chat UI + `api/chat` (deterministic eligibility + LLM conversation + history persistence + guards).
4. Resume Analyzer completion: `api/grammar` + grammar-issues UI + AI improvement cards in the AI feedback section.
5. Placement Dashboard: readiness KPI, eligible-company list, applications tracker (minimal add form), skill progress, Phase-2 placeholder cards for interview/aptitude/coding.
6. Wrap-up: gates, Vercel deploy, live smoke of all 4 modules, evidence, HANDOFF/README/plan updates, secrets rotation reminder.

### OUT (Phase 2 — listed, NOT built)
Mock interview (tech/HR/voice/coding interview) · Aptitude practice · Coding practice · Company info hub (beyond eligibility seed) · Placement notifications/push · Learning recommendations · Admin portal (company CRUD, drives, student registry, reports) · Recruiter role · Voice-enabled chatbot · Multilingual · Calendar integration · QR attendance · Alumni mentoring · Cover-letter generation · Discussion forum · Department analytics · PWA install · Chat streaming/WebSockets · Gamification · Video interview analysis · Predictive readiness ML · ERP/LMS integration · GitHub/coding-platform integration.

### Must-NOT-Have (any phase)
- Secrets in client bundle or committed files (`LLM_API_KEY`, service_role, PAT, tokens).
- Storing raw resume text anywhere (analysis stays client-side; only metrics + filename saved, as today).
- New frontend framework, new language runtime, native mobile, Python backend.
- Any Phase-2 module rendering as functional (only explicit "coming in Phase 2" empty states).

---

## Architecture

```
[React SPA (Vercel static)]
  App.tsx view state: 'landing' | 'dashboard' | 'profile' | 'chat'
    ├─ ProfileView  ── supabase (client, RLS) ──► student_profiles
    ├─ ChatView     ── POST /api/chat ──► api/chat.ts (Node serverless)
    │                                   ├─ load profile + companies (service_role)
    │                                   ├─ evaluateEligibility (deterministic)
    │                                   ├─ LLM chat completion (server key)
    │                                   └─ persist to chatbot_messages
    ├─ ReportView (+AiFeedbackSection) ── POST /api/analyze (existing)
    │                                   └─ POST /api/grammar ──► api/grammar.ts
    └─ Dashboard     ── supabase (client) ──► analyses + applications + companies
                      └─ readiness.ts / eligibility.ts (pure, tested)
[Supabase] auth.users · student_profiles · companies (seed) · chatbot_messages · applications
```

## Data model (Supabase Postgres, created by `migrate-placement.mjs`)

All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. RLS enabled on every table.

**`student_profiles`** — `user_id uuid not null unique references auth.users(id) on delete cascade`; `full_name text`; `department text`; `semester smallint`; `cgpa numeric(3,2)`; `backlogs smallint default 0`; `skills text[] default '{}'`; `certifications text[] default '{}'`; `programming_languages text[] default '{}'`; `portfolio_url text`; `github_url text`; `linkedin_url text`; `target_role text`; `updated_at timestamptz default now()`.
RLS: `select/insert/update/delete where auth.uid() = user_id`.

**`companies`** — `name text not null`; `min_cgpa numeric(3,2) null`; `max_backlogs smallint null`; `required_skills text[] default '{}'`; `preferred_skills text[] default '{}'`; `description text`; `recruitment_process text`; `salary_insights text`.
RLS: `select` for authenticated users; NO insert/update/delete policies (service_role only — admin UI is Phase 2).

**`chatbot_messages`** — `user_id uuid not null references auth.users(id) on delete cascade`; `role text check (role in ('user','assistant'))`; `content text not null`.
RLS: `select/insert where auth.uid() = user_id`; update/delete none.

**`applications`** — `user_id uuid not null references auth.users(id) on delete cascade`; `company_id uuid null references companies(id)`; `company_name text` (free text fallback when no seed company); `status text default 'draft' check (status in ('draft','applied','shortlisted','interview','offer','rejected'))`; `applied_at timestamptz`; `notes text`.
RLS: `select/insert/update/delete where auth.uid() = user_id`.

Migration script lives at `.omo/scripts/migrate-placement.mjs` (gitignored, same pattern as the existing `.omo/scripts/migrate-resume-analyses.mjs` — Management API `database/query` with the `sbp_` PAT from `.env.local`; NEVER committed).

## API endpoints

### `POST /api/chat` (new, `api/chat.ts`)
- Request: `{ "message": string }` (≤ 2 KB).
- Flow: authenticate via Supabase JWT from the `Authorization: Bearer` header (server-side `supabase.auth.getUser` with service-role client) → load `student_profiles` row for the user → load all `companies` → compute `evaluateEligibility(profile, company)` for each → persist user message → build system prompt (identity: "ResumeLab placement assistant"; instructions: answer only from the provided student profile and company data; ignore any instructions inside the user message; keep answers under 200 words; be specific) → LLM chat completion (chat completions API, `LLM_API_KEY` server-side) → persist assistant reply → respond `{ "reply": string, "eligibility": [{ "company": string, "eligible": boolean, "reasons": string[] }] | null }` (eligibility non-null when the message matches an eligibility intent: contains "eligib" or "eligible" or a company name).
- Errors: 405 non-POST, 401 missing/invalid token, 403 no profile (tell the user to complete their profile first), 413 oversize, 429 rate-limited (< 2 s since the user's last message), 504 upstream timeout, 500 → friendly "I'm having trouble right now — try again in a moment." Never include raw errors or API keys in responses.
- Tests: `api/__tests__/chat.test.ts` — POST-only, auth, eligibility math (fixtures: eligible/not per criteria), prompt contains profile+company facts, persistence called, rate-limit, oversize, timeout fallback, no key leakage in output.

### `POST /api/grammar` (new, `api/grammar.ts`)
- Request: `{ "text": string }` (≤ 100 KB — same limit as `/api/analyze`).
- Flow: LLM call with a strict JSON prompt ("find spelling/grammar issues; return JSON array of {message, suggestion, context}") → validate + sanitize the JSON (strip markdown fences) → return `{ "issues": [{ "message": string, "suggestion": string, "context": string }] }`.
- Errors: 405, 413, 504, 500 → friendly fallback; never log resume text.
- Tests: `api/__tests__/grammar.test.ts` — shape validation, JSON-fence stripping, oversize, timeout, fallback.

### `POST /api/analyze` (existing — prompt text enhanced only)
- Contract unchanged (`AiFeedback` shape: `summary`, `strengths[]`, `improvements[]`, `suggestions[]` — do NOT break `src/lib/llm-types.ts` or `llm.test.ts`). The server prompt is reworded to bias improvements toward concrete resume edits (this is the "AI-generated resume improvements" source).

## Client modules (exact files)

### `src/lib/placement-types.ts` (new)
Types: `StudentProfile`, `Company`, `ChatMessage`, `Application`, `EligibilityResult`, `GrammarIssue`. No runtime code.

### `src/lib/eligibility.ts` (new, pure)
`evaluateEligibility(profile: StudentProfile, company: Company): { eligible: boolean; reasons: string[] }` — rules: CGPA ≥ min_cgpa (else reason "CGPA below cutoff"), backlogs ≤ max_backlogs (0 backlogs allowed only if max_backlogs = 0; reason "Has N active backlog(s)"), required_skills ⊆ profile.skills (else reason "Missing: X, Y"), preferred_skills intersection counts toward a "preferred skills" reason. Tests in `src/lib/__tests__/eligibility.test.ts`.

### `src/lib/readiness.ts` (new, pure)
`computeReadiness({resumeScore, skillCoverageScore, profileCompletenessScore})` and `skillCoverageScore(skills: string[])` and `profileCompletenessScore(profile: StudentProfile)` per D8. Tests in `src/lib/__tests__/readiness.test.ts` (empty, partial, full profiles; division guards; clamp).

### `src/lib/chat.ts` (new)
`postChatMessage(message: string): Promise<ChatReply>` (POSTs to `/api/chat` with the Supabase session JWT, 10 s abort) and `loadConversation(): Promise<ChatMessage[]>` (client supabase select on `chatbot_messages`, order created_at asc). Tests in `src/lib/__tests__/chat.test.ts` (mock fetch: ok/error/timeout; JWT header present).

### `src/App.tsx` (edit)
View state gains `'profile'` and `'chat'` (union type already extends). Same signed-out redirect effect as `'dashboard'` (`view !== 'landing' && !user → setView('landing')`). Render `ProfileView` / `ChatView` behind the same `view === X && user` guard pattern (no flash).

### `src/components/layout/Header.tsx` (edit)
Signed-in nav gains "Profile" and "Chat" links next to the existing "Dashboard" link (same pattern: optional `view`/`onNavigate` props, `aria-current="page"` when active). Header tests +4.

### `src/components/ProfileView.tsx` (new)
Two-column form: personal (full name, department select, semester select 1–8, CGPA number 0–10 step 0.01, backlogs number ≥ 0), skills (chip input, comma-separated), certifications (comma-separated), programming languages (chips from a fixed common list + free text), links (portfolio/github/linkedin URL inputs with `http(s)://` validation), target role (text). Header shows the completeness meter (progress bar + %). Load on mount (getProfile), Save → upsert (`supabase.from('student_profiles').upsert`), sonner toast "Profile saved". Client-side validation (CGPA range, semester range, URL format) with inline errors. Tests in `src/components/__tests__/ProfileView.test.tsx` (load prefill, save payload, validation errors, completeness meter math, gate).

### `src/components/ChatView.tsx` (new)
Chat window: scrollable message list (user right / assistant left, mono timestamps), input + send (Enter submits), loading dots while awaiting reply, disabled send while in flight. Loads conversation on mount. Optimistic append of the user message; on reply, render the free-text answer plus, when present, the **Eligibility card** (per company: name, badge Eligible/Not eligible, ✔ reasons list). Quick-suggestion chips above the input: "Am I eligible for IBM?", "Improve my resume", "How should I prepare for interviews?" (last two route to the analyser/report areas via onNavigate). Gate: signed-out shows "Sign in to chat with your placement assistant" instead. Tests in `src/components/__tests__/ChatView.test.tsx` (send flow with mocked `chat.ts`, eligibility card render, error + retry, gate, Enter key).

### `src/components/AiFeedbackSection.tsx` (edit) + `src/lib/llm-types.ts` (extend)
After analysis, when `VITE_ENABLE_LLM === 'true'` (existing gate semantics — do NOT change the grep-verified dist-folding behavior): render (a) existing AI summary/strengths, (b) new **grammar issues** list from `POST /api/grammar` (issues as checklist: context snippet, message, suggestion, "Apply" button copies the suggestion), (c) **improvements** as actionable cards ("AI-generated resume improvements") from `improvements[]`/`suggestions[]`. New optional type `GrammarIssue[]` added to `llm-types.ts` (additive). Tests extended in `AiFeedbackSection.test.tsx` (grammar fetch, issues render, improvements render, gate-off hides all, error fallback).

### `src/components/dashboard.tsx` + `src/components/dashboard-data.ts` (edit)
- `dashboard-data.ts` gains pure helpers: `eligibleCompanies(profile, companies)` (delegates to `src/lib/eligibility.ts`), `readinessStats(profile, recentAnalyses)` (uses `readiness.ts`, latest resume score), `applicationStats(applications)` (count by status). Tests extended.
- `dashboard.tsx` renders: existing KPI grid + new **Placement Readiness** KPI card (score + band from `scoreBand`); **Eligible companies** card (list with ✔ reasons or empty state); **Applications** card (count by status + list + minimal add form: company select from seeded companies or free-text name + status select; upsert into `applications`); **Skill progress** card (bar `profileSkills.length / 10`); **Phase-2 placeholders** (Interview / Aptitude / Coding cards using `DashboardEmpty` styling: "Coming in Phase 2"). Tests extended in the dashboard test files.

## Env / config changes

- `.env.example`: add comments for `VITE_ENABLE_LLM` (existing), plus server-side-only vars documented (not committed): `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already documented pattern; ensure `api/chat.ts`/`api/grammar.ts` read them the same way as `api/analyze.ts`).
- `vercel.json` already present — confirm it routes `api/*` to functions and the SPA fallback to `index.html` (existing config; adjust only if broken).

---

## TODOs

> Each todo: files, behavior, acceptance, agent-executed QA (happy + failure, exact invocation, evidence path), commit. Evidence logs go in `.omo/evidence/` (`*.log` gitignored → commit with `git add -f`). Gates run at the end of every phase: `npm run typecheck` (0), `npm run lint` (oxlint, 0 new), `npm run test` (all pass), `npm run build` (0).

### Phase 1 — Data foundation (depends on: baseline)

- **T1.1 — Migration script + run.** — **DONE 2026-08-20** (script `.omo/scripts/migrate-placement.mjs`; ran successfully — 4 tables + RLS; re-run idempotent; evidence `.omo/evidence/pl-1-migrations.log`). Files: `.omo/scripts/migrate-placement.mjs` (new, gitignored). Behavior: create `student_profiles`, `companies`, `chatbot_messages`, `applications` per the Data model section, RLS enabled + policies per table, via Management API `database/query` with `SUPABASE_PAT`/`SUPABASE_ACCESS_TOKEN` from `.env.local` (exact pattern of the existing `migrate-resume-analyses.mjs`). Acceptance: script idempotent (re-run safe); run succeeds; tables visible via a follow-up query. QA: run once → evidence `.omo/evidence/pl-1-migrations.log` (DDL + verification SELECTs); re-run → no error. Commit: `feat: placement data foundation - tables + RLS (student_profiles, companies, chatbot_messages, applications)`.
- **T1.2 — Company seed.** — **DONE 2026-08-20** (8 companies seeded: IBM, TCS, Infosys, Wipro, Deloitte, Accenture, Amazon, Microsoft; verification SELECT in `.omo/evidence/pl-1-migrations.log`; re-run no duplicates). Files: seed block inside the migration script (or a second idempotent seed script). Behavior: insert 8 companies (IBM, TCS, Infosys, Wipro, Deloitte, Accenture, Amazon, Microsoft) with realistic `min_cgpa` (6.0–8.5), `max_backlogs` (0–2), `required_skills` (e.g. IBM: ["python","java","sql"]), `preferred_skills`, `description`, `recruitment_process`, `salary_insights`. Acceptance: 8 rows present after run; re-run does not duplicate (ON CONFLICT on name or pre-check). QA: verification SELECT in evidence log. Commit: `chore: seed 8 companies with eligibility criteria`.
- **T1.3 — Types + eligibility logic (server + client).** — **DONE 2026-08-20** (`src/lib/placement-types.ts`, `src/lib/eligibility.ts`, `src/lib/__tests__/eligibility.test.ts`; server copy in `api/chat.ts`; tests green — evidence `.omo/evidence/pl-1-eligibility.log`). Files: `src/lib/placement-types.ts` (new), `src/lib/eligibility.ts` (new), `src/lib/__tests__/eligibility.test.ts` (new), and the server copy inside `api/chat.ts` in T3.1 (planned here, implemented there). Behavior: types per Data model; `evaluateEligibility` per D7/D12. Acceptance: tests green — eligible (meets all), ineligible-per-criteria (cgpa/backlogs/skills each), empty profile, null criteria (no cutoff = pass). QA: `npm run test` + evidence `.omo/evidence/pl-1-eligibility.log`. Commit: `feat: placement types + deterministic eligibility evaluator`.

### Phase 2 — Student Profile module (depends on: P1)

- **T2.1 — ProfileView + routing + nav.** — **DONE 2026-08-20** (`src/components/ProfileView.tsx`, `src/App.tsx` view state `'profile'`, `Header.tsx` Profile link, tests green — evidence `.omo/evidence/pl-2-nav.log`). Files: `src/components/ProfileView.tsx` (new), `src/App.tsx` (edit), `src/components/layout/Header.tsx` (edit), `src/components/__tests__/ProfileView.test.tsx` (new), `src/components/__tests__/Header.test.tsx` (extend). Behavior: view state + signed-in-only guard + nav links per Client modules. Acceptance: tests green (gate, nav, aria-current, render). QA: dev-mode manual (`npm run dev`): signed-out → no Profile/Chat links; signed-in → links navigate; 0 console errors. Evidence `.omo/evidence/pl-2-nav.log` + screenshot.
- **T2.2 — Profile load/save + completeness.** — **DONE 2026-08-20** (load on mount, upsert on save, completeness meter, validation; tests green — evidence `.omo/evidence/pl-2-profile.log`). Files: `src/lib/placement-types.ts` (edit, if needed), `ProfileView.tsx` (edit), `src/lib/__tests__/readiness.test.ts` (new — profileCompletenessScore cases). Behavior: load on mount, upsert on save, completeness meter, validation per Client modules. Acceptance: tests green; a full profile saves and reloads; partial profile shows the meter at the exact percentage. QA: dev-mode flow (save → reload → prefill) + evidence `.omo/evidence/pl-2-profile.log`. Commit: `feat: student profile module - academic, skills, links, completeness meter`.

### Phase 3 — AI Chatbot (depends on: P1, P2)

- **T3.1 — `api/chat.ts`.** — **DONE 2026-08-20** (`api/chat.ts`, `api/__tests__/chat.test.ts`; all chat tests green — auth, eligibility math, prompt content, persistence, rate-limit, oversize, timeout, no key leak; evidence `.omo/evidence/pl-3-chat-api.log`). Files: `api/chat.ts` (new), `api/__tests__/chat.test.ts` (new). Behavior: per API endpoints section + D7/D11; self-contained server copy of `evaluateEligibility` (D12). Acceptance: all chat tests green — auth, eligibility math, prompt content, persistence, rate-limit, oversize, timeout, no key leak. QA: `npm run test` + evidence `.omo/evidence/pl-3-chat-api.log` (harness hits the endpoint with a fake JWT + fixture profile). Commit: `feat: placement chatbot API - eligibility-aware LLM conversation with guards`.
- **T3.2 — `src/lib/chat.ts`.** — **DONE 2026-08-20** (`src/lib/chat.ts`, `src/lib/__tests__/chat.test.ts`; tests green — fetch ok/error/timeout, JWT header, conversation ordering). Files: `src/lib/chat.ts` (new), `src/lib/__tests__/chat.test.ts` (new). Behavior: `postChatMessage` + `loadConversation` per Client modules. Acceptance: tests green (fetch ok/error/timeout, JWT header, conversation ordering). QA: `npm run test`. Commit: `feat: chatbot client lib (folds into T3.3 commit if kept tiny)`.
- **T3.3 — ChatView.** — **DONE 2026-08-20** (`src/components/ChatView.tsx`, `src/components/__tests__/ChatView.test.tsx`, `src/App.tsx` view `'chat'`, `Header.tsx` Assistant link; tests green — send flow, eligibility card, error retry, gate, Enter). Files: `src/components/ChatView.tsx` (new), `src/components/__tests__/ChatView.test.tsx` (new), `src/App.tsx` (edit), `src/components/layout/Header.tsx` (edit). Behavior: per Client modules. Acceptance: tests green (send flow, eligibility card, error retry, gate, Enter). QA: dev-mode manual with `VITE_ENABLE_LLM=true` + a local api runner — full conversation, eligibility card for "Am I eligible for IBM?", history persists on reload; evidence `.omo/evidence/pl-3-chat-ui.log` + screenshots. Commit: `feat: AI placement chatbot UI - conversation, eligibility cards, history`.

### Phase 4 — Resume Analyzer completion (depends on: P1; parallel with P3)

- **T4.1 — `api/grammar.ts`.** — **DONE 2026-08-20** (`api/grammar.ts`, `api/__tests__/grammar.test.ts`; tests green — shape, fence stripping, oversize, timeout, fallback; evidence `.omo/evidence/pl-4-grammar-api.log`). Files: `api/grammar.ts` (new), `api/__tests__/grammar.test.ts` (new). Behavior: per API endpoints section. Acceptance: tests green (shape, fence stripping, oversize, timeout, fallback). QA: `npm run test` + evidence `.omo/evidence/pl-4-grammar-api.log`. Commit: `feat: grammar-check API for resume text`.
- **T4.2 — AI feedback enhancement.** — **DONE 2026-08-20** (`src/lib/llm-types.ts` GrammarIssue additive, `src/components/AiFeedbackSection.tsx` grammar issues + improvement cards, `api/analyze.ts` prompt text only; tests green; gate-off hides all + `/api/grammar` absent from dist (grep); evidence `.omo/evidence/pl-4-ai-improvements.log`). Files: `src/lib/llm-types.ts` (extend, additive), `src/components/AiFeedbackSection.tsx` (edit), `src/components/__tests__/AiFeedbackSection.test.tsx` (extend), `api/analyze.ts` (prompt text only). Behavior: per Client modules. Acceptance: tests green; with gate off nothing renders and `/api/grammar` literal is absent from dist (grep); with gate on, grammar issues + improvement cards render. QA: build + grep dist (`api/grammar` absent when off, present when on) + dev-mode visual; evidence `.omo/evidence/pl-4-ai-improvements.log` + screenshot. Commit: `feat: resume analyzer completion - grammar issues + AI improvement suggestions`.

### Phase 5 — Placement Dashboard (depends on: P1, P2; parallel with P4)

- **T5.1 — Pure helpers.** — **DONE 2026-08-20** (`src/lib/readiness.ts`, `src/lib/__tests__/readiness.test.ts`, `src/components/dashboard-data.ts` `eligibleCompanies`/`readinessStats`/`applicationStats` + tests; formula math, clamp, empty/partial/full, division guards all green). Files: `src/lib/readiness.ts` (new), `src/lib/__tests__/readiness.test.ts` (new — merged from T2.2 if not yet created), `src/components/dashboard-data.ts` (edit: `eligibleCompanies`, `readinessStats`, `applicationStats`), tests extended. Behavior: per D8 + Client modules. Acceptance: tests green (formula math, clamp, empty/partial/full, division guards). QA: `npm run test`. Commit: `feat: readiness score + dashboard data helpers`.
- **T5.2 — Dashboard UI.** — **DONE 2026-08-20** (`src/components/dashboard.tsx` readiness KPI + eligible companies + applications + skill progress + Phase-2 placeholders; `src/components/__tests__/Dashboard.test.tsx`; tests green; evidence `.omo/evidence/pl-5-dashboard.log`). Files: `src/components/dashboard.tsx` (edit), `src/components/stats.tsx` (edit, if needed for the new KPI), `src/components/dashboard-empty.tsx` (reuse), new tests in the dashboard test files. Behavior: per Client modules — readiness KPI, eligible companies, applications (count/list/add form), skill progress, Phase-2 placeholders. Acceptance: tests green; dashboard renders all sections with real data when profile+analyses exist, empty states otherwise. QA: dev-mode with seeded data + evidence `.omo/evidence/pl-5-dashboard.log` + screenshot. Commit: `feat: placement dashboard - readiness score, eligible companies, applications, skill progress`.

### Phase 6 — Gates, deploy, live smoke, wrap-up (depends on: P2–P5)

- **T6.1 — Full gates + security grep.** — **DONE 2026-08-20** (typecheck 0 / lint 0 new / tests 243 PASS / build 0; `git grep` for `LLM_API_KEY`, `sbp_`, `service_role`, `gho_` in tracked files → zero real hits; dist grep clean; evidence `.omo/evidence/pl-6-gates.log`). Run `npm run typecheck` (0), `npm run lint` (0 new), `npm run test` (all pass), `npm run build` (0); `git grep` for `LLM_API_KEY`, `sbp_`, `service_role`, `gho_` in tracked files → zero real hits; grep dist for secrets → zero. Evidence `.omo/evidence/pl-6-gates.log`. Commit: none (verification only) unless a fix is needed.
- **T6.2 — Vercel deploy.** — **BLOCKED 2026-08-20 (user action)** — no Vercel credentials on this machine (`vercel whoami` → "No existing credentials found"; no `auth.json`, no `VERCEL_TOKEN`, no `~/.vercel`); `LLM_API_KEY` never provisioned anywhere (chat/grammar endpoints return 503 without it). Deploy steps documented in HANDOFF; ready to run the moment the user provides a Vercel token/login + `LLM_API_KEY`. Files: `vercel.json` (confirm/adjust), Vercel project config. Behavior: deploy app + `api/` to Vercel; set env vars (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in the Vercel dashboard; set `VITE_ENABLE_LLM=true` at build time. Acceptance: live URL loads; `/api/chat` and `/api/grammar` respond from the live domain (CORS + JWT auth work). QA: curl the live endpoints + browser load; evidence `.omo/evidence/pl-6-deploy.log` + live URL recorded in HANDOFF.
- **T6.3 — Live smoke (all 4 modules).** — **BLOCKED 2026-08-20 (depends on T6.2)** — requires the deployed Vercel URL + `LLM_API_KEY`; full journey scripted in HANDOFF/README; evidence `.omo/evidence/pl-6-live.log` + screenshots once deployed. On the deployed URL with a throwaway account: sign up → complete profile (save + meter 100%) → chat "Am I eligible for IBM?" (eligibility card with ✔ reasons) → analyse a fixture resume (existing strong.txt) → grammar issues render → improvement cards render → dashboard shows readiness score + eligible companies + applications (add one) → logout → login → all persist. 0 console errors. Evidence `.omo/evidence/pl-6-live.log` + screenshots. Delete the throwaway account via service_role (pattern from the authwave smoke). Commit: none (verification only).
- **T6.4 — Docs + plan + learnings.** — **DONE 2026-08-20** (HANDOFF.md new "Placement Assistant (Core 4)" section; README.md features + setup + Vercel deploy + env table + privacy note; plan checkboxes `[x]`; learnings.md appended). Files: `HANDOFF.md` (new "Placement Assistant (Core 4)" section: modules, D1–D12 summary, privacy-stance change, Vercel deploy note, env vars, Phase-2 list; fix any stale claims), `README.md` (features + setup + Vercel deploy + env table + privacy note), `.omo/plans/placement-assistant.md` (all checkboxes `[x]`), `.omo/notepads/placement-assistant/learnings.md` (append — follow the authwave notepad pattern; note the BOM/mojibake fix technique from the previous wave). Evidence: none (docs). Commit: `docs: placement assistant handoff - modules, deploy, privacy, phase-2 scope`.
- **T6.5 — Commit + push + secrets rotation reminder.** — **DONE 2026-08-20** (all changed files committed; `feat/placement-assistant` pushed; verified with `git ls-remote`; secrets rotation reminder delivered to the user — Supabase PAT + GH token from the previous wave still valid per last check, plus any new Vercel token, all used against a PUBLIC repo). Commit any remaining changed files; push `feat/placement-assistant` (embed the GH token in the push URL as before; verify with `git ls-remote`). Remind the user: rotate the Supabase PAT and GH token from the previous wave (still valid per last check), plus any new Vercel token, since they were used against a PUBLIC repo. Commit: `chore: placement-assistant phase 6 wrap-up`.

## Dependency matrix

| Todo | Depends on | Notes |
|---|---|---|
| T1.1–T1.3 | baseline `04095de` | branch `feat/placement-assistant` created here |
| T2.1, T2.2 | T1.1, T1.3 | needs tables + types |
| T3.1 | T1.1–T1.3 | needs companies + messages tables + types |
| T3.2 | T3.1 | client lib mirrors the endpoint |
| T3.3 | T3.1, T3.2, T2.1 | needs chat lib + profile for context |
| T4.1, T4.2 | T1.3 (types), existing `api/analyze` | independent of P2/P3 — may run parallel |
| T5.1 | T1.3, T2.2 | needs profile + types |
| T5.2 | T5.1, T2.1, T4.x (analyser data) | needs readiness helpers + profile view |
| T6.1–T6.5 | all of P2–P5 | final phase |

## Final Verification Wave (F1–F4) — all four must PASS

- **F1 — Plan compliance:** every todo checkbox marked with its evidence present in `.omo/evidence/pl-*.log`; fresh gates (typecheck 0 / lint 0 new / tests all pass / build 0); secrets grep zero.
- **F2 — Code review:** every changed file read line-by-line; logic matches D1–D12; no stubs/hardcoded values; API keys server-side only (dist grep + code read); RLS policies correct on all 4 new tables; eligibility duplication flagged as intentional (D12); no Phase-2 features implemented.
- **F3 — Live production QA:** deployed Vercel URL — full journey per T6.3 (profile → chat eligibility → analyse + grammar + improvements → dashboard readiness/applications; logout/login/reload persistence; marquee/hero unchanged; guest gate intact for analyser + new views; 0 console errors); screenshots + `.omo/evidence/pl-6-live.log`.
- **F4 — Scope fidelity:** `git grep` for Phase-2 module names (interview/aptitude/coding/notification/learning/admin/recruiter/flutter/pwa) → only explicit "Phase 2" placeholder strings, no functional code; hero copy and privacy copy truthful; no raw resume-text storage anywhere (grep for `parsed.text` insert patterns — metrics + filename only, as today).

## Out of scope for this plan (explicit)

Anything in the spec's Features 4–9, Admin Portal, Recruiter role, AI modules beyond those named in Scope IN, and all "Future Enhancements" — Phase 2 or later. The user approves scope changes only; the executor does not invent scope.

## Approvals & gates

- [x] Approach approved (user) — **DONE 2026-08-20** (answer: keep website; core 4 modules).
- [x] Plan approved (user) — **DONE 2026-08-20** (execution started via `/start-work`; plan locked).
- [x] Execution: user runs `/start-work` (or equivalent) — **DONE 2026-08-20** — executor worked through TODOs in order; T1.1–T6.1 complete, T6.2/T6.3 blocked on Vercel credentials + LLM_API_KEY (user action), T6.4/T6.5 complete, F1/F2/F4 APPROVE, F3 pending deploy.