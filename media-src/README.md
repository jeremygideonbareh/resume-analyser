# Generated media

Drop generated assets here using **exactly these filenames** — the components
reference them by name.

Anything in `public/` is served from the site's own origin, which is what the
Content-Security-Policy requires (`img-src 'self'`, `media-src 'self'`). Assets
hosted anywhere else are blocked in production **but not in dev**, so they look
fine locally and ship broken.

## Images

| File | Slot | Target size | Budget |
|---|---|---|---|
| `hero-paper.avif` + `hero-paper.webp` | IMG 1 — raking light on paper | 2400 × 1500 | ≤ 220 KB |
| `parse-atmosphere.avif` + `.webp` | IMG 2 — machine weather (indigo) | 2400 × 1400 | ≤ 260 KB |
| `ink-dissolve.avif` + `.webp` | IMG 3 — ink breaking into dots | 2000 × 1200 | ≤ 180 KB |
| `empty-page.webp` | IMG 4 — the waiting page | 1400 × 1000 | ≤ 90 KB |
| `og-plate.png` | IMG 5 — social share background | 1200 × 630 | ≤ 300 KB |

`og-plate.png` is a **background only** — the wordmark and headline are set in
code over it, because generated type won't match Archivo and image models still
misspell.

## Video

| File | Slot | Target | Budget |
|---|---|---|---|
| `hero-light-sweep.mp4` + `.webm` | VID 1 — light travelling across paper | 8 s, 1920 × 1200 | ≤ 2 MB |
| `hero-light-sweep-poster.webp` | still frame for VID 1 | 1920 × 1200 | ≤ 80 KB |
| `parse-lattice.mp4` + `.webm` | VID 2 — lattice resolving in indigo | 6 s, 1920 × 1080 | ≤ 1.6 MB |
| `parse-lattice-poster.webp` | still frame for VID 2 | 1920 × 1080 | ≤ 80 KB |

Both loops must be **silent** and seamless. Posters are not optional: neither
video autoplays under `prefers-reduced-motion`, so the poster is what a
meaningful share of visitors actually see, and it has to look deliberate on its
own.

## Partial drops are fine

Every slot degrades on its own. A missing file means that section falls back to
the current flat treatment — it does not break the build. Add them as you
generate them.

## Don't hardcode paths in components

Vite `base` is `/resume-analyser/` locally and `/` on Vercel, so a literal
`/media/hero-paper.webp` resolves in one environment and 404s in the other.
Reference these through `import.meta.env.BASE_URL` or an import.

Prompts and full art direction: the ResumeLab Art Direction artifact.

## Round two (see the Art Direction artifact for prompts)

| File | Slot | Target size | Budget |
|---|---|---|---|
| `the-stack.avif` + `.webp` | IMG 6 — archive of paper, one sheet lit | 2400 × 1400 | ≤ 240 KB |
| `upload-ground.webp` | IMG 7 — near-empty field behind the dropzone | 2000 × 1200 | ≤ 110 KB |
| `the-stack-loop.mp4` + `.webm` + `-poster.webp` | VID 3 — optional, light drifting over the stack | 8 s, 1920 × 1080 | ≤ 1.6 MB |

VID 3 is genuinely optional. IMG 6 carries the verdict section on its own, and
a third ambient loop starts to read as a screensaver.
