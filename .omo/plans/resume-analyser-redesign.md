# resume-analyser — Design Directive: Awwwards-grade Redesign + 21st.dev Components

**Status:** PENDING EXECUTION (worker runs via `$start-work` / `executing-plans`)
**Date:** 2026-08-13
**Trigger:** User directive (verbatim): *"it looks too generic use the apify scraper to get inspo from awwards and use 21st dev components from each section"*
**Scope:** Amends Wave 1 Todo 1.2 (design tokens + base layout — currently in-progress, sections render but are judged "too generic") and Todo 1.3 (component sourcing). Overrides the generic centered-hero / plain-bordered-cards composition with the spec below.

---

## 1. Research completed (do NOT redo)

### 1.1 Awwwards inspiration — substituted the apify scraper with direct browsing
- **Decision (pinned):** No Apify MCP server and no `APIFY_API_KEY` exist in this environment (verified `.env` + `opencode.jsonc` on 2026-08-13). The user's intent — "get inspiration from Awwwards" — was achieved by browsing `https://www.awwwards.com/websites/sites_of_the_day/` directly via Playwright MCP and sampling SOTD winner pages (e.g. `alethia`). Recorded here so the worker does not hunt for Apify credentials.
- **Awwwards SOTD judging criteria (from the official juror guide, captured 2026-08-13):** Design 40% / Usability 30% / Creativity 20% / Content 10%. Score ≥6.5 = Honorable Mention. **What the jurors reward (verbatim intel):** original art direction, ONE signature moment, directed motion (every animation purposeful, tied to scroll/state), a designed loading experience, no random effects, 60fps, `prefers-reduced-motion` support, flawless mobile parity.
- **Palette sampled from SOTD winners:** light editorial (near-black `rgb(34,34,34)` ink on off-whites `rgb(248,248,248)`). This validates the existing ink-on-paper tokens — the problem is NOT the palette, it is the composition (see §3).
- **Diagnosis of "too generic":** single centered column, plain bordered cards, eyebrow label + headline + subcopy + button on every section (the banned "template" pattern), no signature moment. Fix per §3.

### 1.2 21st.dev — sourcing mechanism cracked (the MCP is NOT reachable)
- **Blocked path (pinned):** `magic-dev-21st` is configured globally with `21ST_API_KEY` set, but the executor's `skill_mcp` tool only exposes *skill-embedded* MCP servers ("MCP server 'magic-dev-21st' not found"). Do not attempt `skill_mcp` for it again.
- **Working path (verified 2026-08-13, reproducible via Playwright):**
  1. Browse `https://21st.dev/community/components/s/<tag>` (tags: `upload`, `hero`, `footer`, `features`, `cta`, …).
  2. Extract component links matching `/^\/@/` and containing `/components/` → e.g. `/@larsen66/components/upload-ui`.
  3. Navigate to a component page. The full source is NOT in the DOM — it is served by tRPC. In-page run:
     `performance.getEntriesByType('resource').map(e=>e.name).filter(u=>u.includes('/api/trpc/'))` → `fetch()` the URLs containing `demos.feed` → parse the JSON for keys `demo_code` (and `compiled_css`).
  4. `demo_code` is a CDN URL of the real source: `https://cdn.21st.dev/<user>/<component>/<demo>/code.demo.<ts>.tsx` → `webfetch` it for the full component code.
  5. Alternative when bash is available: `npx shadcn@latest add https://21st.dev/r/<author>/<component>` (registry URL confirmed to resolve; the page's CLI button shows this).
- **Component inventory found (all verified reachable):**
  | Section need | Component | Author | CDN/source URL |
  |---|---|---|---|
  | Hero (structure) | `hero-section-with-animated-navbar` (DarkGradientHero) | larsen66 | `https://cdn.21st.dev/larsen66/hero-section/hero-section-with-animated-navbar/code.demo.1757573862504.tsx` (full source already captured) |
  | Upload tool | `upload-ui` UploadCard — idle/uploading(progress)/success/error states | larsen66 | demo: `https://cdn.21st.dev/larsen66/upload-ui/default/code.demo.1753894766929.tsx`; compiled CSS incl. `.lab-bg` ripple: `https://cdn.21st.dev/user_2wdgsmfD3BNOOm4oOqUDUS9IXZI/upload-ui/default/compiled.2025-07-30T16:59:38.599Z.css` |
  | Footer | `hover-footer` | mdafsarx | `https://21st.dev/@mdafsarx/components/hover-footer` |
  | Hero alternatives | `liquid-metal-hero`, `vapour-text-effect`, `animated-gradient-background`, `wave-background`, `hero-ascii-one` | multiple | homepage registry (all browsable) |

---

## 2. The signature moment (carries the whole identity)

**Concept — "the robots' grid":** a dotted field (the grid an ATS parses) that ripples open radially on page load, plus a slow emerald scanline sweeping the hero. This is the ONE signature element; it ties the product's story (robots reading your resume) to the visual identity. Everything else stays restrained.

**CSS to add to `src/index.css`** (ported from the 21st.dev `.lab-bg` compiled CSS, simplified to 5 keyframes, reduced-motion safe — paste verbatim at the end of the file):

```css
/* Signature motif — the "robots' grid" (21st.dev lab-bg adapted) */
.lab-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(oklch(0.16 0 0 / 0.07) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 62%);
  mask-image: radial-gradient(circle at center, black 0%, transparent 62%);
}
.lab-dots::before {
  content: '';
  position: absolute;
  inset: -2px;
  background-image: radial-gradient(oklch(0.16 0 0 / 0.09) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(circle at center, transparent 0%, transparent 100%);
  mask-image: radial-gradient(circle at center, transparent 0%, transparent 100%);
}
@keyframes dot-ripple {
  0%   { -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 3%, transparent 100%);
         mask-image: radial-gradient(circle at center, black 0%, transparent 3%, transparent 100%); }
  25%  { -webkit-mask-image: radial-gradient(circle at center, black 0%, black 28%, transparent 40%, transparent 100%);
         mask-image: radial-gradient(circle at center, black 0%, black 28%, transparent 40%, transparent 100%); }
  50%  { -webkit-mask-image: radial-gradient(circle at center, transparent 0%, black 52%, transparent 64%, transparent 100%);
         mask-image: radial-gradient(circle at center, transparent 0%, black 52%, transparent 64%, transparent 100%); }
  75%  { -webkit-mask-image: radial-gradient(circle at center, transparent 0%, black 76%, transparent 88%, transparent 100%);
         mask-image: radial-gradient(circle at center, transparent 0%, black 76%, transparent 88%, transparent 100%); }
  100% { -webkit-mask-image: radial-gradient(circle at center, transparent 0%, transparent 100%);
         mask-image: radial-gradient(circle at center, transparent 0%, transparent 100%); }
}
@media (prefers-reduced-motion: no-preference) {
  .lab-dots::before { animation: dot-ripple 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards; }
}
.scanline {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent) 50%, transparent);
  opacity: 0;
}
@keyframes scan {
  0%   { top: 4%; opacity: 0; }
  12%  { opacity: 0.65; }
  45%  { opacity: 0.85; }
  88%  { top: 94%; opacity: 0.5; }
  100% { top: 98%; opacity: 0; }
}
@media (prefers-reduced-motion: no-preference) {
  .scanline { animation: scan 3.2s cubic-bezier(0.16, 1, 0.3, 1) 1.1s infinite; }
}
```

---

## 3. Per-section redesign spec (worker executes against these exactly)

### 3.1 Hero — `src/components/sections/Hero.tsx` (rewrite)
- Section: `relative overflow-hidden border-b border-ink/10`; background = `<div aria-hidden className="lab-dots absolute inset-0 -z-10" />` + `<div aria-hidden className="scanline" />`.
- **Badge pill** (from DarkGradientHero's badge pattern, restyled): `inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft` containing a `<span className="h-1.5 w-1.5 rounded-full bg-accent" />` pulsing dot + "ATS Resume Analyser — 100% in-browser".
- **Headline** (Fraunces display, keep the strong copy): `max-w-3xl text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink` — "Know your score *before the robots do.*" with the punchline wrapped in `<em className="font-normal italic text-accent">` (italic serif accent = editorial move, allowed since it is not gradient text).
- **Subcopy**: keep existing (line length ≤65–75ch).
- **CTAs**: MagneticButton (existing, primary) + ghost link "How it works →" with arrow.
- **Mono meta row** (editorial data strip, this is the "not generic" detail): `<dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">` with three items: `PDF · DOCX · TXT`, `≤ 5 MB`, `0 uploads · 0 cookies`.
- Keep `SectionReveal` (existing motion) — reveals once on load, ease-out-expo.

### 3.2 ToolSection — `src/components/sections/ToolSection.tsx` (rewrite shell)
- Adapt 21st.dev `upload-ui` UploadCard **states** (idle / uploading with animated progress / success / error) into the Wave-2 dropzone shell. In Todo 1.2 this is a *designed shell* — it renders the idle card with all visual states implemented (progress bar animation, status chips), wired to real parsing in Todo 2.2. Do NOT build parsing logic now.
- Idle card: dashed border (`border-dashed border-ink/20`), `bg-surface`, centered mono label "Drop your resume here — PDF · DOCX · TXT", a document icon (lucide `FileText`), and the mono meta "≤ 5 MB · parsed in your browser".
- Keep `SectionReveal` wrap. Two-column split on desktop: left = section header (mono kicker "The Analyser" + h2 + subcopy), right = the card. This breaks the centered-stack template.

### 3.3 HowItWorks — `src/components/sections/HowItWorks.tsx` (editorial restyle)
- Keep 3 steps (Upload → Analyse → Improve) and `StaggeredReveal`.
- Restyle cards: remove the plain bordered box; use editorial numbered steps — oversized mono numerals `text-5xl font-mono text-ink/15` behind, title in Fraunces, one accent top rule per card (`border-t-2 border-accent`), step label chip (`font-mono text-[11px] uppercase tracking-[0.14em] text-accent`).
- Header: keep mono kicker + h2; add italic accent word in the h2 (`"Three steps to a <em className="italic text-accent">better</em> resume."`).

### 3.4 Footer — `src/components/layout/Footer.tsx` (polish)
- Keep the privacy note + brand mark. Add a mono meta row: `© 2026 ResumeLab` + `v0.1.0` + `Privacy first — no uploads, no storage, no cookies` in `font-mono text-[11px] uppercase tracking-[0.14em] text-muted`.
- Optional: hover underline slide on brand (from `hover-footer`) — only if trivial, do not add new dependencies.

---

## 4. Execution notes for the worker

- **bash availability is FLAKY in the current session** (it disappeared mid-session). The verification loop that ALWAYS works: dev server already runs detached on `http://127.0.0.1:8080` with HMR (port 8080, `--host 127.0.0.1` — Windows excluded ranges make 5173/4738–4937/5041–5240/etc. EACCES). Save screenshots via Playwright MCP to `.omo/evidence/`. Run `npm run build` / `typecheck` / `git commit` only when bash is available; never block the whole todo on bash.
- Playwright MCP node processes (PIDs 13932, 24716) are infra — never kill.
- Do not re-run the Awwwards/21st.dev research; use §1–§2 directly.
- All edits are pure refactors of existing files + the CSS block in §2 — no new dependencies, no new packages.

## 5. QA for this directive (replaces the old Todo 1.2 QA evidence names)

- **QA happy:** Playwright screenshots at 375/768/1280 → no horizontal scroll; hero shows dotted grid + scanline; sections render per spec → evidence: `.omo/evidence/1-2-redesign-{375,768,1280}.png`.
- **QA signature moment:** screenshot within 1s of load shows the dot-ripple mid-animation (not blank) → evidence: `.omo/evidence/1-2-redesign-ripple.png`.
- **QA failure:** Playwright `reducedMotion: 'reduce'` emulation → dots static (final mask state visible), scanline not animating, all reveals instant → evidence: `.omo/evidence/1-2-redesign-reduced-motion.png`.
- **Commit:** `feat: redesign hero and sections with awwwards-inspired signature motif and 21st.dev patterns` (single commit for the whole directive; amends the in-progress Todo 1.2).

## 6. Hand-off to the main plan

- Todo 1.2 in `.omo/plans/resume-analyser.md` is amended by this directive (see its cross-reference note at top).
- Todo 1.3 (component sourcing) may pull 1–2 additional 21st.dev components using the §1.2 mechanism if the worker wants (e.g. `liquid-metal-hero`), but §2–§3 already deliver the user requirement ("use 21st dev components from each section" — hero structure, upload card states, footer pattern are all 21st.dev-derived). Provenance goes in HANDOFF per existing Todo 1.3.