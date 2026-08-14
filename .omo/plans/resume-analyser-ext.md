# resume-analyser-ext - Work Plan

## TL;DR (For humans)

**What you'll get:** Two extensions to your finished ResumeLab site.
1. **Kinetic loading on EVERY section via Componentry** — this finally delivers what the original plan promised but deferred (success criteria #4: "at least one Componentry animated component"). We install 4 tasteful Componentry (componentry.dev) components through the shadcn CLI — `kinetic-text-reveal` (Hero headline + HowItWorks + SampleReport headings), `letter-cascade` (Footer — which currently has ZERO animation — plus ToolSection heading), `scroll-based-velocity` (a low-profile strip under the skills marquee), `flipping-word-swap` (Header "Analyse" CTA) — every one restyled to your ink-on-paper tokens and given a reduced-motion static fallback (the site's established pattern). No WebGL, no particles, no matrix rain — the restrained identity stays.
2. **Real sign-in via Supabase Auth (email OTP + phone OTP)** — we provision a brand-new free-tier Supabase project from your Management API token (you chose "real auth, keep privacy-first" + "provision new project"), wire `@supabase/supabase-js`, and replace the in-memory demo login with real auth flows: enter email (or phone) → Supabase sends a 6-digit code → enter it → signed in. Sessions persist via Supabase's standard auth token (your choice: kept on-device, user-removable by logging out or clearing site data). **Privacy-first stays:** no resume uploads, no analytics, no user data beyond the sign-in identifier — the analyser itself remains 100% local in the browser.
3. **Personal dashboard for signed-in users (NEW user requirement 2026-08-14)** — every logged-in user gets a personal dashboard where they can access all features and see all their data visualized: we install the `efferd-dashboard-2` shadcn block (verified reachable at `https://efferd.com/r/dashboard-2.json`), re-theme it from sales/billing to the resume-analysis domain (KPI cards, score-trend chart, section breakdown, recent-analyses table, empty state), and persist per-user analysis HISTORY in Supabase (table `resume_analyses` + RLS) so signed-in users see their real analyses — **metrics and filename only, raw resume text is never stored** (privacy-maximal default, recorded — override only if you say so). Guests stay zero-storage.

**Why this approach:** Componentry is a drop-in for this project (you already have `components.json`, Tailwind v4, and `motion` ^13.1.0 — Componentry's runtime, Framer Motion's successor). Supabase free tier covers email OTP out of the box (built-in emailer, rate-limited) with zero cost and zero SMTP config. One honest caveat the plan documents: **phone OTP's real SMS delivery requires a paid SMS provider (Twilio/Vonage/MessageBird) configured in Supabase** — the phone tab is fully wired and shows a graceful, honest error if no provider is configured, and HANDOFF documents exactly what's needed to go live.

**What it will NOT do:** No resume/analysis storage for GUESTS, no storage of raw resume text for ANYONE (the signed-in history table stores metrics + filename only), no analytics, no cookies for tracking, no WebGL/particle effects, no changes to the analyser core, no serverless functions (all auth is Supabase-managed; the site stays a static Vite SPA). New runtime dependencies are `@supabase/supabase-js` (the auth client) plus — ONLY if the pulled efferd block imports them — `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu` (user-supplied install list; `recharts` + `lucide-react` already installed; consolidated `radix-ui` ^1.6.7 already present — individuals only if actually imported). Any `framer-motion` import from Componentry is rewritten to `motion/react`.

**Effort:** 13 todos across 4 waves (Componentry integration, Supabase auth, personal dashboard, final verification F1–F4). **Risk:** Medium — new external dependency on the Supabase Management API for provisioning (fallbacks: `supabase` CLI or manual console steps documented), the phone-OTP SMS-provider caveat above, and the dashboard's install path (efferd registry verified working 2026-08-14; Windows path bug + import-inspection steps are baked into Todo 3.1).

**Security handling (non-negotiable):** Your `sbp_` Personal Access Token is used ONLY at provisioning time, lives ONLY in gitignored `.env.local` as `SUPABASE_PAT`, is never written into code/plan/commits, and — because it was shared in chat — you should **rotate it after setup** (generate a fresh PAT, or use the project-scoped `anon`/`service_role` keys going forward). `service_role` key, if fetched, stays server-side in `.env.local` only — NEVER in client code.

**Decisions I made for you** (all recorded in the plan; reversible at the gate):
1. Componentry install via `npx shadcn@latest add @componentry/<name>` (primary) with docs copy-paste fallback.
2. Chosen components: kinetic-text-reveal, letter-cascade, scroll-based-velocity, flipping-word-swap (tasteful tier).
3. Supabase provisioning via **Management API REST calls** (PowerShell `Invoke-RestMethod`, no CLI install): create free-tier project → enable email + phone auth → fetch URL + anon key into `.env.local`. Fallback: `supabase` CLI or console manual steps (documented).
4. Email OTP = real (built-in Supabase emailer). Phone OTP = wired end-to-end; graceful provider-missing error + HANDOFF note for enabling a paid SMS provider later.
5. Session state via `supabase.auth.onAuthStateChange` (the official pattern), persisted with Supabase's default token storage; privacy copy updated to stay truthful ("no uploads, no analysis storage; sign-in keeps a session token on your device, removable any time" — interim wording; FINAL privacy copy lands in Todo 3.3 when per-user history storage exists).
6. All new motion reduced-motion-guarded; CLS-reserved containers; provenance recorded in HANDOFF.
7. One commit per todo on branch `feat/resume-analyser`; final wave F1–F4 must all APPROVE and you give the explicit okay before "done".
8. **Dashboard (NEW, recorded 2026-08-14):** install `efferd-dashboard-2` via the shadcn registry (`@efferd` registry added to `components.json`) + re-theme to the resume domain; per-user history stored in Supabase (`resume_analyses` table + RLS); **raw resume text NEVER stored (metrics + filename only)** — privacy-maximal default, reversible at the gate; NO router added — App-level `'landing' | 'dashboard'` view switch (zero new deps); dashboard is auth-gated (signed-out → landing); deps beyond supabase-js only if the pulled block imports them (`@radix-ui/react-avatar|separator|collapsible|dropdown-menu`).

## Scope

**In scope:**
1. **Componentry kinetic loading (user requirement, original promise fulfilled)** — install 4 tasteful Componentry (componentry.dev) components via the shadcn CLI registry and integrate a kinetic treatment into EVERY section of the ResumeLab landing page, restyled to the ink-on-paper tokens, with reduced-motion static fallbacks. The original plan (success criteria #4, scope #2) required "at least one Componentry animated component" — this was deferred in Todo 1.3 (HANDOFF.md line 55) and is now delivered.
2. **Real sign-in via Supabase Auth (user requirement, re-scoped from demo per user's answers)** — provision a new free-tier Supabase project using the user's Personal Access Token; wire `@supabase/supabase-js`; replace the planned demo login with real **email OTP** and **phone OTP** flows (email fully live via Supabase's built-in emailer; phone wired with graceful provider-missing handling — real SMS needs a paid provider, documented). Accessible modal from the Header, Email | Phone tabs, inline validation, signed-in header state (masked identifier + Log out).
3. **Privacy-first guardrails** — no analytics; no guest storage of any kind; signed-in users may save analysis HISTORY (metrics + filename only — raw resume text never stored) to their own RLS-protected rows; privacy copy updated to remain truthful about the on-device session token AND the saved-history feature.
4. **Personal dashboard for signed-in users (NEW user requirement)** — every logged-in user gets a personal dashboard to access all features and see all their data visualized: `efferd-dashboard-2` block installed + re-themed to the resume domain; per-user history persisted in Supabase; auth-gated view switch (no router).
5. **Docs** — Componentry provenance + Supabase auth setup/limits in HANDOFF.md (fulfilling the original provenance promise), README update.
6. **Final verification wave** — F1 plan compliance, F2 code quality review, F3 real browser QA, F4 scope fidelity; all four must APPROVE; surface results and wait for the user's explicit okay.

**Out of scope / Must-NOT-Have:**
- NO storage of raw resume text (any user), NO guest storage, NO analytics, NO tracking cookies, NO profile/payment features beyond the auth session.
- NO serverless functions / edge functions (auth is Supabase-managed; site stays a static Vite SPA).
- NO WebGL / particle / matrix-rain / heavy shader components (tasteful tier only).
- NO changes to the analyser core (UploadZone, parsing, analysis, ReportView) — it stays local-only, zero-upload.
- NO real SMS delivery without a paid provider (phone OTP must fail gracefully and be documented, not silently broken or faked).
- NO `service_role` key in client code (server-side only, `.env.local`); NO secrets committed anywhere.
- NO new runtime dependencies except `@supabase/supabase-js` and — ONLY if the pulled efferd block imports them — `@radix-ui/react-avatar|separator|collapsible|dropdown-menu` (user-supplied list; `recharts` + `lucide-react` already installed; consolidated `radix-ui` already present — individuals only when actually imported). `framer-motion` imports, if any, MUST be adapted to `motion/react` — never add framer-motion as a dependency.
- NO router added for the dashboard (App-level view switch; zero new deps).
- NO removal of existing 21st.dev-sourced components (they stay).
- NO deploy/push to `main` without explicit user consent (env vars for Vercel are documented in HANDOFF as a deploy note, not executed).

## Verification strategy

- **Per-todo agent-executed QA** (happy + failure, exact tool + invocation, evidence path under `.omo/evidence/ext-*.log` / `.png`). Zero human-intervention verification.
- **TDD for logic-bearing code** (auth validation, Supabase client wrapper, OTP flow): write tests first (RED), implement (GREEN), refactor — per project's vitest setup (`npm run test`, 57 existing tests must stay green). Supabase calls are mocked in tests (never hit the real API from unit tests).
- **Browser QA via Playwright MCP** (`skill_mcp(mcp_name="playwright", tool_name="browser_run_code_unsafe", arguments='{...JSON...}')`) against `vite dev` (and `vite preview` of the production build at Final Wave). Emulate `prefers-reduced-motion` for the reduced-motion QA pass. Evidence: console-error capture + screenshots saved from the MCP cwd (`C:\Users\cloud\`) then copied into `.omo/evidence/`.
- **Static gates every todo:** `npm run typecheck` exit 0, `npm run lint` exit 0, `npm run test` 57/57 (plus new), `npm run build` exit 0.
- **Provisioning QA:** every Management API call verified by its HTTP response (project `status === 'ACTIVE_READY'` polled to completion; keys fetched and written to `.env.local`; `git status` shows `.env.local` gitignored and never staged).
- **Secret-leak gate every todo:** `git grep -n "sbp_\|service_role"` → 0 hits in tracked files; `git status` shows no `.env*` staged.
- **Final verification wave** after ALL todos, same protocol as original build: F1 plan compliance audit, F2 whole-branch code review, F3 real manual QA in browser, F4 scope fidelity grep. ALL four APPROVE before declaring complete; results surfaced to the user for explicit okay.
- **Playwright MCP gotchas (from prior sessions — follow these):** never rely on `browser_run_code_unsafe` return payload while a file-chooser modal is pending (payload is dropped) — split steps; use `browser_file_upload` for chooser dialogs; kill orphaned `chrome.exe` PIDs holding the `mcp-chrome-*` profile lock before reuse; screenshots with relative paths land in the MCP cwd `C:\Users\cloud\` — copy into `.omo/evidence/` afterward.

## Execution strategy

- Branch: continue on existing `feat/resume-analyser` (never push to `main` without explicit user consent — per original plan line 191).
- PowerShell 5.1 host: no `&&` (chain with `;`); append evidence via `[System.IO.File]::AppendAllText($path, $content, [System.Text.Encoding]::UTF8)`; ASCII-safe commands.
- Evidence logs are gitignored (`*.log`) → `git add -f .omo/evidence/ext-*.log` when committing.
- One commit per todo (atomic, conventional format), plan todos marked inline `✅ DONE — evidence ...`.
- Design tokens (restyle target for all Componentry components): `--color-paper` `oklch(0.985 0 0)`, `--color-ink` `oklch(0.16 0 0)`, `--color-accent` `oklch(0.58 0.13 162)`, `--font-display` Fraunces, `--font-mono` IBM Plex Mono, radius `--radius-card 0.75rem` (src/index.css @theme).
- Reduced-motion pattern (project precedent): `const reduce = useReducedMotion()` from `motion/react`; when `reduce`, render the static final state instantly (`initial={reduce ? false : {...}}`, `animate={...}`, or conditional render) — see `src/components/motion/SectionReveal.tsx` and `src/components/KineticLoader.tsx`.
- Componentry install (primary): `npx shadcn@latest add @componentry/<name>` — community registries are built into the shadcn CLI (no config needed). If the CLI/registry fetch fails (the original Todo 1.3 deferral cause was "bash flaky"), fall back to copy-paste from `componentry.dev/docs/components/<name>` and adapt imports `framer-motion` → `motion/react`.
- Every installed Componentry component MUST be audited for: (a) `framer-motion` imports → rewrite to `motion/react`; (b) missing `useReducedMotion` guard → add per project pattern; (c) hardcoded colors/fonts → map to tokens; (d) layout-shift risk (fixed min-heights / reserved space) → verify CLS stays < 0.1.
- **Supabase secrets policy (applies from Todo 2.1 on):** `SUPABASE_PAT` (user's `sbp_` token), the generated DB password, and `SUPABASE_SERVICE_ROLE_KEY` (if fetched) live ONLY in `.env.local` (verify/append `*.env*` to `.gitignore` FIRST — never commit). `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are public and safe for the client. Never echo the PAT or service_role key in evidence logs (redact: write `<redacted>`).
- **Supabase provisioning method (decided):** Management API REST via PowerShell `Invoke-RestMethod` (Bearer `SUPABASE_PAT`) — no CLI install needed. Endpoints (per current Supabase docs — verify against `supabase.com/docs/reference/api` during execution if any 4xx):
  1. `GET /v1/organizations` → pick the user's org id.
  2. `POST /v1/projects` `{ name: 'resumelab', organization_id, plan: 'free', region: 'eu-west-2', db_pass: <generated strong password stored only in .env.local> }` → project `ref`.
  3. Poll `GET /v1/projects/{ref}` until `status === 'ACTIVE_READY'` (timeout with clear error + recovery steps).
  4. `GET /v1/projects/{ref}/api-keys` → `anon` key (public → `.env.local` as `VITE_SUPABASE_ANON_KEY`) and `service_role` (server-only → `.env.local`, NEVER client). NOTE: newer API versions may also return a `publishable` key — the client-safe key is `anon` (or `publishable`, equivalent); pick `anon` unless absent.
  5. Enable auth via Management API or `supabase.co/dashboard/project/{ref}/auth/providers`: Email OTP on (built-in emailer), Phone on. If a 4xx blocks any step, fall back to the documented manual-console steps and record the deviation in evidence. NOTE: the built-in emailer is rate-limited (approx 2 emails/hour per address on free tier) — QA flows should space out sends or use a fresh throwaway inbox if a rate-limit error appears (that error is expected behavior, not a bug).
- **SMS caveat (decided):** real phone-OTP delivery requires a paid SMS provider (Twilio/Vonage/MessageBird) in Supabase Auth settings. We wire the flow and handle the provider-missing error gracefully ("SMS provider not configured — phone sign-in unavailable; email sign-in works"). HANDOFF documents the exact steps to enable it later.

## Todos

### Wave 1 — Componentry kinetic loading on every section

- [x] **Todo 1.1 — Install Componentry components + KineticTextReveal in Hero**
- References: `componentry.dev/docs/components/kinetic-text-reveal`; `src/components/sections/Hero.tsx`; `src/components/motion/SectionReveal.tsx` (reduced-motion pattern); `src/index.css` (tokens); `package.json` (`motion` ^13.1.0 already present).
- Steps:
  1. Verify shadcn CLI + Componentry registry reachable: `npx shadcn@latest view @componentry/kinetic-text-reveal` (or `add` directly). Record which command worked in evidence.
  2. Install: `npx shadcn@latest add @componentry/kinetic-text-reveal @componentry/letter-cascade @componentry/scroll-based-velocity @componentry/flipping-word-swap` (single pass; if one fails, install individually).
  3. Audit each installed component: rewrite `framer-motion` → `motion/react`; add `useReducedMotion()` static fallback; map colors/fonts to tokens; ensure no layout shift.
  4. Integrate `KineticTextReveal` into the Hero headline (the big Fraunces h1 — e.g. "Your resume, scored like an ATS would") with word/character stagger + soft blur per the component's API; keep the existing MagneticButton CTA and SectionReveal structure intact.
  5. Record provenance in HANDOFF.md "Component provenance" section (component name, source URL, adaptation notes).
- Acceptance criteria:
  - `npx shadcn@latest add` succeeded (evidence: install log or `git status` showing new files under `src/components/ui/` or similar).
  - Hero h1 renders via KineticTextReveal; page still renders the full Hero (badge, h1, copy, CTA) with no console errors.
  - `prefers-reduced-motion: reduce` emulation → headline renders static (final state), no animation, no console errors.
  - `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run test` 57/57; `npm run build` exit 0.
- QA happy (agent-executed, Playwright MCP against `vite dev`): load page → Hero headline visible and animated (check computed style/animation state at t=0 vs t=800ms); screenshot `ext-1-1-hero.png`; 0 console errors.
- QA failure: `page.emulateMedia({ reducedMotion: 'reduce' })` → headline static (no transform/opacity transition), still fully readable; 0 console errors; evidence `ext-1-1-reduced.log`.
- Commit: `feat: integrate componentry kinetic text reveal in hero (wave 1)`.

- [x] **Todo 1.2 — LetterCascade in Footer + ToolSection heading (close the Footer animation gap)**
- References: `src/components/layout/Footer.tsx` (currently ZERO animation — the identified gap); `src/components/sections/ToolSection.tsx` (already has SectionReveal ×2 + ScanSkeleton/AnalyzingSkeleton); `componentry.dev/docs/components/letter-cascade`.
- Steps:
  1. Footer: wrap the "ResumeLab" brand + the privacy tagline in `LetterCascade` (letters scatter in with spring physics, then reassemble) — restyled to tokens; `aria-hidden` on the decorative animation layer with a visually-identical static text fallback for screen readers (or `aria-label` on the container — follow WCAG: text must remain available to AT).
  2. ToolSection: replace/augment the current heading's SectionReveal with `LetterCascade` on the section heading (keep the state machine + skeletons untouched).
  3. Reduced-motion guard on both (static text when `reduce`).
  4. Ensure Footer retains its exact layout dimensions (no CLS — the cascade must reserve the same space).
- Acceptance criteria:
  - Footer brand + tagline and ToolSection heading animate with LetterCascade; both render statically under `prefers-reduced-motion`.
  - Screen-reader pass: text content is still exposed (check `getByRole`/text content in Playwright — the words are findable in the DOM).
  - No layout shift on the Footer (compare bounding box before/after animation completes).
  - Gates: typecheck 0, lint 0, tests 57/57, build 0.
- QA happy: scroll to Footer → brand letters cascade; scroll to ToolSection → heading cascades; screenshot `ext-1-2-cascade.png`; 0 console errors.
- QA failure: reduced-motion emulation → static, text present, 0 console errors; evidence `ext-1-2-reduced.log`.
- Commit: `feat: add letter cascade to footer and tool heading (wave 1)`.

- [x] **Todo 1.3 — ScrollVelocity strip in SkillsMarquee + FlippingWordSwap in Header CTA**
- References: `src/components/sections/SkillsMarquee.tsx` (InfiniteSlider + ProgressiveBlur present); `src/components/layout/Header.tsx` ("Analyse" CTA + nav); `componentry.dev/docs/components/scroll-based-velocity`; `componentry.dev/docs/components/flipping-word-swap`.
- **Implementation decisions (recorded 2026-08-14, worker session must follow):**
  1. **FlippingWordSwap gets an `onClick?: () => void` prop** added to its interface and spread onto the internal `<button>`. Rationale: the Header CTA is an `<a href="#tool">`; nesting a `<button>` (what FlippingWordSwap renders) inside an anchor is invalid HTML, so the flip-button BECOMES the CTA. In `Header.tsx` replace the `<a href="#tool" ...>Analyse</a>` with `<FlippingWordSwap word1="Analyse" word2="Score it" onClick={() => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft" />`. The button's default `aria-label` (word1 at rest) keeps `getByRole('button', { name: /Analyse/ })` matching. NOTE: `:focus-visible` already triggers the flip (component's `onFocus` checks `matches(':focus-visible')`), so keyboard accessibility is satisfied by the component as-is — do NOT add handlers.
  2. **ScrollVelocity strip** (component export is `ScrollBasedVelocity`, file `src/components/ui/scroll-based-velocity.tsx`, already reduced-motion-guarded inside `useAnimationFrame`): in `SkillsMarquee.tsx`, after the marquee `relative` div (inside the `max-w-6xl` container), add `<ScrollBasedVelocity text="ATS READY · PRIVACY FIRST · SCORE IT ·" default_velocity={5} className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted" />`. The two ParallaxText rows (opposite directions) render as one tasteful strip; `mt-8` gives the fixed-height space (no CLS). Reduced motion → static centered lines (component skips animation frame updates when `reduceMotion`).
  3. Both restyled to tokens; no other edits to SkillsMarquee/Header structure; Header's nav + logo + sticky motion.header untouched.
- Steps:
  1. SkillsMarquee: add a `ScrollVelocity` strip (e.g. a mono line like "ATS READY · PRIVACY FIRST · SCORE IT ·" that moves horizontally with scroll speed) directly under the existing marquee — tasteful, low-profile; reduced-motion → static centered line.
  2. Header: wrap the "Analyse" CTA label in `FlippingWordSwap` (word flips on hover/focus — keep it keyboard-accessible: `:focus-visible` triggers the flip too, or provide an accessible name that does not rely on the animation).
  3. Restyle both to tokens; verify no CLS (velocity strip gets a fixed-height container).
- Acceptance criteria:
  - Velocity strip renders and responds to scroll (Playwright: `page.mouse.wheel` then check transform changed) and is static under reduced-motion.
  - Header CTA flips on hover AND on keyboard focus; its accessible name is stable (`getByRole('button', { name: /Analyse/ })` still matches).
  - Gates: typecheck 0, lint 0, tests 57/57, build 0.
- QA happy: wheel-scroll → strip translates; hover CTA → word flips; screenshot `ext-1-3-velocity.png`; 0 console errors.
- QA failure: reduced-motion → strip static + CTA name still "Analyse"; evidence `ext-1-3-reduced.log`.
- Commit: `feat: add scroll velocity strip and flipping word swap (wave 1)`.

- [ ] **Todo 1.4 — KineticTextReveal on HowItWorks + SampleReport headings (complete "every section" coverage)**
- References: `src/components/sections/HowItWorks.tsx` (SectionReveal + StaggeredReveal on step cards); `src/components/sections/SampleReport.tsx` (SectionReveal + counters); `src/components/motion/SectionReveal.tsx`; `componentry.dev/docs/components/kinetic-text-reveal` (already installed in 1.1 — reuse the same component, no reinstall).
- Steps:
  1. HowItWorks: replace the section heading's SectionReveal with `KineticTextReveal` (keep the StaggeredReveal on the three step cards — do not touch the cards).
  2. SampleReport: apply `KineticTextReveal` to its heading ("Sample analysis" area) while keeping the counters + scorecard mock intact.
  3. Both: restyle to tokens, add reduced-motion static fallback, reserve heading line-height so there is no CLS.
- Acceptance criteria:
  - HowItWorks heading and SampleReport heading animate via KineticTextReveal; static under `prefers-reduced-motion`.
  - Step cards (HowItWorks) and counters/scorecard (SampleReport) still render and behave as before (no regression).
  - Gates: typecheck 0, lint 0, tests 57/57, build 0.
- QA happy: scroll to each section → heading reveals with stagger/blur; screenshot `ext-1-4-headings.png`; 0 console errors.
- QA failure: reduced-motion → headings static, cards still visible; evidence `ext-1-4-reduced.log`.
- Commit: `feat: add kinetic text reveal to how-it-works and sample headings (wave 1)`.

### Wave 2 — Real Supabase Auth (email OTP + phone OTP)

- [ ] **Todo 2.1 — Provision Supabase project via Management API + enable auth (no code)**
- References: Supabase Management API (`supabase.com/docs/reference/api`): `GET /v1/organizations`, `POST /v1/projects`, `GET /v1/projects/{ref}`, `GET /v1/projects/{ref}/api-keys`; Supabase Auth settings (`supabase.com/docs/guides/auth`): email OTP + phone auth; `supabase.com/docs/guides/auth/phone-login` (SMS provider requirements).
- Preconditions (VERIFY FIRST, evidence): `.gitignore` contains `.env.local` / `*.env*` — if not, append and commit the gitignore change BEFORE any secrets are written; record `git check-ignore .env.local` output in evidence.
- Steps:
  1. Read `SUPABASE_PAT` from `.env.local` (user supplies the `sbp_` value once into `.env.local`; executor never types it into commands that get logged — use `$env:SUPABASE_PAT = (Get-Content .env.local | Where-Object { $_ -like 'SUPABASE_PAT=*' }).Replace('SUPABASE_PAT=','')` then pass as `-Headers @{ Authorization = "Bearer $env:SUPABASE_PAT" }`; NEVER echo it).
  2. `GET /v1/organizations` → pick org id (if exactly one, use it; if none, error with recovery steps).
  3. Generate a strong DB password (PowerShell `[System.Text.Encoding]::UTF8.GetBytes([Guid]::NewGuid().ToString()) | ForEach-Object { $_.ToString('x2') }` style — 24+ chars) → store as `SUPABASE_DB_PASSWORD` in `.env.local` (never committed, never echoed).
  4. `POST /v1/projects` `{ name: 'resumelab', organization_id, plan: 'free', region: 'eu-west-2', db_pass }` → project `ref`; poll `GET /v1/projects/{ref}` until `status === 'ACTIVE_READY'` (poll every 30s, up to 10 min; on timeout, record error + recovery: check dashboard, retry).
  5. `GET /v1/projects/{ref}/api-keys` → write `VITE_SUPABASE_URL=https://<ref>.supabase.co` and `VITE_SUPABASE_ANON_KEY=<anon>` to `.env.local`; keep `service_role` in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` (server-only).
  6. Enable Auth: Email OTP (built-in emailer, default) + Phone auth enabled via Management API (`PATCH /v1/projects/{ref}/config/auth` — verify current fields against docs) or the dashboard. If Management API 4xx → use dashboard manual steps; record the deviation.
  7. Record the project ref + region + plan + enabled providers (NOT secrets) in evidence `ext-2-1-provision.log`; write a redacted `.env.local` inventory line (key NAMES only, values `<redacted>`).
- Acceptance criteria:
  - Project ACTIVE_READY; `.env.local` contains `SUPABASE_PAT`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (values present but never printed/committed).
  - `git status` clean of `.env*`; `git check-ignore .env.local` passes; `git grep -n "sbp_\|service_role"` on tracked files → 0 hits.
  - Auth enabled: email OTP + phone on (evidence: Management API config response or dashboard screenshot).
  - Gates: no code changed; `npm run test` still 57/57.
- QA: Management API responses recorded (redacted) in `ext-2-1-provision.log`; `git status` + grep evidence appended; no browser QA needed.
- Commit: `chore: provision supabase project and enable auth (wave 2)`.

- [ ] **Todo 2.2 — Supabase client + env wiring + privacy copy reconciliation (TDD)**
- References: `package.json` (add `@supabase/supabase-js`); `src/lib/` (existing utils); `src/components/layout/Footer.tsx` privacy line; `README.md` privacy bullet; `.env.local` (from 2.1); Vite env typing (`src/vite-env.d.ts` or `vite.config` — `import.meta.env` typing).
- Steps:
  1. TDD first: `src/lib/supabase.test.ts` → `src/lib/supabase.ts`: `getSupabase()` returns a single `createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)` instance (module singleton; tests mock `@supabase/supabase-js` so no real calls). Tests assert: singleton identity, missing-env throws a clear error, client is created with the right URL/anon key (mocked).
  2. `npm install @supabase/supabase-js` (the ONE allowed new runtime dep; record exact version in evidence).
  3. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` typing to the Vite env declaration so `import.meta.env.VITE_SUPABASE_URL` is typed.
  4. Privacy copy reconciliation (INTERIM — final reconciliation happens in Todo 3.3 when per-user history storage lands): Footer privacy line + README privacy bullet updated to remain truthful: "No uploads. No analysis storage. No cookies. Sign-in keeps a session token on your device — removable any time by logging out or clearing site data." (Verify against current text and adjust minimally; keep the existing tone. NOTE: 3.3 will replace "no analysis storage" with the saved-history wording for signed-in users.)
  5. Add `src/vite-env.d.ts` (or existing) `/// <reference types="vite/client" />` check — ensure env types compile.
- Acceptance criteria:
  - `src/lib/supabase.ts` singleton + tests green (mocked); 57 existing tests still green.
  - `.env.local` never referenced in code outside `src/lib/supabase.ts`; `git grep "VITE_SUPABASE"` shows only `src/lib/supabase.ts` + `.env.local` (untracked).
  - Privacy copy updated and grep-consistent (no stale "nothing is ever stored" claims that the session token now contradicts).
  - Gates: typecheck 0, lint 0, tests 57+new, build 0.
- QA: `ext-2-2-client.log` (test run output + grep evidence); no browser QA needed.
- Commit: `feat: add supabase client and reconcile privacy copy (wave 2)`.

- [ ] **Todo 2.3 — Real auth flow in LoginPanel: email OTP + phone OTP (TDD)**
- References: `src/components/auth/LoginPanel.tsx` (modal + tabs + validation from original demo design — keep structure); `src/components/UploadZone.tsx` (dialog precedent: focus trap, Escape, focus restore); `src/lib/auth-validation.ts` (validateEmail/validatePhone — KEEP, still used for inline UX); `src/lib/supabase.ts` (client); Supabase Auth JS docs: `supabase.auth.signInWithOtp({ email })`, `supabase.auth.verifyOtp({ email, token, type: 'email' })`, `signInWithOtp({ phone })`, `verifyOtp({ phone, token, type: 'sms' })`.
- Steps:
  1. TDD first: `src/lib/auth-flow.test.ts` (mock `@supabase/supabase-js` + the supabase module) → `src/lib/auth-flow.ts`:
     - `sendEmailOtp(email)` → `supabase.auth.signInWithOtp({ email })`, surfaces Supabase errors (e.g. rate limit, invalid) as user-facing strings.
     - `sendPhoneOtp(phone)` → `signInWithOtp({ phone })`; when the SMS provider is missing (Supabase error like `sms_provider disabled` / 422), return a graceful, documented error: "Phone sign-in needs an SMS provider — use email for now."
     - `verifyEmailOtp(email, token)` / `verifyPhoneOtp(phone, token)` → `verifyOtp(...)`; returns `{ error }` strings.
     - Tests: success (mocked resolve), failure (mocked reject → mapped message), phone-provider-missing (specific mapping), invalid token.
  2. Rebuild LoginPanel's step 2 on the real flow: Email tab → sendEmailOtp → "Check your inbox for a 6-digit code" (real code from Supabase; REMOVE the "any 6 digits work" demo hint) → single 6-digit input (`inputMode="numeric"`, `maxLength={6}`, `pattern="[0-9]{6}"`, `aria-label="6-digit verification code"`) → verifyEmailOtp. Phone tab → same shape via sendPhoneOtp/verifyPhoneOtp, with the graceful SMS-provider error surfaced inline if it occurs.
  3. Keep modal a11y (focus trap, Escape, focus restore), inline validation via auth-validation, `aria-describedby` errors, loading state on submit (disable + "Sending code…"), sonner toast for success/errors.
  4. Component tests (jsdom pragma `// @vitest-environment jsdom`): `src/components/__tests__/LoginPanel.test.tsx` — modal open/close/Escape/focus-restore, tab switch, validation errors, OTP step renders after valid identifier, submitting calls the mocked `auth-flow` functions, provider-missing phone error is displayed.
- Acceptance criteria:
  - `npm run test` green: new auth-flow + LoginPanel tests pass (all Supabase mocked); 57 existing still green.
  - Real flow works in browser (needs a real reachable email inbox — use the user's email OR a throwaway inbox; if no inbox available, evidence records the send + a screenshot of the "Check your inbox" state and verification is deferred to Final Wave F3 with the user's live email).
  - No secrets in code; Supabase calls only through `src/lib/auth-flow.ts` (grep-verifiable: `supabase.auth.` appears only there + supabase.ts).
  - Gates: typecheck 0, lint 0, build 0.
- QA happy (Playwright): open modal → Email tab → valid email → OTP step visible ("Check your inbox") → (if inbox available) enter real code → signed in state; screenshot `ext-2-3-otp.png`; 0 console errors.
- QA failure: invalid email → inline error; phone tab with no SMS provider → graceful provider-missing message shown (NOT a raw console error); incomplete OTP → submit disabled; evidence `ext-2-3-errors.log`.
- Commit: `feat: wire real email and phone otp auth flow (wave 2)`.

- [ ] **Todo 2.4 — Session state + header signed-in state + docs (HANDOFF/README)**
- References: `src/App.tsx` (session via `supabase.auth.onAuthStateChange`); `src/components/layout/Header.tsx` (signed-in: masked identifier + "Log out"); `src/lib/auth-flow.ts` (maskIdentifier from demo design — KEEP: email → `j***@example.com`, phone → `+44 **** 789`); `HANDOFF.md`; `README.md`.
- Steps:
  1. TDD first: `src/lib/session.test.ts` (mock supabase) → `src/lib/session.ts`: `useAuthSession()` hook wrapping `supabase.auth.onAuthStateChange` → `{ session, user, signOut }`; `maskIdentifier` tests (email/phone masking, edge cases: empty local part, `+` in phone).
  2. `src/App.tsx`: mount `useAuthSession()` at App level; pass `session`, `signOut` to Header (and LoginPanel where needed). Persisted via Supabase default token storage (user choice).
  3. Header: when signed in → show masked identifier + "Log out" (calls `signOut`); when signed out → "Sign in" (opens modal). Sign-in button visible on all breakpoints (outside `hidden sm:flex` nav — next to the always-visible "Analyse" CTA).
  4. HANDOFF.md: Componentry provenance (Wave 1 entries), Supabase auth setup (project ref, providers, SMS caveat + steps to enable a paid provider, Vercel env-var deploy note: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` must be set before deploy), session/privacy note.
  5. README.md: "Sign in (Supabase Auth)" feature entry: email OTP live, phone OTP needs a provider, session token on-device removable; keep zero-upload claim (updated wording from 2.2).
- Acceptance criteria:
  - Full flow in Playwright: Sign in → email → OTP → signed-in header (masked id + Log out); reload → STILL signed in (Supabase persisted session — this is the intended real-auth behavior, distinct from the old demo); Log out → back to Sign in.
  - `maskIdentifier` unit tests green; 57 existing green.
  - `git grep "sbp_\|service_role"` → 0 hits; no `.env*` staged.
  - Gates: typecheck 0, lint 0, build 0.
- QA happy: full session journey screenshots `ext-2-4-signed-in.png` (header state) + `ext-2-4-reload.png` (persisted after reload); 0 console errors.
- QA failure: sign out → header returns to "Sign in" and modal re-opens cleanly; evidence `ext-2-4-signout.log`.
- Commit: `docs: session state, header signed-in state, and handoff/readme notes (wave 2)`.

### Wave 3 — Personal dashboard for signed-in users (per-user history, visualized)

- [ ] **Todo 3.1 — Install efferd dashboard-2 block + deps (no re-theme yet)**
- References: `components.json` (registries map — add `@efferd`); `https://efferd.com/r/dashboard-2.json` (VERIFIED working 2026-08-14 — full block: `dashboard.tsx`, `stats.tsx`, `net-revenue-chart.tsx`, `channel-sales-chart.tsx`, `dashboard-invoices.tsx`, `billing-health.tsx`, `dashboard-activity.tsx`, `dashboard-card.tsx`, `delta.tsx` + registry deps `badge`, `button`, `card`, `chart`, `empty`, `table`, `@efferd/app-shell-2`, `@efferd/formater`, icon-placeholder); user-supplied install list: `recharts` ✓ already installed, `lucide-react` ✓ already installed, `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu` (project uses consolidated `radix-ui` ^1.6.7 — check pulled imports before installing individuals).
- Steps:
  1. Add `"@efferd": "https://efferd.com/r/{name}.json"` to `components.json` `registries` (keep `@componentry`).
  2. Install: `npx shadcn@latest add @efferd/dashboard-2`. WATCH the known Windows path bug (files may land in a stray `@/` dir at project root — move into `src/components/ui/` + `src/components/` via Get-ChildItem loop, exactly as Todo 1.1). Expect: `dashboard.tsx` → `src/components/dashboard.tsx`; sub-components → `src/components/{stats,net-revenue-chart,channel-sales-chart,dashboard-invoices,billing-health,dashboard-activity,dashboard-card,delta}.tsx`; ui deps → `src/components/ui/{chart,table,badge,empty}.tsx`; `app-shell-2` → shell files; `formater` → `src/lib/formater.ts`.
  3. Inspect every pulled import: if any imports `@radix-ui/react-avatar|separator|collapsible|dropdown-menu` → `npm install` those four; if they import from consolidated `radix-ui` → skip. `recharts` + `lucide-react` already present (no reinstall).
  4. Add chart CSS vars to `src/index.css` tokens (block references `var(--chart-1)`, `var(--chart-2)`, `var(--color-online)`, `var(--color-retail)`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `divide-border`): map to the existing ink/paper/accent token set (e.g. `--chart-1: var(--color-accent)`, `--chart-2: var(--color-ink)`); ensure `bg-background`/`text-foreground`/`border` exist in the Tailwind v4 theme (verify; add only if absent).
  5. `npm run typecheck` + `lint` + `test` (57/57) + `build`.
- Acceptance criteria:
  - Block files present under `src/components/` + `src/components/ui/`; NO stray `@/` dir; `npm run build` exit 0 (imports resolve); 57 tests still green.
  - `git grep "efferd"` shows files + components.json entry only (no secrets); deps added are exactly the four `@radix-ui/react-*` IF needed (record decision in evidence).
- QA (gates-only — block not routed yet): typecheck/lint/test/build green; `git status` shows expected new files; evidence `ext-3-1-install.log` (install output + import-inspection notes + dep decision). Visual QA deferred to Todo 3.4 (routed).
- Commit: `chore: install efferd dashboard block and deps (wave 3)`.

- [ ] **Todo 3.2 — Re-theme dashboard to resume-analysis domain (layout + charts kept, content swapped)**
- References: pulled `src/components/{stats,net-revenue-chart,channel-sales-chart,dashboard-invoices,billing-health,dashboard-activity,dashboard-card,delta}.tsx`; `src/lib/analysis.ts` (`AnalysisResult` shape — scores, skills, keyword match); design tokens (`--color-paper/ink/accent`, Fraunces/Inter/IBM Plex Mono, radius 0.75rem); `src/components/ReportView.tsx` (existing scorecard vocabulary).
- Steps:
  1. `stats.tsx` → 4 KPI cards re-labeled to resume domain: **Analyses run**, **Average ATS score**, **Skills detected**, **Best score** (placeholder values until 3.3 wires real data — type the shape `{ label, value, delta }` unchanged).
  2. `net-revenue-chart.tsx` → **"Score trend"**: bar chart of last 7 analyses' ATS scores (placeholder rows shaped like real `{ day, score }`; keep CustomGradientBar + recharts).
  3. `channel-sales-chart.tsx` → **"Section breakdown"**: line chart of per-category scores (formatting, keywords, skills, experience, ATS readability) — reuse the two-line + glow structure with category labels.
  4. `dashboard-invoices.tsx` → **"Recent analyses"**: table rows `filename | format | score | date` (placeholder; table primitives unchanged).
  5. `billing-health.tsx` → **empty state**: "No analyses yet — upload your first resume" + ghost button linking to the analyser (keeps the `Empty` primitives).
  6. `dashboard-activity.tsx` → **recent activity**: analysis-completed events (placeholder).
  7. Restyle ALL to tokens (paper/ink/accent, mono labels, `rounded-xl` cards — note efferd uses `rounded-none`; override via `DashboardCard` to the project radius); keep reduced-motion safe (charts are static recharts — no motion work needed).
- Acceptance criteria:
  - Every demo sales/billing string replaced with resume-domain content (grep: `Revenue|Invoice|signup|Conversion|channel` → 0 hits in dashboard files); no Unsplash/stock images introduced (no image assets at all — this block is data-only).
  - Layout, grid, and charts structurally unchanged (only labels/data/colors); tokens applied.
  - Gates: typecheck 0, lint 0, tests 57/57, build 0.
- QA happy: render the block on a temporary mount (or via Todo 3.4 route if landed first — else a scratch `App` swap documented in evidence) → all 4 KPI cards + 3 charts + table + empty state render; screenshot `ext-3-2-retheme.png`; 0 console errors.
- QA failure: reduced-motion emulation → dashboard renders identically (no animation-dependent content); evidence `ext-3-2-static.log`.
- Commit: `feat: re-theme dashboard to resume analysis domain (wave 3)`.

- [ ] **Todo 3.3 — Per-user analysis history persistence (Supabase table + RLS + save/load, TDD)**
- References: `src/lib/supabase.ts` (Todo 2.2 client); `src/lib/session.ts` (Todo 2.4 `useAuthSession`); `src/lib/analysis.ts` (`AnalysisResult`); `src/components/sections/ToolSection.tsx` (`handleAnalyse`); Supabase docs: RLS policies, `supabase-js` `from('resume_analyses').insert/select/delete`; `.env.local` `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in client).
- Preconditions: Wave 2 auth complete (Todo 2.4 done); `service_role` key present in `.env.local` only.
- Steps:
  1. Migration (one-off, via a short Node script executed with `SUPABASE_SERVICE_ROLE_KEY` — script itself gitignored or deleted after run; NEVER committed, NEVER in client code): create table `resume_analyses` — `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, `filename text not null`, `format text not null`, `score int not null`, `section_scores jsonb not null default '{}'::jsonb`, `skills jsonb not null default '[]'::jsonb`, `keyword_match jsonb` — **RAW RESUME TEXT IS NEVER STORED (privacy-maximal; recorded default — user can override at approval gate)**. Enable RLS; policies: `select`/`insert`/`delete` where `user_id = auth.uid()`.
  2. TDD first: `src/lib/history.test.ts` (mock supabase client) → `src/lib/history.ts`: `saveAnalysis(client, userId, result, parsed)` → insert row (metrics + filename only); `loadHistory(client, userId)` → rows `order by created_at desc`; `deleteAnalysis(client, userId, id)` → delete where user+id. Tests: insert success/failure, load ordering, delete scoping, RLS not bypassable from client (all calls go through the anon-key client, never service_role).
  3. `ToolSection.handleAnalyse`: after `setResult`, if a session exists → `saveAnalysis` (fire-and-forget; failure → sonner toast "Couldn't save this analysis — you're still signed out of history" — non-blocking; guest flow unchanged).
  4. Privacy copy (FINAL reconciliation — Footer + README + HANDOFF): "Analyses run while signed in are saved to your account so you can review them in your dashboard. Your resume text is never stored. Sign out or delete your history any time." Guests: zero storage (unchanged promise). Remove the interim 2.2 wording where it contradicts.
- Acceptance criteria:
  - Migration ran (evidence: table + RLS query output or dashboard screenshot); table + RLS in place; `service_role` only in `.env.local` + never in client (grep).
  - `history.test.ts` green (mocked); 57 existing green; `saveAnalysis`/`loadHistory` used only in ToolSection + dashboard (grep-verifiable).
  - Privacy copy grep: no stale "nothing is ever stored" claims; new wording present in Footer + README + HANDOFF.
  - Gates: typecheck 0, lint 0, build 0.
- QA happy (Playwright): signed in → run an analysis → reload → history query returns the row (evidence via `loadHistory` output or dashboard); screenshot `ext-3-3-history.png`.
- QA failure: signed out → analysis completes with NO save attempt (no console error, no toast); guest privacy promise holds; evidence `ext-3-3-guest.log`.
- Commit: `feat: persist analysis history for signed-in users (wave 3)`.

- [ ] **Todo 3.4 — Dashboard route + auth gating + header nav (signed-in users get the dashboard)**
- References: `src/App.tsx` (view switch — NO router added; zero new deps, recorded default); `src/components/layout/Header.tsx` (signed-in state from 2.4); `src/lib/session.ts`; `src/lib/history.ts` (3.3); pulled `src/components/dashboard.tsx` + siblings (3.1–3.2).
- Steps:
  1. App-level view state `'landing' | 'dashboard'` (useState at `App`; default `'landing'`). Signed-out users rendering dashboard → automatically redirected to `'landing'` (effect on session).
  2. Dashboard view = `<Dashboard />` (re-themed efferd block) wrapped in the existing `Header` + `Footer`; data wired from `loadHistory` (3.3): KPI cards = real counts/averages, charts = real rows, table = real rows, empty state when 0 rows.
  3. Header: when signed in, add always-visible **"Dashboard"** link (switches view to `'dashboard'`; place next to the "Analyse" CTA, outside `hidden sm:flex` nav — same pattern as the Sign in button). "Analyse" CTA + nav links switch back to `'landing'`. Signed out → no Dashboard link (landing only).
  4. Dashboard internal links: "Upload your first resume" + any analyser links → `'landing'` (analyser is the "all features" hub — the dashboard surfaces the tool + history together).
- Acceptance criteria:
  - Signed in → Header shows "Dashboard" → click → dashboard renders with real history data (or empty state); every feature reachable (Dashboard ⇄ Analyser).
  - Signed out → no Dashboard link; manually forcing dashboard state → lands on landing.
  - Gates: typecheck 0, lint 0, tests 57/57 (existing App-level tests unaffected — verify), build 0.
- QA happy (Playwright): full journey — sign in (email OTP with live inbox per 2.3) → Dashboard link → dashboard with KPI/charts/table; screenshot `ext-3-4-dashboard.png`; 0 console errors.
- QA failure: signed out → dashboard unreachable (redirect + no link); empty history → empty state renders; evidence `ext-3-4-gate.log`.
- Commit: `feat: add auth-gated personal dashboard view (wave 3)`.

### Wave 4 — Final verification wave

- [ ] **Todo 4.1 — F1–F4 final verification (same protocol as original build)**
- References: original plan lines 178–185 (F1–F4 definitions); `.omo/evidence/final-f1..f4-*.log` (original exemplars).
- Steps:
  1. F1 plan compliance: walk EVERY todo above against repo state (evidence files present, acceptance criteria met, no skipped verifications); fresh gates: typecheck 0, lint 0, `npm run test` (57 + new, all green), build 0.
  2. F2 code quality: whole-branch review of the new code (auth-validation, auth-flow, session, supabase client, LoginPanel, Header changes, all Componentry adaptations) — CRITICAL/HIGH issues fixed before approval; red-flag grep (TODO/console.log/`as any`/hardcoded secrets) 0 hits; verify only `@supabase/supabase-js` was added to deps and no `framer-motion` dependency (package.json diff).
  3. F3 real manual QA: `vite preview` (production build) in browser — full journey (kinetic hero/footer/header/marquee render; Sign in → email → REAL OTP from a live inbox → signed in → reload → still signed in → Log out); failure paths (invalid email/phone, incomplete OTP, SMS-provider-missing phone error, Escape); mobile viewport 375px no overflow; reduced-motion emulation; 0 console errors; screenshots. (Email OTP requires a reachable inbox — user's email or a throwaway; if truly unavailable, record the evidence gap and ask the user.)
  4. F4 scope fidelity: grep confirms no raw resume-text storage (any user), no guest storage, no analytics, no serverless functions, no WebGL/particle components, no analyser-core changes, `service_role` never in client code, privacy copy truthful (guests zero-storage + signed-in saved-history wording), deps = `@supabase/supabase-js` + the radix individuals ONLY if actually imported, all 7 sections kinetic + real auth + per-user dashboard delivered.
  5. Write `.omo/evidence/ext-final-f1..f4-*.log`; mark plan todos ✅ DONE; append notepad; commit evidence.
  6. **Surface F1–F4 results to the user and WAIT for the user's explicit okay before declaring complete** (per original plan line 52).
- Acceptance criteria: all four reviewers APPROVE; evidence logs committed; user's explicit okay recorded.
- Commit: `chore: final verification wave evidence (ext F1-F4 approve)`.

## Final verification wave

Run after ALL todos; ALL four must APPROVE before declaring complete; surface results and wait for the user's explicit okay (per original plan line 52):

- **F1 Plan compliance audit:** every todo's acceptance criteria checked against actual repo state (walk each todo, verify criteria, no skipped verifications).
- **F2 Code quality review:** whole-branch review of all new code (Componentry adaptations, supabase client, auth-flow, session, LoginPanel) — CRITICAL/HIGH issues fixed before approval; secret-leak grep (`sbp_`, `service_role`, `.env*` staged) must be 0.
- **F3 Real manual QA:** open the production build (`vite preview`) in a real browser; full user journey (kinetic sections render; Sign in → email → REAL OTP → signed in → reload → still signed in → Log out); failure paths (invalid inputs, incomplete OTP, phone SMS-provider-missing, Escape/focus restore); mobile viewport 375px; reduced-motion emulation; console error capture.
- **F4 Scope fidelity:** confirm nothing from Scope OUT was built (no raw resume-text storage, no guest storage, no analytics, no serverless, no WebGL, no core changes, no `service_role` in client, no extra deps, privacy copy truthful) and nothing in Scope was dropped (all 7 sections kinetic, real Supabase auth delivered, per-user dashboard + history delivered, docs updated).

## Commit strategy

- Conventional commits (`feat:`, `docs:`, `chore:`), one per todo, atomic, on branch `feat/resume-analyser`; never push to `main` without explicit user consent.
- Evidence logs are gitignored (`*.log`) → `git add -f .omo/evidence/ext-*.log`.
- Suggested sequence: `feat:` ×9 (1.1–1.4, 2.2, 2.3, 3.2, 3.3, 3.4), `chore:` ×3 (2.1 provision, 3.1 install, 4.1 evidence), `docs:` (2.4).
- `.env.local` must NEVER be committed (gitignore enforced; `git status` verified clean of `.env*` at every commit).
- HANDOFF.md appended at session end per repo convention.

## Success criteria

1. EVERY section of the landing page (Header, Hero, SkillsMarquee, ToolSection, HowItWorks, SampleReport, Footer) has a Componentry-sourced kinetic treatment, restyled to ink-on-paper tokens — the Footer animation gap is closed.
2. At least one Componentry animated component integrated and provenance recorded in HANDOFF (original plan success criteria #4 finally fulfilled).
3. All new motion respects `prefers-reduced-motion` (static equivalents), causes no layout shift (CLS < 0.1), and keeps LCP < 2.5s (velocity strip + cascade reserved-space containers).
4. **Real Supabase Auth working:** a new free-tier project provisioned from the user's PAT; email OTP sign-in works end-to-end with a real code from a live inbox; phone OTP flow wired with a graceful provider-missing error (documented); signed-in header state (masked identifier + Log out); session persists across reload (Supabase token) and logs out cleanly.
5. **Privacy-first intact:** no guest storage, no raw resume-text storage (any user — signed-in history stores metrics + filename only under RLS), no analytics, no user data beyond the sign-in identifier + saved history; analyser stays 100% local; privacy copy truthful about the on-device session token AND the saved-history feature; `service_role` never in client code; no secrets committed (grep-verified).
6. No `framer-motion` dependency added (imports rewritten to `motion/react`); no WebGL/particle components; analyser core untouched; deps = `@supabase/supabase-js` + the four `@radix-ui/react-*` individuals ONLY if actually imported (recorded decision), `recharts`/`lucide-react`/consolidated `radix-ui` already present.
7. All tests green: 57 existing + new auth-validation/auth-flow/session/supabase-client/LoginPanel/history tests; typecheck 0, lint 0, build 0.
8. Docs: HANDOFF Componentry provenance + Supabase setup/limits/SMS caveat/Vercel env note + dashboard/history notes; README updated with the real-auth feature and updated privacy wording.
9. **Personal dashboard delivered (NEW):** signed-in users can open a dashboard from the Header, see all their analyses visualized (KPI cards, score trend, section breakdown, recent analyses table), reach the analyser from it, and are gated out when signed out (landing only); empty-history state renders.
10. Final verification wave F1–F4 all APPROVE and the user gives explicit okay before "done" is claimed.
