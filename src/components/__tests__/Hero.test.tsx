// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Hero } from '@/components/sections/Hero'

describe('Hero — interwoven depth layout', () => {
  it('renders the badge and CTA anchors', () => {
    render(<Hero />)
    expect(screen.getByText(/100% in-browser/i)).toBeInTheDocument()

    const analyse = screen.getByRole('link', { name: /analyse my resume/i })
    expect(analyse).toHaveAttribute('href', '#tool')
    expect(screen.getByRole('link', { name: /how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works',
    )
  })

  it('renders the promotional video with the Cloudinary source', () => {
    render(<Hero />)
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toContain('res.cloudinary.com')
  })

  it('renders the layered words RESUME / ANALYSE / LAB', () => {
    render(<Hero />)
    const words = Array.from(
      document.querySelectorAll('span[aria-hidden="true"]'),
    ).map((n) => n.textContent)
    expect(words).toContain('RESUME')
    expect(words).toContain('ANALYSE')
    expect(words).toContain('LAB')
  })
})
