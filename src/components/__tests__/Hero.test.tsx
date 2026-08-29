// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useReducedMotion: () => reducedMotion.current,
  }
})

import { Hero } from '@/components/sections/Hero'

afterEach(() => {
  cleanup()
  reducedMotion.current = false
})

describe('Hero — cinematic video opening', () => {
  it('states the promise as the page heading', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Know your score/i }),
    ).toBeInTheDocument()
  })

  it('serves the background video from our own origin only', () => {
    render(<Hero />)
    const sources = [...document.querySelectorAll('video source')].map((s) =>
      s.getAttribute('src'),
    )
    expect(sources.length).toBeGreaterThanOrEqual(2)
    for (const src of sources) {
      // The CSP is `media-src 'self' https://res.cloudinary.com`. An external
      // host plays in dev and is blocked in production — a break with no local
      // symptom, which is exactly why it is worth a test rather than a comment.
      expect(src).not.toMatch(/^https?:\/\//)
      expect(src).toMatch(/media\/hero-cinematic\.(webm|mp4)$/)
    }
  })

  it('carries a poster so the first frame is never a black box', () => {
    render(<Hero />)
    const video = document.querySelector('video')
    expect(video?.getAttribute('poster')).toMatch(/hero-cinematic-poster\.webp$/)
    // Autoplay only works muted, and an unmuted autoplay attempt is blocked
    // outright by every current browser. React assigns `muted` as a DOM
    // property rather than an attribute, so it has to be read off the element
    // — toHaveAttribute('muted') passes on nothing and fails on a correct
    // implementation.
    expect((video as HTMLVideoElement).muted).toBe(true)
    expect((video as HTMLVideoElement).loop).toBe(true)
    expect((video as HTMLVideoElement).autoplay).toBe(true)
    expect(video).toHaveAttribute('playsinline')
  })

  it('routes both calls to action at the analyser', () => {
    render(<Hero />)
    const ctas = screen.getAllByRole('link', { name: /score my resume/i })
    expect(ctas).toHaveLength(2) // nav pill + hero button
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '#tool')
  })

  it('offers the section nav', () => {
    render(<Hero />)
    for (const [name, href] of [
      [/analyser/i, '#tool'],
      [/how it works/i, '#how-it-works'],
      [/sample report/i, '#sample'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('keeps the privacy claim in the hero', () => {
    render(<Hero />)
    expect(screen.getByText(/Nothing is uploaded/i)).toBeInTheDocument()
  })

  it('hides the decorative video layer from assistive tech', () => {
    render(<Hero />)
    const video = document.querySelector('video')
    expect(video?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders fully with motion disabled', () => {
    reducedMotion.current = true
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Know your score/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /score my resume/i })).toHaveLength(2)
  })

  it('survives an environment without matchMedia', () => {
    expect(typeof window.matchMedia).not.toBe('function')
    expect(() => render(<Hero />)).not.toThrow()
  })
})
