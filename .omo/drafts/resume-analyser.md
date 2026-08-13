# Draft: resume-analyser

- **slug:** resume-analyser
- **project dir:** C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\resume analyser
- **status:** awaiting-approval
- **pending action:** user approves plan → worker executes via $start-work (or /webdev full)
- **intent:** UNCLEAR (bootstrap — "resume analyser" name only, no outcome specified)
- **review_required:** true (UNCLEAR path → auto high-accuracy review after plan generation)
- **Classify:** Standard-to-Architecture (multi-component client site, ~14 todos, not Trivial → auto dual review applies)

## Request evidence
- User set project dir: `C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\resume analyser` (empty folder, fresh project)
- User explored /webdev skill, /webdev frontend internals, and agent execution guides (subagent-driven-development / executing-plans) — execution will be worker-driven
- User: "go ahead and see the plan" → approval to generate plan file

## Repo conventions (verified reads)
- App/tool client sites use **Vite + React 19 + TypeScript + Tailwind + shadcn/ui**: `crumbs/package.json` (Vite 8, React 19, react-router-dom 7, shadcn, framer-motion, sonner), `sales-crm/frontend/` (Vite + TS + Tailwind + shadcn, FastAPI backend)
- Marketing sites use **Next.js 16 + React 19 + TS + Tailwind v4** (`kiki's app`, `ngo website`) — NOTE: Next 16 has breaking changes; AGENTS.md warns to read `node_modules/next/dist/docs/`
- Deploy: Cloudflare Pages (sales-crm) / gh-pages (ngo) — static output is platform-agnostic
- Convention: HANDOFF.md at project root after sessions; TODO.md optional
- sales-crm precedent: full plan + code review + security review artifacts under `docs/superpowers/`

## Industry best practice (web research, 2026)
- Features of leading resume analyzers: ATS score 0-100, keyword match vs job description, skills extraction, section detection, per-section feedback, LLM suggestions (optional tier)
- Parsing: DOCX parses cleaner than PDF in real ATS tests (8-system study, quickcv.io 2026-04); PDFs from design tools (Canva/Figma) are image-based and unparseable; standard section headings matter; contact info must be in document body
- Scoring weights (resumeaimatch.com 2026): keyword match 40-50%, section structure 15-20%, formatting compliance 10-15%, recency/relevance 10-15%, contact completeness 5-10%
- Upload limits ~5MB, PDF/DOCX/TXT, drag-drop, free no-signup (resume-parser.app)
- Privacy: resumes are PII — client-side parsing (no upload) is the privacy-first architecture; LLM tiers send data to third parties → cost + privacy implications

## Topology lock — components (each independently succeed/fail)
1. **Foundation** — git init, Vite + React 19 + TS + Tailwind v4 + shadcn/ui scaffold, deployable static build
2. **Parsing engine** — client-side: pdfjs-dist (PDF), mammoth (DOCX), txt passthrough; 5MB limit; scanned-PDF error + paste fallback
3. **Analysis engine** — rule-based ATS scoring (weighted categories per industry), section detection, keyword extraction, optional JD comparison
4. **LLM enhancement (optional, env-gated, default OFF)** — serverless function holds key server-side; never in client bundle
5. **Report UI** — score gauge, category breakdown, present/missing keywords, per-section feedback, print/export
6. **Landing + design** — hero-as-thesis, subject-grounded, one signature element, responsive + accessible + anti-slop

## Open-assumptions ledger (adopted defaults — user vetoes at gate)
| # | Decision | Default | Rationale | Reversible? |
|---|----------|---------|-----------|-------------|
| A1 | Stack | Vite + React 19 + TS + Tailwind v4 + shadcn/ui | Repo convention for tool/app sites (crumbs, sales-crm) | Yes |
| A2 | Parsing | Client-side pdfjs-dist + mammoth + txt | Privacy-first; no server needed; industry-verified libs | Yes |
| A3 | Analysis | Rule-based core (zero keys) + env-gated LLM hook default OFF | Works out-of-box; LLM optional due to cost/PII | Yes |
| A4 | Scoring | 0-100, weights: keywords 45%, structure 17%, formatting 12%, recency 13%, contact 8% (rounded from industry ranges), parse-quality bonus | Industry-sourced 2026 weights | Yes |
| A5 | Uploads | PDF/DOCX/TXT ≤5MB, drag-drop + click + paste-text fallback | Industry norm | Yes |
| A6 | Privacy | Zero-upload architecture: parse in-browser, nothing persisted, no cookies, no analytics of resume content | Resumes = PII; best practice | Yes |
| A7 | JD match | Optional paste job description → present/missing keywords | Core ATS feature | Yes |
| A8 | Deploy | Static build → Vercel (or Cloudflare Pages); vercel.json + CNAME-ready | Both fit conventions; static = agnostic | Yes |
| A9 | Design | Ink-on-paper light theme; display serif (Fraunces) + body sans (Inter) + mono (IBM Plex Mono); accent emerald #059669 with semantic red/amber; hero = live scorecard motif; signature = animated ATS scorecard card | impeccable/frontend-design anti-slop standards; subject-grounded (documents/scorecards) | Yes |
| A10 | LLM tier | `VITE_ENABLE_LLM` default false; when true, serverless fn `api/analyze.ts` with key in env only | No secrets in client bundle | Yes |
| A11 | Motion stack | `motion` (framer-motion) + `lenis` smooth scroll + Recharts for graphs; ease-out-expo, staggered reveals, reduced-motion alternatives mandatory | Repo precedent (kiki-rental-app, crumbs use framer-motion/gsap/lenis); user explicitly wants interactive + smooth + kinetic | Yes |
| A12 | Component sourcing | Componentry (shadcn CLI `@componentry/*`, free/open-source animated components) + 21st.dev via `magic-dev-21st` MCP (configured, 21ST_API_KEY verified set) — min 1 componentry + 1 21st component, restyled to tokens | User explicitly requested both sources; verified available on this machine | Yes |
| A13 | Interactive graphs | Recharts RadarChart (5 category sub-scores) + BarChart with hover tooltips + bar→feedback drill-down | User wants interactive graphs; Recharts = standard React chart lib | Yes |
| A14 | Kinetic loading | Per-state loading treatments: scan-line skeleton for parsing, staggered count-up + sequential chart draw for analyzing, AnimatePresence everywhere, reduced-motion static equivalents, layout-stable skeletons | User explicitly wants "everything should have kinetic loading" + "smooth" | Yes |

## Scope OUT / Must-NOT-Have
- User accounts / auth / login
- Resume storage, database, backend persistence (unless LLM enabled)
- OCR of scanned/image PDFs (show clear error + paste fallback)
- Job board integration, Chrome extension, multi-language
- AI resume rewriting/generation (analysis only, no rewriting)

## Ledgers
- **Metis gap analysis:** ⚠️ NOT RUN — subagent dispatch blocked (workspace billing error: "No payment method"). Substituted with planner's adversarial self-review; findings folded (see Fix/retry summary).
- **Momus review:** ⚠️ NOT RUN — blocked by same billing error. Cannot claim high-accuracy review completed without receipts; flagged to user at gate.
- **Oracle review:** ⚠️ NOT RUN — blocked by same billing error.
- **Fix/retry summary (self-review findings, all applied to plan):**
  1. Contradiction: react-router in scaffold vs single-page app → removed router, pinned no-router single-page (Todo 1.1)
  2. Brand name left to executor → pinned "ResumeLab" (Todo 1.2)
  3. Fixture PDF/DOCX generation unspecified → pinned pdf-lib + docx generator script `scripts/make-fixtures.mjs` (Todo 2.1)
  4. Non-empty-dir scaffold gotcha (`.omo/` exists) → explicit overwrite/fallback handling (Todo 1.1)
  5. pdfjs-dist v4 API cited from memory → executor must confirm against installed version (Todo 2.1)
  6. Contrast check "checker or computed" → pinned computed-check logging ratio to evidence file (Todo 1.2)
- **User scope additions (2026-08-13):** "ui interactive, components from componentry, good ui from 21st dev, interactive graphs, kinetic loading everywhere, smooth" → folded: A11 motion stack, A12 component sourcing (verified componentry + 21st.dev availability), A13 Recharts interactive graphs, A14 kinetic loading; Todo 1.3 (component sourcing), Todo 4.1 (Recharts), Todo 4.4 (kinetic loading) added; Scope + Success criteria updated.
- **User execution directive (2026-08-13):** "make plan executor do all changes itself and verify itself" → Execution strategy rewritten: AUTONOMOUS execution, executor makes ALL changes itself + self-verifies every todo with evidence files (QA happy + failure per todo saved to `.omo/evidence/`), no per-todo check-ins, only stop conditions = BLOCKED / genuine ambiguity / all done; subagents optional-if-available, never required; F1–F4 run by executor itself before surfacing to user.
- **Review status:** plan file written at `.omo/plans/resume-analyser.md`; formal dual high-accuracy review (momus + oracle) PENDING until subagent dispatch is unblocked (billing). Presenting brief now; user may (a) resolve billing to run the formal review before execution, or (b) approve and run the formal review as part of the worker session (documented as open condition).

## Gate state
- [x] exploration exhausted (repo conventions verified, industry research done)
- [x] intent announced (UNCLEAR, auto review)
- [x] draft written
- [x] plan file written + self-review findings folded
- [x] user scope additions folded (interactive UI, componentry, 21st.dev, interactive graphs, kinetic loading, smooth)
- [x] user execution directive folded (autonomous executor, self-verification per todo)
- [x] brief presented (v3, after execution directive) → **awaiting explicit approval**
- [ ] formal Metis + dual high-accuracy review (momus + oracle) — blocked on billing; run before execution
- [ ] worker executes via $start-work