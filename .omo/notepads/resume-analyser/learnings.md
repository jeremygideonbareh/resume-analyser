## 2026-08-13 Todo 1.1
- Windows excluded TCP port ranges (netsh): 4738-4937, 5041-5240, 8032, 9032, 12484-12583, 41216-41415, 48512-48611, 50000-50059, 59407-59506. Ports in these ranges fail with EACCES even for plain Node. Vite default 5173 is safe. For dev-server smoke tests use --port 5173 or another port outside these ranges.
- Start-Process with npm shim on Windows doesn't reliably spawn the server; use 'node node_modules\vite\bin\vite.js' directly or Start-Job with Set-Location first.
- shadcn CLI v4.17 dropped components into a literal '@\components\ui' dir at project root instead of src/components/ui (alias misresolution) � relocate manually.
- TS 6.0: baseUrl deprecated; paths work standalone in tsconfig (relative to config file).
- Vite 8 warns on __dirname in vite.config.ts; use import.meta.dirname.

## 2026-08-13 Todo 1.3 (user pasted 21st.dev components + research directive)
- User pasted: ibelick `hero-section-4` (SaaS hero: InfiniteSlider + ProgressiveBlur + fake-logos marquee, next/link imports) + interior-design `about-us-section` (services grid + StatCounter spring count-ups). User direction: "use this for hero section ... add a case study example to show what an output can work, research real companies' recruitment guidelines for engineering positions, make sure the website is well suited for it."
- PINNED (user-approved): KEEP lab-dots/scanline hero (3c66e5a); salvage InfiniteSlider + ProgressiveBlur as SKILLS MARQUEE under hero (no fake logos); repurpose about-us layout as SAMPLE-REPORT case study with real ATS guidance. Full spec in plan Todo 1.3.
- ADAPTATION RULES for pasted components: project has `motion` v13 (motion/react), NOT framer-motion — rewrite imports; NO next/link (Vite SPA) — use anchors; `react-use-measure` NOT installed → implement local useElementSize ResizeObserver hook (bash flaky, avoid npm install); ui/ has button/card/input/textarea/progress; cn() in src/lib/utils.ts; SectionReveal/StaggeredReveal in src/components/motion/.
- HARNESS MODE: prometheus-md-only gate re-enabled mid-session (Todo 1.2 src edits succeeded, 1.3 component writes blocked). /start-work hook misfired searching C:\Users\cloud (found stray plans fix-product-save-logic etc.). Re-run /start-work from PROJECT DIR to unlock.

## 2026-08-13 ATS RESEARCH (real companies' engineering recruitment guidelines, 2026 web)
- Scale: 99% of Fortune 500 use ATS (Jobscan via resumebold); ~75% of resumes rejected before human review; avg 250 applicants/role. ATS = parse + keyword-match + rank; recruiter sees ranked list, not raw resumes.
- Platforms 2026: Workday (enterprise-dominant), Greenhouse (tech/startups), Lever (mid-market), iCIMS (healthcare/retail/gov), Taleo/Oracle (legacy ~12%: Nike/Tesla/Boeing, older parsing, more format-sensitive), BambooHR, Jobvite. Workday+Greenhouse have best parsing.
- Parser-safe format (ALL sources): single-column reverse-chronological; standard headings (Summary/Professional Summary, Skills, Experience/Work Experience, Education); 10–12pt standard font; simple round bullets; standard date format; NO tables/text-boxes/images/icons/logos/multi-column; nothing in page header/footer; avoid image-based PDFs (design-tool exports) — .docx safest; spell out acronyms once ("Search Engine Optimization (SEO)"); 1–2 pages; contact info in header not footer.
- Keywords: mirror JD EXACT phrasing ("React.js" not "React"); 10–15 keywords from JD; repeat important ones 2–3x naturally; highest weight = summary + FIRST bullet of each role; no keyword stuffing / white-on-white (modern ATS flags it); use both acronym + spelled-out forms.
- **70%+ match = commonly cited passing threshold** (resumeoptimizerpro); context matters (65% on hard role > 75% on generalist).
- Google (resumeadapter 2026): NO third-party ATS, recruiters hand-review; 4 hiring attributes + Googleyness (intellectual humility, collaboration, user impact, comfort with ambiguity); acceptance <1%; keywords: data structures, algorithms, problem-solving, collaboration, innovation.
- Amazon: proprietary amazon.jobs ATS (not Workday); 16 Leadership Principles (Customer Obsession, Ownership, Bias for Action, Raise the Bar…) — LP-aligned resume language + STAR bullets with metrics; values AWS (EC2/S3/Lambda), Python/Java/C++, system design, distributed systems, DSA; 1–2 pages concise.
- Meta: 5 core values (Move Fast, Build Social Value…), E3–E9 engineering ladder; "build social value" signals via volunteering/interests.
- Section order best for ATS 2026: contact → summary → skills → experience → education → certifications.
- FEEDS: Wave 3 scoring weights (already 70% threshold adjacent), feedback copy ("Quantify achievements", "Add summary"), site copy (hero meta "parsed like Workday/Greenhouse", sample report cards).
- Sources: igotanoffer.com (SWE keywords + 11 real examples), resumeadapter.com (Amazon/Google hubs), resumly.ai (ATS format rules), ophyai.com (Workday/Greenhouse/Lever/iCIMS/Taleo rules), flavoredresume.com (15-practice checklist), hireflow.net, workable.com (how ATS reads resumes), resumebold.com (99%/75% stats).

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


## 2026-08-13 Todo 1.3 EXECUTION (commit pending)
- Executed the 2nd-amendment spec after user re-ran /start-work with "do changes yourself" (harness flipped to worker mode).
- Created: src/components/motion/InfiniteSlider.tsx (motion/react, local useElementSize ResizeObserver hook, useReducedMotion gate + reduce in effect deps), src/components/motion/ProgressiveBlur.tsx, src/components/sections/SkillsMarquee.tsx (20 skills, duration 40, gap 40, ProgressiveBlur left/right edge fades), src/components/sections/SampleReport.tsx (StatCounter useSpring count-ups, 4 ATS-rule cards, mock scorecard 78, CTA scrolls to #tool). Wired App.tsx: Hero -> SkillsMarquee -> ToolSection -> HowItWorks -> SampleReport -> Footer.
- GOTCHA (runtime): import { HTMLMotionProps } from 'motion/react' crashes Vite pre-bundled motion_react.js ("does not provide an export named 'HTMLMotionProps'") -> MUST use import type { HTMLMotionProps }. Whole app blanked (sections=[]) until fixed.
- GOTCHA: unused import (useState in SampleReport) -> TS6133; tsc -b catches it.
- QA (Playwright, 127.0.0.1:8080): marquee translating -78 -> -155 -> -233px over 2.4s (delta -155, 40 chips = 20x2 loop); counters settle at 78/82%/4/90%; reduced-motion: marquee STATIC (x1=80, x2=80), counters jump instantly; no overflow at 1280 (1265/1265) and 375 (360/360); 0 console errors.
- Evidence: .omo/evidence/1-3-components.png, 1-3-marquee-motion.json, 1-3-reduced-motion.png.
- tsc -b: No errors found. npm run build: exit 0 (index-UM6eB2td.js 385.87 kB, gzip 121.80 kB).
- Componentry attempt skipped (bash flaky; optional per spec).
