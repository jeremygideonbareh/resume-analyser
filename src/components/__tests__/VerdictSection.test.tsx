// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { VerdictSection } from '@/components/sections/VerdictSection'

afterEach(() => {
  cleanup()
})

const slider = () => screen.getByRole('slider')

describe('VerdictSection', () => {
  it('starts below the line and says so in words', () => {
    render(<VerdictSection />)
    expect(slider()).toHaveValue('58')
    // Colour must never be the only carrier of the verdict.
    expect(
      screen.getByText('Filtered before anyone reads it'),
    ).toBeInTheDocument()
    expect(screen.getByText('Filtered')).toBeInTheDocument()
  })

  it('flips the outcome when dragged across the threshold', () => {
    render(<VerdictSection />)
    fireEvent.change(slider(), { target: { value: '70' } })
    expect(
      screen.getByText('Shortlisted for human review'),
    ).toBeInTheDocument()
    expect(screen.getByText('Passes')).toBeInTheDocument()
    expect(
      screen.queryByText('Filtered before anyone reads it'),
    ).not.toBeInTheDocument()
  })

  it('treats exactly 70 as passing and 69 as filtered', () => {
    render(<VerdictSection />)
    // The cutoff is the entire point of the section, so pin the boundary:
    // an off-by-one here would quietly misstate the product's core claim.
    fireEvent.change(slider(), { target: { value: '69' } })
    expect(screen.getByText('Filtered')).toBeInTheDocument()
    fireEvent.change(slider(), { target: { value: '70' } })
    expect(screen.getByText('Passes')).toBeInTheDocument()
  })

  it('is operable by keyboard and announces its own value', () => {
    render(<VerdictSection />)
    const input = slider()
    // A real range input rather than a custom drag handle: focusable, with
    // an accessible name and a value assistive tech can read.
    expect(input).toHaveAccessibleName(/Drag to see what changes/i)
    expect(input).toHaveAttribute('type', 'range')
    input.focus()
    expect(input).toHaveFocus()
  })

  it('links the outcome text to the control it describes', () => {
    render(<VerdictSection />)
    const describedBy = slider().getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const region = document.getElementById(describedBy!)
    expect(region).not.toBeNull()
    // Live so the flip is announced, not silently repainted.
    expect(region).toHaveAttribute('aria-live', 'polite')
  })
})
