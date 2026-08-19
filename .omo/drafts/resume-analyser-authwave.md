# Plan: resume-analyser-authwave

**Status:** DRAFT — awaiting explicit approval
**Date:** 2026-08-19
**Repo:** `jeremygideonbareh/resume-analyser` (PUBLIC), branch `feat/resume-analyser`, live on GitHub Pages at `https://jeremygideonbareh.github.io/resume-analyser/` (`gh-pages` @ `3327a4e`)
**Supabase:** project `mhkieytinkgouhvwrmbp` (anon key ships in bundle; PAT/service_role local-only; ROTATE PAT + GH token after wave)

## Goal

1. Replace the magic-link/OTP sign-in with **email + password** auth (sign in, create account, forgot password). Users stay logged in until they log out — already provided by existing Supabase localStorage session persistence; only the auth method changes.
2. **Remove** the "Detects 200+ skills — including React, TypeScript, SQL, Python, Java, Go" marquee section (and its now-dead motion primitives).
3. **Gate the analyser**: the resume analysis tool is usable only after sign-in. Landing/Hero/HowItWorks/SampleReport stay public.

**Explicitly OUT (user decision, this wave):** chatbot ("leave that be for now"), LLM tier changes, hosting migration, OAuth providers, phone auth, data migration for existing test accounts.

## Context (grounded)

- `src/lib/auth-flow.ts` currently wraps `sendEmailOtp`/`verifyEmailOtp`/`sendPhoneOtp`/`verifyPhoneOtp` (emailRedirectTo fix already applied for magic links — same `origin + pathname` pattern must be reused for reset-password links).
- `src/components/auth/LoginPanel.tsx` is an email/phone-tabbed identifier→OTP modal → full rewrite to email+password.
- `src/lib/session.ts` (`useAuthSession`, `maskIdentifier`) already gives persistent sessions via Supabase's localStorage storage — "stay logged in unless logged out" needs no storage work.
- `src/App.tsx`: `view = landing | dashboard`; landing = Hero → SkillsMarquee (line 41) → ToolSection(user) (line 42) → HowItWorks → SampleReport; LoginPanel modal (line ~45).
- `src/components/sections/ToolSection.tsx`: analyser state machine `idle→parsed→analyzing→done`; already receives `user`; guests currently analyse freely.
- `src/components/sections/SkillsMarquee.tsx` + `InfiniteSlider.tsx` + `ProgressiveBlur.tsx` + `scroll-based-velocity.tsx`: grep-verified the three primitives are used ONLY by SkillsMarquee → all four delete together.
- Hero badge copy: "0 UPLOADS · 0 COOKIES" — parsing is genuinely local (pdfjs/mammoth in-browser), but with gating + account saving the copy needs a fidelity touch (Decision D8).
- Deploy: static-only GitHub Pages; this wave touches no `api/` code, so no hosting change. Redeploy via the known orphan-branch dance (`npx gh-pages` fails auth; use plain git with `$env:GH_TOKEN`).
- Supabase Management API gotcha: full-config PUT/PATCH rejected (SMTP conflict) — PATCH with ONLY the changed field.

## Decisions (locked, no worker re-asking)

- **D1** Email+password only. Remove the phone tab and all four OTP code paths (`sendEmailOtp`, `verifyEmailOtp`, `sendPhoneOtp`, `verifyPhoneOtp`).
- **D2** Sign-up signs in immediately (user-approved "Sign in immediately"): PATCH auth config `mailer_autoconfirm: true` via `https://api.supabase.com/v1/projects/mhkieytinkgouhvwrmbp/config/auth` with ONLY that field.
- **D3** Minimal forgot-password (user-approved): `resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname })` (reuse magic-link fix); app listens for `PASSWORD_RECOVERY` in `onAuthStateChange` → shows "set new password" form → `supabase.auth.updateUser({ password })`.
- **D4** Password rules (adopted default): min 8 chars, confirm field on create-account, client-side validation in `src/lib/auth-validation.ts` (email shape + password length + confirm match).
- **D5** No data migration: old test account (`resumelab-test-223306696a@emalupe.com`) has no password → unusable after switch; its saved rows remain under the old user ID. New accounts see only their own rows (RLS already enforces).
- **D6** Marquee removal deletes `SkillsMarquee.tsx` + the three primitives in one commit; grep must confirm zero remaining refs (incl. tests).
- **D7** Analyser gating: `ToolSection` renders a locked panel (icon + "Sign in to analyse your resume" + Sign in button) when `user === null`; new `onSignIn` prop wired from `App.tsx` to open the existing LoginPanel. Header "Analyse" CTA stays (lands on tool → prompts sign-in).
- **D8** Hero copy fidelity: badge "0 UPLOADS · 0 COOKIES" → "100% LOCAL PARSE"; subline gains "Files never leave your browser. Sign in to save results to your account." (user may veto wording at approval).
- **D9** Error UX: friendly inline messages + sonner toasts; map Supabase codes ("User already registered", "Invalid login credentials", rate-limit) to human text.
- **D10** Deploy remains GitHub Pages; same orphan-branch dance; commits pushed; rotate Supabase PAT + GH token after wave (both appeared in plain text in chat).

## Must-Have (phased, each phase independently verifiable)

### Phase A — Auth-flow library rewrite
- A1 `src/lib/auth-flow.ts`: add `signUpWithEmail(email, password)`, `signInWithPassword(email, password)`, `sendPasswordResetEmail(email)` (with redirectTo per D3), `updatePasswordFromRecovery(password)`; remove all four OTP functions. Keep `signOut`.
- A2 `src/lib/session.ts`: confirm `useAuthSession` surfaces a recovery flag when `PASSWORD_RECOVERY` fires (expose `isRecovery` or similar) without changing persistence behavior.
- A3 Tests: rewrite `auth-flow.test.ts` (mock supabase client; assert function calls, redirectTo, removed OTP paths gone); add validation tests in `auth-validation.test.ts`.
- **Verify:** `npm test` green for these files.

### Phase B — LoginPanel rewrite
- B1 `LoginPanel.tsx`: tabs **Sign in | Create account**; email + password inputs; submit → `signInWithPassword` / `signUpWithEmail`; "Forgot password?" link → email-only form → "Check your email" state; recovery view (when `isRecovery`) → new password + confirm → `updatePasswordFromRecovery`. Phone tab removed.
- B2 Tests: rewrite `LoginPanel.test.tsx` — sign-in happy path, wrong-credential error, create-account (incl. password confirm mismatch + short password), forgot-password flow, recovery view.
- **Verify:** `npm test` green; manual `npm run dev` pass.

### Phase C — Supabase config + real verification
- C1 PATCH auth config `{"mailer_autoconfirm": true}` (Management API, `$env:SUPABASE_PAT` from `.env.local`); GET to confirm persisted. Do NOT send a full-config body.
- C2 Real-flow verification: create account → signed in immediately (no confirmation email) → analyse → save → log out → log back in with same email+password → refresh → still signed in.
- **Verify:** auth actually works end-to-end before any frontend feature ships.

### Phase D — Marquee removal
- D1 Delete `SkillsMarquee.tsx`; remove its import/usage in `App.tsx`; delete `InfiniteSlider.tsx`, `ProgressiveBlur.tsx`, `scroll-based-velocity.tsx`; grep repo (incl. tests) for zero refs; update any tests that rendered App/landing with the marquee.
- **Verify:** `npm test` + `npm run typecheck` + `npm run lint` green; landing renders without the section.

### Phase E — Analyser gating + copy
- E1 `ToolSection.tsx`: `user === null` → locked panel with Sign-in CTA (`onSignIn` prop); else existing state machine unchanged. `App.tsx` passes `onSignIn={() => setLoginOpen(true)}`.
- E2 `Hero.tsx` copy per D8.
- E3 Tests: ToolSection gating test (locked for null user, unlocked for user); update any Hero copy assertions.
- **Verify:** `npm test` + typecheck + lint green; dev-mode guest sees locked panel, signed-in user analyses.

### Phase F — Full gates, deploy, live smoke, wrap-up
- F1 Full gate run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — all clean.
- F2 Commit (conventional, e.g. `feat: email+password auth, gate analyser, drop skills marquee`) + push `feat/resume-analyser`.
- F3 Deploy to `gh-pages`: build → orphan-branch dance with `$env:GH_TOKEN` (npx gh-pages fails auth on this machine).
- F4 Live smoke on the deployed URL: new throwaway account → sign up → immediately signed in → upload + analyse → result saved → dashboard shows it → log out → log in → refresh persistence → 0 console errors. Screenshot + log to `.omo/evidence/` (e.g. `ext-5-prod-smoke.log`, `ext-5-prod-auth.png`).
- F5 HANDOFF.md deploy/auth note update; boulder entry for this wave completed; rotate Supabase PAT + GH token.

## Must-NOT-Have
- Chatbot / chat UI / AI assistant (user: "leave that be for now").
- Any LLM tier change (`api/analyze.ts`, `llm.ts`, `VITE_ENABLE_LLM`, AiFeedbackSection untouched).
- Hosting migration (Vercel/Netlify) — no serverless endpoints needed this wave.
- Phone auth, OAuth providers (Google etc.), remember-me toggles.
- Data migration / backfill for pre-existing test accounts.
- Changes to `api/`, CSP, `vite.config.ts` (no new endpoints → no connect-src changes).

## Risks
- **Recovery-link redirect quirks on Pages subpath** → mitigated by D3's explicit `redirectTo` (proven pattern from the magic-link fix).
- **Autoconfirm enables spam signups** → acceptable for this project now; note in HANDOFF that `disable_signup` can be flipped later.
- **Old test account orphaned** → expected per D5; document in HANDOFF.
- **Public repo secret exposure** → PAT/GH token rotation is a hard exit criterion (F5).

## Exit criteria (all must hold)
1. All gates green: tests (≥ previous 129, all passing), typecheck 0, lint 0, build 0.
2. Live site: email+password sign-up signs in immediately; login/logout/refresh-persistence verified; wrong credentials show friendly error.
3. Marquee section gone from landing; grep-zero for deleted files.
4. Guest visiting the site cannot analyse (locked panel + Sign-in CTA); signed-in user can.
5. Evidence files in `.omo/evidence/`; commits pushed; HANDOFF updated; secrets rotated.
