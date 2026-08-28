---
name: resumelab-frontend
description: >-
  ResumeLab's frontend system — Tailwind v4 `@theme` design tokens
  (ink-on-paper), the four @fontsource font roles, the `motion/react`
  (framer-motion successor) animation conventions with NO gsap, the
  prefers-reduced-motion contract, and the build-time CSP that constrains what
  the app may load. Use this skill whenever you build or restyle a component,
  add colors/spacing/fonts, add scroll or reveal animation, touch
  `src/index.css` or the hero, or change anything that loads an external
  resource (fonts, images, workers, network). Getting the tokens, the motion
  library, or the CSP wrong produces off-brand UI or a blank production page.
---

# ResumeLab frontend system

Stack: Vite 8 + React 19 + TypeScript + **Tailwind v4** (via
`@tailwindcss/vite`, not a PostCSS config) + shadcn-style primitives in
`src/components/ui/` + `motion` (the framer-motion successor) + `recharts` +
`lenis` for smooth scroll. Design identity: **ink-on-paper scorecard**, emerald
accent.

## Design tokens live in `@theme` — use the generated utilities

All tokens are declared in the `@theme` block of
[src/index.css](../../../src/index.css). Tailwind v4 generates utilities from
them. **Do not hardcode hex/oklch values in components** — use the utility or
`var(--token)`.

| Role | Token | Utility examples |
|---|---|---|
| Page background | `--color-paper` `oklch(0.985 0 0)` | `bg-paper` |
| Raised surface | `--color-surface` `oklch(0.96 0 0)` | `bg-surface` |
| Primary text | `--color-ink` `oklch(0.16 0 0)` | `text-ink` |
| Secondary text | `--color-muted` `oklch(0.45 0 0)` | `text-muted` |
| Accent (emerald `#059669`) | `--color-accent` / `-strong` / `-soft` | `text-accent`, `bg-accent-soft` |
| Semantic | `--color-danger` / `-warning` / `-success` | `text-danger` … |
| Card radius | `--radius-card` `0.75rem` | `rounded-card` (project default is `rounded-xl`) |

`@theme inline` further maps shadcn semantic aliases (`--color-background`,
`--color-foreground`, `--color-card`, `--color-primary`, `sidebar-*` …) onto
the same ink/paper/accent set so the `src/components/ui/` primitives work.
Extend those mappings rather than introducing a parallel palette.

Signature motif: lab-dots grid + scanline, also defined in `src/index.css`.

## Fonts — four roles, loaded via @fontsource

Imported as packages (`@fontsource/*`), not from a CDN (the CSP forbids remote
fonts). Roles:

| Token | Family | Use |
|---|---|---|
| `--font-display` | Fraunces (serif) | headings, brand voice — app-wide display |
| `--font-body` | Inter | body copy |
| `--font-mono` | IBM Plex Mono | data, keywords, scores |
| `--font-montserrat` | Montserrat 800/900 | **only** the hero's decorative layered words (`font-montserrat` utility) |

Don't use Montserrat anywhere except the hero decorative words; don't swap the
display font.

## Motion: `motion/react`, never gsap

Repo convention — animation uses `motion` (`import { motion, useScroll,
useSpring, useInView, useTransform } from 'motion/react'`). **Do not add gsap /
ScrollTrigger / ScrollSmoother**, even for scroll-driven work; the hero
rebuild deliberately uses `useScroll` + `useSpring` instead.

Reusable primitives in `src/components/motion/`:

- `SectionReveal` / `StaggeredReveal` — `useInView` entrance reveals.
- `MagneticButton` — cursor-spring hover.

Smooth scrolling is `lenis`, initialised once at the app shell — don't add a
second instance.

### prefers-reduced-motion is a hard contract

Every animated surface must have a reduced-motion path that renders the final
state with no pin, scrub, parallax, or drift. The hero drops to a static
single-screen layout; reveals render immediately; recharts render static.
Verify with DevTools "Emulate CSS prefers-reduced-motion: reduce" — the page
must look complete and not move.

## Charts

`recharts` v3, wrapped by `src/components/ui/chart.tsx`. Series colors come
from `--chart-1` / `--chart-2` / `--color-*` tokens in `@theme` (accent + ink),
referenced as `var(--chart-N)` in the chart config — keep new charts on that
same two-tone token set.

## The Content-Security-Policy will blank the prod build if you break it

A strict CSP `<meta>` is injected **at build time only** by `cspMetaPlugin` in
[vite.config.ts](../../../vite.config.ts) (dev is exempt so HMR works). Current
policy:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
font-src 'self' data:; img-src 'self' data: https://res.cloudinary.com;
media-src 'self' https://res.cloudinary.com; worker-src 'self' blob:;
connect-src 'self' <VITE_SUPABASE_URL origin>
```

Implications for any change:

- **No remote scripts, no CDN anything.** Bundle it.
- Images/video: self, `data:` URIs, or `res.cloudinary.com` only. Another host
  needs a deliberate policy edit in `cspMetaPlugin`.
- Network calls (`fetch`, WebSocket): only `'self'` and the Supabase origin
  (derived from `VITE_SUPABASE_URL` at build). A new API host needs a
  `connect-src` edit.
- Web workers (pdfjs) rely on `worker-src 'self' blob:` — keep it.
- After any resource-loading change, run `npm run build && npm run preview` and
  check the console for CSP violations — they don't show in `npm run dev`.

## Definition of done for a frontend change

`npm run typecheck` clean · `npm run lint` clean · `npm test` green ·
`npm run build` succeeds · `npm run preview` shows no CSP errors ·
reduced-motion emulation renders the finished state.
