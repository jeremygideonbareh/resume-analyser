# HANDOFF — ResumeLab

Privacy-first ATS resume analyser. Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + `motion` (framer-motion successor). Branch: `feat/resume-analyser` (never commit to main without user consent).

## Architecture

- **Zero-upload, client-side only.** Parsing (pdfjs-dist / mammoth / TXT), analysis (rule-based), and report rendering all happen in the browser. No server, no storage, no cookies. LLM tier is an optional env-gated hook (`VITE_ENABLE_LLM`, default off) — key never in client.
- **Design identity:** ink-on-paper light theme. Tokens in `src/index.css` `:root`: paper `oklch(0.985 0 0)`, surface `oklch(0.96 0 0)`, ink `oklch(0.16 0 0)`, muted `oklch(0.45 0 0)`, accent emerald `#059669` (~`oklch(0.58 0.13 162)`). Fonts via @fontsource: Fraunces (display), Inter (body), IBM Plex Mono (data/keywords). Signature motif: lab-dots grid + scanline (`.lab-dots`, `.dot-ripple`, `.scanline` in `src/index.css`).
- **Page composition** (`src/App.tsx`): Header → Hero → SkillsMarquee → ToolSection (#tool) → HowItWorks → SampleReport (#sample) → Footer.
- **Motion primitives** (`src/components/motion/`): `SectionReveal`/`StaggeredReveal` (useInView reveals), `MagneticButton` (cursor spring), `InfiniteSlider` (marquee, local ResizeObserver hook, reduced-motion gate), `ProgressiveBlur` (layered backdrop-filter edge fade). All respect `prefers-reduced-motion`.

## Component provenance (21st.dev / Componentry)

- `InfiniteSlider` + `ProgressiveBlur` ← ibelick `hero-section-4` (21st.dev `https://21st.dev/ibelick/hero-section-4`), adapted to `motion/react` + local `useElementSize` (no react-use-measure dep). Used as the skills marquee under the hero (no fake logos — honest for a new tool).
- `SampleReport` layout pattern ← interior-design `about-us-section` (pasted by user): services grid → ATS-guidance cards, StatCounter springs → stat count-ups.
- `UploadCard` states + `.lab-bg` ripple ← larsen66 `upload-ui` (21st.dev), ported to lab-dots/scanline.
- `hover-footer` ← mdafsarx (21st.dev), restyled.
- Componentry: not integrated (bash flaky during Todo 1.3; optional per plan — revisit if desired).
- ATS guidance content ← 2026 web research (igotanoffer.com, resumeadapter.com, resumly.ai, ophyai.com, flavoredresume.com, hireflow.net, workable.com) — digest in `.omo/notepads/resume-analyser/learnings.md`.

## Build / run

- `npm run dev` (Vite; port 8080 used for QA), `npm run build`, `npm run typecheck` (`tsc -b`), `npm run test` (Vitest — parsing/analysis tests land in Wave 2/3).
- Windows gotchas: PowerShell `&&` invalid → use `;`. Path contains a space — quote it. `HTMLMotionProps` must be `import type` (Vite pre-bundle crash otherwise).

## Session log

- 2026-08-13: Todo 1.1 scaffold (commit `134f6d0`); Todo 1.2 redesign per `.omo/plans/resume-analyser-redesign.md` (commit `3c66e5a`); Todo 1.3 21st.dev integration + ATS-grounded SampleReport (evidence `.omo/evidence/1-3-*`). Next: Wave 2 parsing engine (Todo 2.1).