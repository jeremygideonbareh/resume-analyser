import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * MediaBackdrop — a full-bleed image or looping video behind a section.
 *
 * Three things here are easy to get wrong, so they live in one place rather
 * than being re-derived at each call site:
 *
 * 1. Paths. Vite `base` is `/resume-analyser/` locally and `/` on Vercel, so a
 *    literal `/media/x.webp` resolves in exactly one of the two environments.
 *    Everything routes through BASE_URL.
 * 2. Reduced motion. The video never autoplays for those readers — they get the
 *    poster still instead, which is why every video slot ships one. This is not
 *    a nicety: the preview browser used to develop this page runs with reduced
 *    motion on, so the poster path is a first-class rendering, not a fallback.
 * 3. Contrast. Every ratio verified for this design was measured against flat
 *    colour. Type over a photograph has to clear 4.5:1 against the *lightest*
 *    pixels it covers, so a scrim is mandatory rather than optional — the
 *    `scrim` prop sets its strength, and `0` is only correct when nothing is
 *    laid over the media.
 *
 * The media is always aria-hidden. It is atmosphere; anything a reader needs
 * is in the DOM above it.
 */

export type MediaBackdropProps = {
  /** Basename in public/media, without extension. AVIF + WebP are assumed. */
  src: string
  /** Basename of a looping video in public/media, without extension. */
  video?: string
  /** Poster basename; defaults to `${video}-poster`. */
  poster?: string
  /** 0 = none, 1 = heaviest. Tuned per surface against the text over it. */
  scrim?: number
  /** Scrim tint. Matches the section's own ground so the seam is invisible. */
  scrimColor?: 'canvas' | 'night'
  /**
   * A flat scrim strong enough to protect text also flattens the image back
   * into the wash we were trying to escape. Directional scrims put the density
   * only where type actually sits, so the media stays at full strength in the
   * part of the frame the reader is looking at.
   */
  scrimDirection?: 'flat' | 'left' | 'bottom'
  /** Media opacity. Texture usually wants to sit well back. */
  opacity?: number
  className?: string
  /** Skip lazy-loading for above-the-fold media. */
  eager?: boolean
}

const asset = (name: string, ext: string) =>
  `${import.meta.env.BASE_URL}media/${name}.${ext}`

export function MediaBackdrop({
  src,
  video,
  poster,
  scrim = 0.55,
  scrimColor = 'canvas',
  scrimDirection = 'flat',
  opacity = 1,
  className,
  eager = false,
}: MediaBackdropProps) {
  const reduce = useReducedMotion()
  const posterName = poster ?? (video ? `${video}-poster` : src)
  const showVideo = Boolean(video) && !reduce

  const tint = scrimColor === 'night' ? 'var(--color-night)' : 'var(--color-paper)'
  const mix = (pct: number) =>
    `color-mix(in oklch, ${tint} ${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%, transparent)`

  const scrimBackground =
    scrimDirection === 'left'
      ? `linear-gradient(to right, ${mix(scrim)} 0%, ${mix(scrim * 0.82)} 38%, ${mix(scrim * 0.3)} 72%, ${mix(scrim * 0.15)} 100%)`
      : scrimDirection === 'bottom'
        ? `linear-gradient(to top, ${mix(scrim)} 0%, ${mix(scrim * 0.55)} 45%, ${mix(scrim * 0.2)} 100%)`
        : mix(scrim)

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {showVideo ? (
        <video
          className="h-full w-full object-cover"
          style={{ opacity }}
          poster={asset(posterName, 'webp')}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          {/* WebM first: VP9 is materially smaller than the H.264 twin, and
              any browser that skips it takes the MP4 without a reflow. */}
          <source src={asset(video!, 'webm')} type="video/webm" />
          <source src={asset(video!, 'mp4')} type="video/mp4" />
        </video>
      ) : (
        <picture>
          <source srcSet={asset(src, 'avif')} type="image/avif" />
          <source srcSet={asset(src, 'webp')} type="image/webp" />
          <img
            src={asset(src, 'webp')}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover"
            style={{ opacity }}
          />
        </picture>
      )}

      {scrim > 0 && (
        <div className="absolute inset-0" style={{ background: scrimBackground }} />
      )}
    </div>
  )
}
