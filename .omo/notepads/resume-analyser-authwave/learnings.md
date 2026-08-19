# resume-analyser-authwave — Learnings

## Inherited wisdom (from resume-analyser notepad, prior waves)
- Supabase FREE tier: email templates NOT modifiable (403 on template PATCH); default emailer sends magic link. `mailer_autoconfirm` is a config FLAG (not a template) — PATCH single field only; full-config PUT/PATCH rejected (SMTP conflict). Management API auth config fields are FLAT (no nested objects).
- Vitest: globals DISABLED → explicit `afterEach(() => cleanup())` in every RTL test file; motion useReducedMotion snapshots at module level → vi.mock('motion/react') with vi.hoisted mutable object; jsdom lacks IntersectionObserver → stub no-op class for useInView.
- Playwright MCP: cdp_url top-level `http://127.0.0.1:9222`; kill orphaned chrome.exe PIDs holding mcp-chrome profile lock; screenshots land in MCP cwd → copy to .omo/evidence; setInputFiles with PATH strings; CSS class selectors need escaping (h-0.5 → .h-0\.5).
- PowerShell 5.1: no `&&` (use `;`); Set-Content -Encoding UTF8 writes BOM (cosmetic); append evidence via [System.IO.File]::AppendAllText UTF8; kill exact node PID before git checkout (file-lock).
- GitHub push: `$env:GH_TOKEN` = gho_ token from Windows Credential Manager; "git :" NativeCommandError on stderr is noise; verify with git ls-remote. npx gh-pages FAILS auth → orphan-branch dance with plain git.
- Secret gate: `git grep "sbp_"` matches .env.example placeholder — review matches for actual token values, not presence.
- Header signed-in Dashboard link must be OUTSIDE hidden sm:flex nav. Escape-to-close in LoginPanel only fires when focus is inside panel. recharts width(-1) warning benign. DB timestamps: slice(0,10) before date parsing.
- Session persistence: Supabase localStorage token storage already gives "stay logged in unless logged out" — no storage work needed.
- Magic-link fix pattern (prior wave): `emailRedirectTo: window.location.origin + window.location.pathname` with `typeof window !== 'undefined'` guard — REUSE for resetPasswordForEmail redirectTo.
- Old test account resumelab-test-223306696a@emalupe.com has NO password → unusable after switch (D5, no migration).
## [2026-08-19 14:30] BILLING BLOCK - DIRECT EXECUTION MODE
task() subagent dispatch returned: 'No payment method. Add a payment method here: https://opencode.ai/workspace/wrk_01KX04WJHPA6XBQ85ZEDFYGQXR/billing' (both Phase A and Phase C dispatches). Same block as prior wave (learnings line 28). Precedent: plan pins direct-execution fallback + user directive 'do all the work yourself and verify yourself'. Proceeding with DIRECT implementation by orchestrator. All verification still performed by orchestrator.
