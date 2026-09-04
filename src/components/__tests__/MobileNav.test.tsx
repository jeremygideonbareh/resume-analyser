// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MobileNav } from '@/components/layout/MobileNav'
import type { AuthUser } from '@/lib/session'

afterEach(() => {
  cleanup()
})

const user: AuthUser = { id: 'user_1', email: 'jane@example.com', phone: null }

describe('MobileNav — signed out', () => {
  it('renders all four tabs (discoverable even when signed out)', () => {
    render(
      <MobileNav user={null} view="landing" onNavigate={vi.fn()} onSignIn={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /analyser/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /assistant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('opens sign-in (not onNavigate) when a gated tab is tapped', () => {
    const onNavigate = vi.fn()
    const onSignIn = vi.fn()
    render(
      <MobileNav user={null} view="landing" onNavigate={onNavigate} onSignIn={onSignIn} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /profile/i }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('the ungated Analyser tab still works when signed out', () => {
    const onNavigate = vi.fn()
    const onSignIn = vi.fn()
    render(
      <MobileNav user={null} view="dashboard" onNavigate={onNavigate} onSignIn={onSignIn} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /analyser/i }))
    expect(onNavigate).toHaveBeenCalledWith('landing')
    expect(onSignIn).not.toHaveBeenCalled()
  })
})

describe('MobileNav — signed in', () => {
  it('calls onNavigate with the right target when a service tab is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <MobileNav user={user} view="landing" onNavigate={onNavigate} onSignIn={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }))
    expect(onNavigate).toHaveBeenCalledWith('dashboard')
  })

  it('marks the active tab with aria-current="page"', () => {
    render(
      <MobileNav user={user} view="profile" onNavigate={vi.fn()} onSignIn={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /profile/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: /dashboard/i })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
