// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Hero } from '@/components/sections/Hero'

// Mock reduced motion at the hook level (as in KineticLoader.test.tsx) so the
// static, deterministic hero branch renders in tests.
const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: true } }))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useReducedMotion: () => reducedMotion.current,
  }
})

afterEach(() => {
  cleanup()
  reducedMotion.current = true
})

describe('Hero — static (reduced motion) branch', () => {
  it('renders the headline, subcopy, and CTAs', () => {
    render(<Hero />)
    expect(screen.getByText(/know your score/i)).toBeInTheDocument()
    expect(screen.getByText(/before the robots do/i)).toBeInTheDocument()
    expect(screen.getByText(/100% in-browser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyse my resume/i })).toBeInTheDocument()
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('PDF · DOCX · TXT')).toBeInTheDocument()
  })

  it('CTAs scroll to the tool section', () => {
    document.body.innerHTML =
      '<div id="tool"></div>' + document.body.innerHTML
    const tool = document.getElementById('tool') as HTMLElement
    const scrollIntoView = vi.fn()
    tool.scrollIntoView = scrollIntoView
    render(<Hero />)
    fireEvent.click(screen.getByRole('button', { name: /analyse my resume/i }))
    expect(scrollIntoView).toHaveBeenCalled()
  })
})

describe('Hero — kinetic (motion) branch', () => {
  it('renders without crashing and mounts the promotional video', () => {
    reducedMotion.current = false
    render(<Hero />)
    expect(screen.getByText(/100% in-browser/i)).toBeInTheDocument()
    expect(screen.getByText(/before the robots do/i)).toBeInTheDocument()
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toContain('res.cloudinary.com')
  })
})
