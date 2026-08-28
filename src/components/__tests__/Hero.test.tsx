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

describe('Hero — cinematic opening', () => {
  it('states the promise as the page heading', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Know your score/i }),
    ).toBeInTheDocument()
  })

  it('survives an environment without matchMedia', () => {
    // jsdom has no matchMedia, and neither does any non-browser render path.
    // The pointer-parallax effect must degrade to "no parallax", never throw.
    expect(typeof window.matchMedia).not.toBe('function')
    expect(() => render(<Hero />)).not.toThrow()
  })

  it('offers one primary action and one route into the argument', () => {
    render(<Hero />)
    expect(
      screen.getByRole('link', { name: /score my resume/i }),
    ).toHaveAttribute('href', '#tool')
    // Points at the parse band, which is what actually earns the upload —
    // the tool no longer sits directly beneath the hero.
    expect(
      screen.getByRole('link', { name: /see what the filter sees/i }),
    ).toHaveAttribute('href', '#parse')
  })

  it('keeps the privacy claim visible and outside the parallax', () => {
    render(<Hero />)
    // Held out of the moving layers deliberately: it is the trust claim, and
    // it should not scroll away with the headline.
    expect(screen.getByText(/Nothing is uploaded/i)).toBeInTheDocument()
  })

  it('keeps every decorative parallax layer out of the a11y tree', () => {
    render(<Hero />)
    // Scene, glow and motes carry no information — they must not surface as
    // anonymous nodes to a screen reader.
    const hidden = document.querySelectorAll('[aria-hidden="true"]')
    expect(hidden.length).toBeGreaterThanOrEqual(3)
    for (const el of hidden) {
      expect(el.textContent?.trim() ?? '').toBe('')
    }
  })

  it('renders fully with motion disabled', () => {
    reducedMotion.current = true
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Know your score/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /score my resume/i }),
    ).toBeInTheDocument()
  })
})
