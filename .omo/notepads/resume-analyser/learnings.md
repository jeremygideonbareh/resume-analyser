## 2026-08-13 Todo 1.1
- Windows excluded TCP port ranges (netsh): 4738-4937, 5041-5240, 8032, 9032, 12484-12583, 41216-41415, 48512-48611, 50000-50059, 59407-59506. Ports in these ranges fail with EACCES even for plain Node. Vite default 5173 is safe. For dev-server smoke tests use --port 5173 or another port outside these ranges.
- Start-Process with npm shim on Windows doesn't reliably spawn the server; use 'node node_modules\vite\bin\vite.js' directly or Start-Job with Set-Location first.
- shadcn CLI v4.17 dropped components into a literal '@\components\ui' dir at project root instead of src/components/ui (alias misresolution) � relocate manually.
- TS 6.0: baseUrl deprecated; paths work standalone in tsconfig (relative to config file).
- Vite 8 warns on __dirname in vite.config.ts; use import.meta.dirname.

## 2026-08-13 Todo 1.2 EXECUTION (per redesign directive)
- Redesign shipped directly (task() dispatch billing-blocked; plan pins direct execution fallback + user directive "do the changes yourself and verify yourself").
- Signature motif implemented: `.lab-dots` (radial dot grid, 24px) + `::before` dot-ripple mask animation (2.4s ease-in-out, 0.2s delay, forwards) + `.scanline` (2px emerald sweep, 3.2s infinite) — all gated behind `prefers-reduced-motion: no-preference`; reduced-motion yields static dots, no animations (verified: animationName 'none' under emulation).
- QA PASSED: no horizontal overflow at 375/768/1280; ripple mid-flight mask captured (black ring 76%); 0 console errors; evidence saved to `.omo/evidence/1-2-redesign-{375,768,1280,ripple,reduced-motion}.png`.
- Visual QA via DOM computed styles (multimodal-looker unavailable — same billing block): h1 88px/600/-1.76px tracking, em italic accent oklch(0.58 0.13 162), badge IBM Plex Mono 11px, magnetic CTA "Analyse my resume", ghost link, 3-item mono meta row.
- Files touched: src/index.css (lab-dots/scanline block appended), src/components/sections/{Hero,ToolSection,HowItWorks}.tsx rewritten, src/components/layout/Footer.tsx polished.
- Playwright via skill_mcp: use forward-slash paths in page.screenshot() (backslash escaping breaks the injected script); check animations on the CORRECT element (`.lab-dots::before`, not `#top::before`).
- PowerShell: `&&` invalid → use `;`. Pending: commit Todo 1.2 on feat/resume-analyser.


- magic-dev-21st MCP is NOT reachable via skill_mcp (only skill-embedded MCP servers are exposed; "MCP server 'magic-dev-21st' not found"). Do not retry skill_mcp for it.
- 21st.dev sourcing mechanism (verified): browse `https://21st.dev/community/components/s/<tag>` → extract `/@<user>/components/<slug>` links → navigate → in-page `performance.getEntriesByType('resource')` → fetch tRPC URLs containing `demos.feed` → parse JSON for `demo_code` → webfetch `https://cdn.21st.dev/<user>/<component>/<demo>/code.demo.<ts>.tsx` (full source). Alt with bash: `npx shadcn@latest add https://21st.dev/r/<author>/<component>`.
- Awwwards SOTD judging: Design 40 / Usability 30 / Creativity 20 / Content 10; ≥6.5 Honorable Mention. Jurors reward: original art direction, ONE signature moment, directed motion, designed loading, no random effects, 60fps, reduced-motion support, mobile parity.
- SOTD winners palette: light editorial (near-black rgb(34,34,34) on off-whites rgb(248,248,248)) — validates ink-on-paper tokens; the "generic" feel was composition, not palette.
- 21st.dev components captured: larsen66 DarkGradientHero (full source), larsen66 upload-ui UploadCard states + .lab-bg ripple CSS (ported to ResumeLab lab-dots/scanline), mdafsarx hover-footer.
- Redesign directive lives at `.omo/plans/resume-analyser-redesign.md` (decision-complete; worker executes on /start-work).

