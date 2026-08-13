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

## 2026-08-13 Todo 2.1 EXECUTION (parsing engine)
- Created src/lib/parsing.ts (extractTextFromFile, ParsingError codes file-too-large/unsupported-type/no-text/parse-error, MAX_FILE_BYTES 5MB, MIN_TEXT_CHARS 50, LOW_CONFIDENCE_CHARS 200 -> possible-scanned warning), scripts/make-fixtures.mjs (pdf-lib + docx pkg), fixtures sample.pdf/docx/txt (marker "FixtureName"), src/lib/__tests__/parsing.test.ts (9 tests).
- pdfjs-dist installed is v6.2.108 (plan referenced v4) - MAJOR API DIFFERENCES:
  1) MAIN build (pdfjs-dist) FAILS to import in Node (browser globals at module load). Use pdfjs-dist/legacy/build/pdf.mjs - works in BOTH browser and Node. Single import path.
  2) doc.destroy() REMOVED in v6 -> use the LoadingTask: const task = getDocument({data}); const doc = await task.promise; ... finally { await task.destroy() }.
  3) isEvalSupported option REMOVED from DocumentInitParameters (TS2353) - pass { data } only.
  4) workerSrc must be set ONLY in browser (	ypeof window !== 'undefined'). In Node/Vitest setting it makes pdf.js dynamic-import the worker via the ?url-resolved path -> "Setting up fake worker failed: Cannot find module 'C:\node_modules\...'" (path mangled). Without workerSrc in Node, pdf.js uses built-in fake worker (main thread) - works.
  5) Cosmetic warning "Ensure that the standardFontDataUrl API parameter is provided" - extraction still works; standardFontDataUrl/cMapUrl need a served directory (Vite can't ?url a dir) - documented limitation for CJK/standard-font edge cases.
- mammoth 1.12.1: types say { arrayBuffer } is valid Input, but the NODE build's unzip.openZip only accepts path|buffer|file -> "Could not find file in options". Browser build accepts arrayBuffer. Fix: runtime detect globalThis.Buffer -> pass { buffer: Buffer.from(ab) } in Node, { arrayBuffer } in browser.
- Test gotcha: short-text warning test needs text between 50 and 200 chars (34-char text throws no-text instead).
- Test file imports node:fs/process/Buffer -> tsconfig.app.json types:["vite/client"] blocks node globals -> add /// <reference types="node" /> at top of test file (file-scoped, doesn't pollute app).
- Evidence: .omo/evidence/2-1-parsing-test.log (9/9 PASS), 2-1-build.log. Build exit 0. Dev smoke 200/0 errors.

## 2026-08-13 Todo 2.2 EXECUTION (UploadZone + tests)
- Created src/components/UploadZone.tsx (phases idle/parsing/error/success; drag-drop onDragOver/onDrop + hidden input accept .pdf,.docx,.txt + paste Textarea expander -> File([text],"pasted-resume.txt",{type:"text/plain"}) -> same handleFile path; error copy mapped per ParsingError code; role="button" + Enter/Space open picker; role="alert" errors; reset/"Try another resume"; success "{FORMAT} · {N} words"). Wired ToolSection.tsx: <UploadZone onParsed={(p)=>setParsed(p)}/>, parsed state held for Todo 3.2.
- CRITICAL RTL gotcha: Vitest globals are DISABLED (default config) so @testing-library/react auto-cleanup NEVER hooks in -> DOM accumulates across tests -> "Found multiple elements with role button" + querySelector grabs stale zone from a previous test. Fix: import { cleanup } and afterEach(() => cleanup()) in the test file. This was the root cause of 3/3 failures.
- RTL fireEvent.change(selector, { target: { files: [file] } }) triggers the input onChange; component then does e.target.value = '' (allowed in jsdom).
- TS: vi.mock factory return must type ParsingError.code as string (or cast); SAMPLE_PARSED fixture needs explicit `: ParsedResume` annotation or `format: 'txt'` widens to string -> TS2345 on toHaveBeenCalledWith. Type imports from the mocked module are safe (erased at runtime).
- Removed unused lucide FileText import in ToolSection (TS6133, noUnusedLocals).
- Playwright MCP browser lock: "Browser is already in use" -> launch headless Chrome: chrome.exe --headless=new --remote-debugging-port=9222 --user-data-dir=... then attach via cdp_url=http://127.0.0.1:9222. MCP VM has NO require, NO dynamic import -> use setInputFiles with PATH strings (file must exist on disk; created 5MB+100B temp file via PowerShell). Regex escaping: in waitForSelector the pattern is a STRING (\\d -> digit class), in page.evaluate it is a regex LITERAL (\\d -> literal backslash+d). Over-escaped evaluate regex returned null first run.
- MCP screenshots save to MCP cwd (C:\Users\cloud\.omo\evidence\) NOT project dir -> copy into .omo/evidence/ after QA.
- Final: 16/16 tests PASS (9 parsing + 6 UploadZone + 1), build exit 0, browser QA success "TXT · 50 words" + error "File must be under 5MB." 0 console errors. Evidence: 2-2-component-test.log, 2-2-build.log, 2-2-upload-success.png, 2-2-upload-error.png.

## 2026-08-13 Todo 3.1 EXECUTION (analysis engine)
- Created src/lib/skills-lexicon.ts (~230 curated skills, lowercase set + precompiled word-boundary regex pairs; findSkills() scans text once per call; escaped via replace(/[.*+?^${}()|[\]\\]/g, '\\$&')). Include hyphenated names (next.js, react-native, machine-learning) - boundary class [^a-z0-9] treats - and . as separators so they match inline.
- Created src/lib/analysis.ts: analyzeResume(text, opts {jdText?, warnings?}) -> AnalysisResult {score, breakdown, sections, skills, presentKeywords, missingKeywords, feedback, warnings}. Weights: keywords 45, structure 17, formatting 12, recency 13, contact 8, parse-confidence 5 (can go -5 for possible-scanned, +5 for >=200 chars clean text). breakdown sums EXACTLY to score (all earned rounded, score clamped 0-100).
- Section headings: HEADING_RE anchored at line start with (?:$|[:--]) terminator -> "Skills:" or "Experience" match, "experience with React" does not. SECTION_NAMES = 12 variants (summary/professional summary, experience/work experience, education, skills/technical skills, core competencies, about me, profile, objective, projects, certifications). Structure sub-score = presence of experience+education+skills (each 1/3 of 17).
- Formatting: BULLET_RE /^[\s]*[•\-*▪]\s+/m (6 pts) + QUANTIFIED_RE %/currency/action-verbs (6 pts, capped at min(count/2,1)).
- Contact: email (3) + phone (3) + linkedin (2) = 8. CRITICAL: a loose phone regex /(?:\+?\d[\d\s().-]{7,}\d)/ falsely matches date ranges "2021 - 2024". Use strict (area) shape: /\b(?:\+?\d{1,3}[\s().-]?)?\(?\d{3}\)?[\s().-]?\d{3}[\s().-]?\d{4}\b/.
- Recency: any (20\d{2}) year present = full 13 points (plan: recent dates present).
- JD keywords: split JD on non-alphanumerics, len>=3, not stopword, keep if in SKILLS OR has a capital letter (proper-noun signal: React, AWS, Postgres). present = substring in lowercased resume; missing = rest. Sub-score = present/total * 45 (guard: 0 keywords -> 0, not NaN). Without JD: lexicon coverage min(skillsFound/10, 1) * 45.
- Feedback: rule-driven. Empty -> critical. No email+phone -> critical "Add your email and phone...". No bullets -> warning. No quantified -> warning (with example). No summary -> info. Missing experience/education/skills sections -> info each. Missing JD keywords top 5 -> warning "Add these keywords: ...".
- Tests: 7 new (strong fixture: 12+ skills -> 45 kw, all sections, bullets 6+quantified 6, contact 8, +5 parse = 100; weak 0; JD 3/5 -> 27; empty score 0 + no-content, no throw; bounds; breakdown==score; scanned -5). Suite 23/23, build exit 0.
- Evidence: 3-1-analysis-test.log (23/23), 3-1-build.log. NOTE: rtk wrapper shows its own "PASS (N) FAIL (M)" line; use `rtk npx vitest run` for the canonical vitest summary lines.
## 2026-08-13 Todo 3.2 EXECUTION (wire analysis flow)
- Rewrote ToolSection.tsx with state machine idle -> parsed -> analyzing -> done. handleParsed sets parsed + resets result; handleAnalyse runs analyzeResume(parsed.text, { jdText: jdText.trim() || undefined, warnings: parsed.warnings }) inside requestAnimationFrame (lets analyzing state paint one frame; sync, no artificial delay); handleReset clears everything back to idle. Wired warnings through so possible-scanned -> parse-confidence -5 penalty applies in the UI too.
- Created src/components/ReportView.tsx (minimal-but-complete renderer for Todo 3.2): scorecard with band fn scoreBand (>=70 emerald Strong / 40-69 amber Needs work / <40 red Weak), breakdown bars (earned/weight, accent fill, pct clamped 0-100), sections chips (only present), skills wrap-chips with count, JD keywords Present (emerald) / Missing (outline) groups with counts (rendered only when present+missing non-empty), numbered feedback list. Todo 4.1 will upgrade this with Recharts/print/copy/drill-down.
- Browser QA via Playwright CDP (Chrome 151 on :9222): fixture sample.txt -> Analyse -> report "ATS Score 54" (engine math: kw 23 + structure 17 + formatting 6 + recency 0 + contact 3 + parse +5 = 54), Skills extracted (5) = react/typescript/node.js/sql/aws, reset -> idle works. JD flow: JD with React/TypeScript/SQL/AWS/Docker/Kubernetes/Python/Figma -> Present (5) / Missing (7). NOTE: capitalized proper nouns (Senior, Full, Stack, Developer) count as JD keywords too -> resume containing "Senior Software Engineer" matches "senior" as present. Expected behavior per extraction rule (SKILLS.has OR /[A-Z]/).
- Zero server calls verified: page.on('request') filtered resourceType fetch/xhr -> [] for the entire upload-analyse-reset flow. Acceptance "no server calls anywhere" proven in-browser.
- Playwright gotcha: getByText('ATS Score', { exact: true }) is a STRICT MODE violation because the Todo 1.3 SampleReport mock scorecard (#sample) also renders "ATS Score" (twice). Scope waits to page.locator('#tool') for anything the mock scorecard duplicates. Use #tool-scoped locators for report assertions.
## 2026-08-13 Todo 4.1 - Report UI (charts, scorecard, print/export) - DONE
- Recharts v3 gotchas found via browser QA:
  - Bars with radius render as <path> elements inside .recharts-bar-rectangles g.recharts-layer, NOT .recharts-bar-rectangle rects. Click target for drill-down: .recharts-bar-rectangles path (index = CHART_CATEGORIES order: keywords=0, structure=1, formatting=2, recency=3, contact=4).
  - All-zero bars (weak resume score 0) render NO clickable path shapes - drill-down QA must use a non-zero fixture (sample.txt, score 54, has formatting feedback).
  - Tooltip wrapper: .recharts-tooltip-wrapper - one per chart, first in DOM = radar chart's. Hovering bar activates the 2nd wrapper; check getComputedStyle(w).visibility === 'visible' across ALL wrappers, never read only the first.
  - Custom tooltip content returning null when inactive is fine; recharts toggles wrapper visibility itself.
- Count-up: ease-out-quart rAF over 800ms; useReducedMotion -> instant (QA: reducedMotion 'reduce' -> score renders 100 immediately, no wait needed).
- Charts: isAnimationActive={!reduce} animationDuration={700}; RadarChart outerRadius 68%; BarChart layout=vertical, XAxis hide domain [0,100].
- Drill-down state: selected category id -> feedback li gets bg-accent-soft ring-1 ring-accent; note text 'Drill-down - feedback for "Label":' or 'No specific feedback for this category.'
- Print: root id="report-print" + .no-print toolbar; index.css @media print hides everything but #report-print (visibility trick).
- sonner: <Toaster position="bottom-right" /> in main.tsx; toast.success('Summary copied to clipboard').
- Deps added: recharts ^3.10.1, sonner ^2.0.8.
- QA evidence: 4-1-report-success.png, 4-1-charts.png, 4-1-report-weak.png + 4-1-test.log (32/32), 4-1-build.log (exit 0). Strong=100 emerald, weak=0 red (7 feedback items), sample=54 amber; JD chips 7/2; 0 console errors.
- Commit: feat: add report view with interactive charts, scorecard, and print support

## 2026-08-14 Todo 4.4: Kinetic loading system (commit pending)
- KineticLoader.tsx: ScanSkeleton (resume card + shimmer .skeleton-shimmer + sweeping scan line + mono ticker via useTicker 650ms), AnalyzingSkeleton (score 0->100 ease-out-quart 900ms rAF, 5 CATEGORY_BARS staggered ease-out-expo delay i*0.1, SKILL_CHIPS pop-in 0.35+i*0.08), ReportReveal (useInView once margin -40px, opacity+y 16px, ease [0.16,1,0.3,1], delay prop).
- UploadZone: PARSING_MIN_MS=400 min-display so scan treatment is visible on fast parses; phase blocks wrapped in AnimatePresence mode="wait" initial={false}, 200ms easeOut fade/slide; parsing phase renders ScanSkeleton (replaced Loader2).
- ToolSection: ANALYZING_MIN_MS=700; AnimatePresence mode="wait" around idle/parsed/analyzing/done phases; JD textarea toggle in AnimatePresence height animation (overflow-hidden); analyzing renders AnalyzingSkeleton. useReducedMotion gates all transitions (reduce -> instant).
- ReportView: report sections wrapped in ReportReveal with delays 0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75. PLAN DEVIATION: plan said 500ms apart stagger, but 7 blocks * 500ms = 3.5s > 2.5s kinetic budget (acceptance criterion) -> used 0.15s increments. Recorded in plan.
- TEST GOTCHA (motion 13): motion-dom's initPrefersReducedMotion snapshots prefersReducedMotion.current ONCE at module level (guarded by hasReducedMotionListener). Stubbing window.matchMedia per-test CANNOT change it after first render. Deterministic fix: vi.mock('motion/react') and override useReducedMotion: () => reducedMotion.current via vi.hoisted mutable object. ALSO: jsdom lacks IntersectionObserver -> motion useInView (ReportReveal) throws -> stub no-op observer class.
- Test conventions: KineticLoader.test.tsx mirrors UploadZone.test.tsx (jsdom directive comment, explicit afterEach(cleanup) since Vitest globals disabled, vi.useRealTimers() reset).
- Reduced-motion QA (Playwright newContext({ reducedMotion: 'reduce' })): scan line element ABSENT (count 0), score renders 100 instantly (no count-up), 0 console errors.
- Kinetic QA measured: scan line top 0.0171% -> 12.6397% over 300ms (sweeping); analyzing score 16 -> 81 over 250ms (counting). Report settles at 100.
- Evidence: 4-4-test.log (38/38), 4-4-build.log (exit 0), 4-4-kinetic-parsing.png, 4-4-kinetic-score.png, 4-4-report-final.png, 4-4-reduced-motion.png.
- Playwright MCP: cdp_url must be top-level param http://127.0.0.1:9222 (nested fails with "Browser already in use"); CSS class selectors with dots need escaping (h-0.5 -> .h-0\.5).
- css selector gotcha: Tailwind class h-0.5 in Playwright selector must be escaped as .h-0\.5 or locator throws "Unexpected token".