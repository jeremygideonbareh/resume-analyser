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

describe('Hero — document-led opening', () => {
  it('states the promise as the page heading', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Know your score/i }),
    ).toBeInTheDocument()
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

  it('keeps the privacy claim visible without a decorative label', () => {
    render(<Hero />)
    expect(screen.getByText(/Nothing uploaded/i)).toBeInTheDocument()
  })

  it('hides the decorative sheet from assistive tech but describes it once', () => {
    render(<Hero />)
    // The sheet is bars, not text — it carries no information a screen
    // reader could use, so it is announced by a single sr-only sentence
    // rather than fourteen anonymous divs.
    expect(
      screen.getByText(/illustration of a resume page/i),
    ).toBeInTheDocument()
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
