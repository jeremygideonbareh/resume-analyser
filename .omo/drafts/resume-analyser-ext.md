# resume-analyser-ext — draft (durable resume point)

## Status
- **intent:** clear
- **review_required:** false (no review modifier requested) — high-accuracy review (dual Momus+Oracle) REQUESTED by user, then superseded by scope change
- **status:** APPROVED by user ("yes" on 2026-08-14) → plan written `.omo/plans/resume-analyser-ext.md`; **RE-SCOPED 2026-08-14** per user's Supabase request + two question answers
- **RE-SCOPE (user decision, 2026-08-14):** user supplied a Supabase Personal Access Token (`sbp_…`, Management API) and said "use this supabase token to set up everything needed for backend". Asked two forks; user chose **"Real auth, keep privacy-first (Recommended)"** + **"Provision new project (Recommended)"**. → Wave 2 rewritten from in-memory demo login to REAL Supabase Auth: provision free-tier project via Management API (PowerShell Invoke-RestMethod, no CLI), wire `@supabase/supabase-js`, email OTP live (built-in emailer) + phone OTP wired with graceful SMS-provider-missing error (paid provider required for real delivery), session via `onAuthStateChange` persisted with Supabase token, privacy copy updated to stay truthful. Security policy: PAT + service_role + DB password live ONLY in gitignored `.env.local`; rotate PAT after setup (shared in chat); secret-leak grep gate every todo.
- **pending action:** fold in the (now partially stale) Momus+Oracle high-accuracy review findings where still applicable, re-verify HR6, present final plan summary + start question — do NOT execute
- **2026-08-14 review resolution:** user chose "Cancel stale reviews" — both background reviews (Momus bg_d869ddc6, Oracle bg_83fbee98) were launched against the PRE-Supabase plan and cancelled after 27+ min (file changed underneath them; Wave 2 findings would be stale). Wave 2 gap analysis done inline instead (secrets policy, rate-limit note, key-shape note, fallbacks). Plan is HR6-verified and decision-complete. Execution remains the user's call via /start-work.

## Request (2026-08-14)
User asked, on a COMPLETED ResumeLab project (all 12 todos done, Final Wave F1–F4 APPROVE, branch `feat/resume-analyser`):
1. "from componentry add make sure every section should have kinetic loading"
2. "create a login panel where they can login via phone number or email"

## Grounded facts (verified, not claims)
- **Componentry was promised but never integrated.** Original plan success criteria #4 + scope #2: "at least one Componentry animated component and at least one 21st.dev-sourced component (via magic-dev-21st MCP) integrated and restyled to the design tokens; provenance recorded in HANDOFF." HANDOFF.md line 55: "Componentry: not integrated (bash flaky during Todo 1.3; optional per plan — revisit if desired)."
- **Componentry = componentry.dev** — shadcn-registry animated component library (harshjdhv/componentry, 40+ components: Kinetic Text Reveal, Letter Cascade, Magnetic Dock, Particle Typography, Sticky Scroll Cards, Scroll Velocity, etc.). Install: `npx shadcn@latest add @componentry/<name>`. Built on React + Tailwind + Framer Motion. Project already has `motion` ^13.1.0 (Framer Motion's successor, API-compatible), Tailwind v4, `components.json` (shadcn registry, radix-nova style) → drop-in compatible.
- **Current kinetic coverage:** Header (motion.header entrance) ✓, Hero (SectionReveal + MagneticButton) ✓, SkillsMarquee (InfiniteSlider self-animating + ProgressiveBlur) ✓, ToolSection (SectionReveal ×2 + ScanSkeleton/AnalyzingSkeleton state treatments) ✓, HowItWorks (SectionReveal + StaggeredReveal) ✓, SampleReport (SectionReveal + counters) ✓, ReportView (ReportReveal stagger) ✓. **Footer.tsx = no animation at all** — the gap.
- **Design identity:** ink-on-paper light theme, Fraunces/Inter/IBM Plex Mono, emerald accent `oklch(0.58 0.13 162)`, radius 0.75rem. All motion respects `prefers-reduced-motion` (project-wide pattern). Success criteria require LCP < 2.5s, CLS < 0.1.
- **Login collision:** Plan TL;DR "What it will NOT do": *"No user accounts, no resume storage/database..."* Footer.tsx + ToolSection copy: *"Privacy first: your resume never leaves your browser. No uploads, no storage, no cookies."* Site is a **static Vite SPA, zero backend**, deployed via vercel.json (framework vite, outputDirectory dist, no serverless functions). Phone login requires an SMS provider (Twilio etc.); email login requires password storage or OTP/email provider — both need backend infra + keys + cost.
- **MCP state:** `magic-dev-21st` MCP is configured in opencode.jsonc (enabled) but NOT visible in this session's connected MCP resources (only websearch is). Executor must verify connectivity; Componentry primary path is the shadcn CLI registry, which needs no MCP.
- **Folder context:** `C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\resume analyser` — a client-deliverable demo site.

## Open forks (answered 2026-08-14)
1. **Login architecture depth** → **UI demo panel** (user choice): polished login modal with email + phone tabs, OTP-style input flow, validation, mock authenticated state (in-memory React state only, ZERO persistence — localStorage forbidden). Keeps the "no uploads, no storage, no cookies" promise literally true. No backend, no keys, no cost.
2. **Kinetic motion intensity** → **Tasteful kinetics** (user choice): Componentry-sourced treatments restyled to ink-on-paper tokens; keep the restrained identity; Footer gets its missing animation; LCP < 2.5s / CLS < 0.1 preserved.

## Resolved decisions (for plan generation)
- **Componentry source:** componentry.dev shadcn registry — `npx shadcn@latest add @componentry/<name>`. Project already has `components.json` (radix-nova) + `motion` ^13.1.0 (Framer Motion successor) + Tailwind v4 → drop-in. MCP not needed (CLI registry); `magic-dev-21st` MCP was already fulfilled in Todo 1.3 (21st.dev sourcing done — InfiniteSlider/ProgressiveBlur/UploadCard/hover-footer).
- **Chosen Componentry components (tasteful tier, no WebGL/particle):**
  - `@componentry/kinetic-text-reveal` → Hero headline (word/char stagger, soft blur) + section headings (HowItWorks, SampleReport)
  - `@componentry/letter-cascade` → Footer brand + ToolSection heading
  - `@componentry/scroll-based-velocity` → SkillsMarquee strip / section divider (scroll-driven, light)
  - `@componentry/flipping-word-swap` → Header "Analyse" CTA micro-interaction (optional polish)
  - Install names verified from docs URLs (`/docs/components/kinetic-text-reveal` etc.)
- **Reduced-motion:** Componentry components built on Framer Motion may not ship reduced-motion guards — executor MUST audit each added component and add `useReducedMotion()` static fallbacks per project pattern (KineticLoader/SectionReveal precedent) before acceptance.
- **Login panel placement:** modal dialog from Header ("Sign in" button); after mock login, header shows masked identifier + Log out. Focus trap + Escape-to-close + focus restore (UploadZone paste-dialog precedent). Demo microcopy ("Demo — no account is created").
- **Tests:** TDD for validation logic (email regex, phone format) + component tests (tab switch, OTP flow, close). All 57 existing tests must stay green.
- **Privacy copy:** stays TRUE — demo login persists nothing. Add "Sign in (demo)" affordance without weakening the zero-upload promise.

## Plan waves (draft)
- Wave 1 (1.1–1.3): Componentry integration + per-section kinetic treatments + Footer gap + provenance
- Wave 2 (2.1–2.3): Login demo panel (foundation/validation → OTP flow + session → docs/privacy copy)
- Wave 3: Final verification wave F1–F4 (same protocol as original)

## Metis gap analysis (2026-08-14)
- Subagent dispatch billing-blocked (payment method required on opencode.ai workspace) → performed gap analysis inline as the critic against the plan text.
- CRITICAL — "every section" gap: todos 1.1–1.3 covered Hero/Footer/ToolSection/SkillsMarquee/Header but NOT HowItWorks/SampleReport → **added Todo 1.4** (KineticTextReveal on HowItWorks + SampleReport headings).
- HIGH — decision-complete violations: OTP input ("pick one"), session state ("context or App-level"), test file path unspecified → **pinned**: single 6-digit OTP input (`inputMode=numeric maxLength=6 pattern=[0-9]{6} aria-label`), App-level `useDemoAuth()` with prop-drilling (no context), `src/components/__tests__/LoginPanel.test.tsx` + `src/lib/auth-session.test.ts` with `// @vitest-environment jsdom` pragma.
- MEDIUM — Todo 3.1 commit line had leftover self-correction artifact → fixed to `chore: final verification wave evidence (ext F1-F4 approve)`.
- LOW — Header "Sign-in" must be visible on all breakpoints (outside the `hidden sm:flex` nav) → added to Todo 2.1 step 3.
- All findings folded in; plan re-verified (HR6: TL;DR leads, template headers in order, every todo has References + Acceptance + happy/failure QA with evidence paths + Commit line).

## Notepad / evidence ledger
- (filled during plan generation)