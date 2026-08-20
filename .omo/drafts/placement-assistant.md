# Draft — placement-assistant — gap analysis + build plan

## Intent routing (recorded)
- **intent:** ON THE FENCE → treated as CLEAR (outcome = "build the placement assistant per the spec"), one question turn with the genuine owner-forks.
- **review_required:** false (no high-accuracy modifier requested).
- **Status:** awaiting-user-answer (platform/project fork + scope fork).
- **Pending action after answer:** write `.omo/plans/placement-assistant.md` (decision-complete) via manual write (no bash in this session — scaffold script unavailable; structure replicated manually).

## The request (verbatim intent)
User pasted a full "Placement Assistant Chatbot Mobile App" spec: Flutter (Android/iOS) + FastAPI/Node backend + LLM; 10 feature areas; admin portal; 3 user roles (Student / Placement Officer / Recruiter-optional); AI modules; optional extras explicitly deferred ("//Future Enhancements//not now": video interview analysis, predictive readiness ML, job recs, coding-platform integration, gamification, ERP/LMS integration). Ask: "check from these requirements whats left to do".

## Ground truth — existing codebase (resume-analyser = ResumeLab web app)
- **Stack:** React 19 + Vite 8 + TS + Tailwind v4 + shadcn/ui + motion + recharts + Vitest (151 tests / 18 files). Supabase auth (email+password). Zero-backend, privacy-first, client-side parsing. GitHub Pages deploy. Optional env-gated LLM tier (`api/analyze.ts` serverless proxy, default OFF, returns {summary, strengths, improvements, suggestions}).
- **Existing modules:**
  - Resume parsing (PDF/DOCX/TXT) — `src/lib/parsing.ts`
  - Rule-based ATS scoring (keywords 45 / structure 17 / formatting 12 / recency 13 / contact 8 / parse ±5) — `src/lib/analysis.ts` + `skills-lexicon.ts` (200+ skills)
  - Formatting suggestions + missing-section/missing-keyword feedback (rule-driven) — `analysis.ts` feedback
  - Student auth (email+password) + session persistence — `auth-flow.ts` / `session.ts` / `supabase.ts`
  - Per-user analysis dashboard (KPI cards, score trend, section breakdown, recent analyses, activity) — `dashboard.tsx` + `dashboard-data.ts` + `history.ts` (metrics + filename only, RLS)
  - JD keyword matching (present/missing keywords) — `analysis.ts`
  - Optional AI feedback (LLM tier) — `llm.ts` / `api/analyze.ts`

## Gap analysis vs spec (facts)
| Spec module | Status in codebase |
|---|---|
| 1. AI Placement Chatbot | **MISSING** (no chat UI, no eligibility logic, no career guidance) |
| 2. Student Profile (CGPA, dept, semester, skills, certs, languages, resume upload, portfolio/GitHub) | **PARTIAL** — auth identity + resume upload exist; NO academic/skills/profile fields |
| 3. Resume Analyzer (ATS score, formatting suggestions, missing skills, grammar, AI improvements) | **PARTIAL** — ATS ✓, formatting suggestions ✓ (rule-based), missing skills ✓ (lexicon/JD); **MISSING** grammar checking, deeper AI-generated improvements |
| 4. Mock Interview (tech/HR questions, voice, coding interview, AI feedback) | **MISSING** |
| 5. Aptitude Practice (quant/logical/verbal, timed quizzes, analytics) | **MISSING** |
| 6. Coding Practice (challenges, multi-language, hints, evaluation, leaderboard) | **MISSING** |
| 7. Company Information (profiles, process, experiences, salary, FAQ) | **MISSING** |
| 8. Placement Notifications (announcements, deadlines, schedules, reminders, offers) | **MISSING** (no push infra) |
| 9. Learning Recommendations (courses, certs, projects, practice, videos) | **MISSING** |
| 10. Placement Dashboard (applications, eligibility, interview status, test scores, skill progress, readiness score) | **PARTIAL** — analysis-history dashboard only; placement KPI/eligibility/readiness MISSING |
| Admin portal (companies, drives, eligibility, students, notifications, reports, stats) | **MISSING** |
| Recruiter role | **MISSING** (optional per spec) |
| AI modules (resume scoring, career recs, skill-gap, interview feedback, learning path, job matching, FAQ chatbot, NLP search) | resume scoring ✓ (rule-based); others MISSING |
| Backend/DB/auth/push (FastAPI/Node + Postgres/Mongo + Firebase/JWT + FCM + cloud) | **MISSING** — current app is intentionally backend-less; Supabase covers auth+DB only |
| Platform | Spec: Flutter mobile. Current: React web. **Fork.** |

## Genuine owner-forks (cannot be resolved by exploration; must ask)
1. **Platform / project relationship** — the spec says Flutter mobile; the existing app is a React web app. Options: (a) extend the existing web app (PWA/mobile-friendly) reusing everything; (b) build a new Flutter app per spec (separate project, port analysis logic); (c) new separate web app with backend. Irreversible product/platform choice → must ask.
2. **Scope for the first delivery** — spec says features "can be selected based on feasibility". Options: core-4 first (chatbot + profile + resume analyzer completion + dashboard), full spec phased, or analyser-completion first then expand. Spec explicitly permits feasibility-based selection → must ask.

## Decisions recorded so far
- **USER (fork 1): Platform = keep it a website.** Extend the existing React web app (responsive/PWA-friendly). NO Flutter, NO native builds.
- **USER (fork 2): Scope = Core 4 modules first** — (1) AI Chatbot, (2) Student Profile, (3) Resume Analyzer completion (grammar + AI improvements), (4) Placement Dashboard. Everything else = clearly-marked Phase 2 (NOT in this plan's v1).
- Existing analysis logic (weights, lexicon, parsing rules) is reused in place — no porting needed (web path).
- Backend default: Node serverless functions (existing api/ + vercel.json pattern) + Supabase (auth, Postgres, RLS). DEVIATION from spec's FastAPI/Python — recorded, justified by existing deploy target.
- LLM: OpenAI-compatible chat completions, key server-side only (existing api/analyze.ts pattern).
- Company eligibility criteria = seeded dataset in v1 (admin CRUD is Phase 2).
- Dashboard v1 shows only data v1 sources (resume score, skill coverage, profile completeness, eligible companies, applications-empty state); interview/aptitude/coding render as Phase-2 empty states.
- Chatbot eligibility = deterministic rule evaluation (profile vs criteria) computed server-side, passed to LLM as context — facts are computed, not hallucinated.
- Readiness score v1 formula: clamp(round(0.5×resumeScore + 0.3×skillCoverageScore + 0.2×profileCompletenessScore)).
- Privacy-stance change: this product DOES store student profile data (per spec) — supersedes ResumeLab's zero-storage stance for the new modules; document in README/HANDOFF.
- Grammar checking via LLM (server-side); LanguageTool API noted as alternative.
- Chat endpoint: rate-limited + validated; prompt-injection guard (system-prompt isolation).

## Status
- **status: plan-written** — `.omo/plans/placement-assistant.md` written (2026-08-20) after user approval of the approach brief. Decision-complete: D1–D12, 6 phases, 15 todos with acceptance/QA/commit, dependency matrix, Final Verification Wave F1–F4. Next: user runs `/start-work` to execute; executor marks checkboxes with evidence. Prometheus does not implement.
- Note: scaffold script unavailable (no shell in planning session) — plan file written directly with the required structure (TL;DR block + decisions + todos + verification wave).
- Existing analysis logic (weights, lexicon, parsing rules) is reused in place — no porting needed (web path).
- Backend default: Node serverless functions (existing api/ + vercel.json pattern) + Supabase (auth, Postgres, RLS). DEVIATION from spec's FastAPI/Python — recorded, justified by existing deploy target.
- LLM: OpenAI-compatible chat completions, key server-side only (existing api/analyze.ts pattern).
- Company eligibility criteria = seeded dataset in v1 (admin CRUD is Phase 2).
- Dashboard v1 shows only data v1 sources (resume score, skill coverage, profile completeness, eligible companies, applications-empty state); interview/aptitude/coding render as Phase-2 empty states.
- Chatbot eligibility = deterministic rule evaluation (profile vs criteria) computed server-side, passed to LLM as context — facts are computed, not hallucinated.
- Readiness score v1 formula: clamp(round(0.5×resumeScore + 0.3×skillCoverageScore + 0.2×profileCompletenessScore)).
- Privacy-stance change: this product DOES store student profile data (per spec) — supersedes ResumeLab's zero-storage stance for the new modules; document in README/HANDOFF.
- Grammar checking via LLM (server-side); LanguageTool API noted as alternative.
- Chat endpoint: rate-limited + validated; prompt-injection guard (system-prompt isolation).

## Approach (the brief awaiting approval)
One decision-complete plan: 6 phases mapping to the Core-4 modules + foundation + wrap-up. Each todo has exact paths, acceptance, agent-executed QA, commit. TDD throughout (project mandate, 151-test baseline). Final Verification Wave F1–F4 with live smoke on the deployed URL. After approval: write plan → user runs /start-work → executor builds; I never implement.

## Genuine owner-forks (cannot be resolved by exploration; must ask)
1. **Platform / project relationship** — the spec says Flutter mobile; the existing app is a React web app. Options: (a) extend the existing web app (PWA/mobile-friendly) reusing everything; (b) build a new Flutter app per spec (separate project, port analysis logic); (c) new separate web app with backend. Irreversible product/platform choice → must ask. **ANSWERED: keep it a website.**
2. **Scope for the first delivery** — spec says features "can be selected based on feasibility". Options: core-4 first (chatbot + profile + resume analyzer completion + dashboard), full spec phased, or analyser-completion first then expand. Spec explicitly permits feasibility-based selection → must ask. **ANSWERED: Core 4 modules first.**