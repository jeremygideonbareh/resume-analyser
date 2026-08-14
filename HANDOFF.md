# HANDOFF — ResumeLab

Privacy-first ATS resume analyser. Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + `motion` (framer-motion successor) + recharts + Vitest. Branch: `feat/resume-analyser` (never commit to main without user consent).

## What it is

A single-page app: upload/paste a resume → rule-based ATS score (category breakdown, sections detected, skills extracted, feedback) → printable report. Optional env-gated LLM feedback tier (`VITE_ENABLE_LLM`, default off — key lives server-side in `api/analyze.ts`, never in the client).

**Brand name: ResumeLab** (chosen in Todo 1.2). Signature motif: lab-dots grid + scanline (`src/index.css`), emerald accent on ink-on-paper.

## Architecture

- **Zero-upload, client-side only.** Parsing (pdfjs-dist / mammoth / TXT), analysis (rule-based), and report rendering all happen in the browser. No server, no storage, no cookies. LLM tier is an optional env-gated hook — key never in client.
- **Design identity:** ink-on-paper light theme. Tokens in `src/index.css` `:root`: paper `oklch(0.985 0 0)`, surface `oklch(0.96 0 0)`, ink `oklch(0.16 0 0)`, muted `oklch(0.45 0 0)`, accent emerald `#059669` (~`oklch(0.58 0.13 162)`). Fonts via @fontsource: Fraunces (display), Inter (body), IBM Plex Mono (data/keywords).
- **Page composition** (`src/App.tsx`): Header → Hero → SkillsMarquee → ToolSection (#tool) → HowItWorks → SampleReport (#sample) → Footer.
- **Motion primitives** (`src/components/motion/`): `SectionReveal`/`StaggeredReveal` (useInView reveals), `MagneticButton` (cursor spring), `InfiniteSlider` (marquee, local ResizeObserver hook, reduced-motion gate), `ProgressiveBlur` (layered backdrop-filter edge fade). All respect `prefers-reduced-motion`.
- **State machine** (`ToolSection`): `idle → parsed → analyzing → done`; every transition has a kinetic treatment (`AnalyzingSkeleton` count-up, minimum 700 ms). Parsing happens in `UploadZone` (`idle → parsing → error → success`).

## Scoring model (`src/lib/analysis.ts`)

Weighted categories (normalized from 2026 industry research):

| Category | Weight | Notes |
|---|---|---|
| Keyword match | 45 | JD keywords vs. resume tokens (headings + bullets weighted higher); without a JD, falls back to industry-standard keyword heuristics |
| Structure | 17 | Detected standard sections (summary/experience/education/skills/…), heading clarity |
| Formatting | 12 | Single-column layout, bullet usage, quantified achievements, no tables/images |
| Recency | 13 | Year presence in experience, gaps |
| Contact info | 8 | Email / phone / LinkedIn |
| Parse confidence | 5 | Plain text vs. OCR-quality/scanned content |

Score bands: `<60` Needs work · `60–79` Good match · `>=80` Strong. Report marks when a resume passes the "70% recruiter filter line".

**How to swap the lexicon:** detected skills live in `src/lib/skills-lexicon.ts` (200+ entries) — add/remove entries there; `analysis.ts` reads it for skill detection and feedback. Section heading synonyms live in `HEADING_RE`/`SECTION_NAMES` at the top of `analysis.ts`.

## Known limitations

- **Scanned/image PDFs** are detected and warned about (`possible-scanned` warning) — OCR is intentionally out of scope (Scope OUT: no OCR).
- **English-only scoring lexicon** — the skills lexicon and section-heading regex are English.
- **PDFs parse best with embedded text**; pdfjs is lazy-loaded so the first PDF takes a beat (~1 MB chunk, gzip 146 KB) — subsequent analyses are instant.
- Focus drops to `<body>` after phase transitions (parsed → analyzing → done); the next Tab re-enters the flow. Acceptable per plan scope (documented in `.omo/evidence/5-2-a11y.log`).

## Security posture

- **CSP injected at build time** (`vite.config.ts` `cspMetaPlugin`, `apply: 'build'`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'`. Dev is exempt (react-refresh preamble + HMR ws). Verified: app runs with 0 console errors under strict CSP on `vite preview`.
- **No secrets in client**: `VITE_ENABLE_LLM` gate folds `/api/analyze` out of the bundle when off (grep-verified); `LLM_API_KEY` is read only inside the serverless function. `npm audit` clean (0 HIGH/CRITICAL). No `dangerouslySetInnerHTML` anywhere.
- **Perf**: pdf.js is a dynamic chunk (main bundle 1,826 kB → 1,344 kB raw / 525 → 379 kB gzip); LCP measured 256 ms; FCP 220 ms.

## Component provenance (21st.dev / Componentry)

- `InfiniteSlider` + `ProgressiveBlur` ← ibelick `hero-section-4` (21st.dev), adapted to `motion/react` + local `useElementSize` (no react-use-measure dep). Used as the skills marquee under the hero (no fake logos — honest for a new tool).
- `SampleReport` layout pattern ← interior-design `about-us-section` (pasted by user): services grid → ATS-guidance cards, StatCounter springs → stat count-ups.
- `UploadCard` states + `.lab-bg` ripple ← larsen66 `upload-ui` (21st.dev), ported to lab-dots/scanline.
- `hover-footer` ← mdafsarx (21st.dev), restyled.
- Componentry: not integrated (bash flaky during Todo 1.3; optional per plan — revisit if desired).
- ATS guidance content ← 2026 web research (igotanoffer.com, resumeadapter.com, resumly.ai, ophyai.com, flavoredresume.com, hireflow.net, workable.com) — digest in `.omo/notepads/resume-analyser/learnings.md`.

## Build / run

- `npm run dev` (Vite; 8080/8081/8082 used for QA), `npm run build`, `npm run preview`, `npm run typecheck` (`tsc -b`), `npm run test` (Vitest — 57 tests, 9 files), `npm run lint` (oxlint).
- Windows gotchas: PowerShell `&&` invalid → use `;`. Path contains a space — quote it. `HTMLMotionProps` must be `import type` (Vite pre-bundle crash otherwise). Evidence logs are `*.log` → gitignored → commit with `git add -f`.

## Session log

- 2026-08-13: **Todo 1.1** scaffold (commit `134f6d0`); **Todo 1.2** redesign per `.omo/plans/resume-analyser-redesign.md` (commit `3c66e5a`); **Todo 1.3** 21st.dev integration + ATS-grounded SampleReport (commit `b24db7e`, evidence `.omo/evidence/1-3-*`).
- 2026-08-13/14: **Wave 2** parsing engine — `src/lib/parsing.ts` PDF/DOCX/TXT extraction + tests (commit `22b23d5`); **Wave 3** upload zone with drag-drop + paste fallback (commit `8838f74`), rule-based analysis engine (commit `d55b347`), analysis flow with optional JD matching (commit `db628ed`).
- 2026-08-14: **Todo 4.1** report view — scorecard, interactive recharts bars (click a bar → feedback), print support (commit `25a24bf`); **Todo 4.4** kinetic loading across all state transitions (commit `d1c4eb5`).
- 2026-08-14: **Todo 5.1** env-gated optional LLM feedback tier — `api/analyze.ts` serverless proxy + client gate (commit `142b24b`); **Todo 5.2** a11y + security + perf hardening — build-only CSP, lazy pdfjs, Escape/focus-restore in paste dialog, keyboard-only QA + LCP audit (commit `13b82f5`).
- 2026-08-14: **Todo 6.1** deploy config + docs — this HANDOFF, README, `vercel.json`, `.env.example`, `.gitignore` env protection. Next: **Final Verification Wave F1–F4** (plan compliance, code quality, real manual QA, scope fidelity).

## Next steps

1. Final Verification Wave (F1–F4) against `.omo/plans/resume-analyser.md`.
2. Deploy: `vercel` (or any static host) — `dist/` + optional `api/` functions; set `LLM_API_KEY` etc. only in the host env store if enabling the LLM tier.
