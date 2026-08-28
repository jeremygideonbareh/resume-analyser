// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * motion reads prefers-reduced-motion once at mount, so window.matchMedia
 * cannot flip it after the first render. Mock the hook directly — the same
 * approach KineticLoader.test.tsx uses, and deterministic regardless of
 * motion internals.
 */
const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useReducedMotion: () => reducedMotion.current,
  }
})

import { ParseSection } from '@/components/sections/ParseSection'

// Vitest globals are disabled, so RTL's auto-cleanup never hooks in.
afterEach(() => {
  cleanup()
  reducedMotion.current = false
})

const section = () =>
  document.querySelector('#parse') as HTMLElement
const pinLayer = () =>
  section().firstElementChild as HTMLElement

describe('ParseSection', () => {
  it('pins and scrubs by default', () => {
    render(<ParseSection />)
    // The tall track is what there is to scrub through; without it the
    // sticky layer has nothing to pin against.
    expect(section().className).toContain('lg:h-[260vh]')
    expect(pinLayer().className).toContain('sticky')
    expect(pinLayer().className).toContain('min-h-screen')
  })

  it('drops the pin and the scroll track under reduced motion', () => {
    reducedMotion.current = true
    render(<ParseSection />)
    // Height and pinning are driven from JS rather than motion-reduce:
    // variants, because motion-reduce: and lg: are both media queries at
    // equal specificity — the winner would otherwise depend on emission
    // order. These assertions are what stop that regressing.
    expect(section().className).not.toContain('260vh')
    expect(pinLayer().className).toContain('static')
    expect(pinLayer().className).not.toContain('sticky')
  })

  it('keeps both views readable with no motion at all', () => {
    reducedMotion.current = true
    render(<ParseSection />)
    // The comparison IS the content here, so it has to survive without any
    // movement — a reader on reduced motion must still get both halves.
    expect(screen.getByText('PRIYA SHARMA')).toBeInTheDocument()
    expect(screen.getByText('parsed_record.json')).toBeInTheDocument()
    expect(
      screen.getByText('4 found · 12 in job description'),
    ).toBeInTheDocument()
  })

  it('exposes the document to assistive tech without the decorative chrome', () => {
    render(<ParseSection />)
    expect(
      screen.getByRole('heading', { name: /You wrote a document/i }),
    ).toBeInTheDocument()
    // Field-name tags and status glyphs are decoration over content that is
    // already stated in the record list; they must not be announced.
    const tags = screen.queryAllByText('experience', { exact: true })
    for (const tag of tags) {
      expect(tag.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })
})
