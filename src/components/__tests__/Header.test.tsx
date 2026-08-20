// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Header } from '@/components/layout/Header'
import type { AuthUser } from '@/lib/session'

afterEach(() => {
  cleanup()
})

const emailUser: AuthUser = {
  id: 'user_123',
  email: 'john@example.com',
  phone: null,
}

const phoneUser: AuthUser = {
  id: 'user_456',
  email: null,
  phone: '+44 7911 123456',
}

describe('Header — signed-out state', () => {
  it('shows a Sign in button on all breakpoints', () => {
    render(<Header user={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls onSignIn when Sign in is clicked', () => {
    const onSignIn = vi.fn()
    render(<Header user={null} onSignIn={onSignIn} onSignOut={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('does not show a Log out button or masked id when signed out', () => {
    render(<Header user={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /log out/i })).toBeNull()
    expect(screen.queryByText(/j\*\*\*@example\.com/)).toBeNull()
  })

  it('does not show a Dashboard link when signed out (landing only)', () => {
    render(<Header user={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /dashboard/i })).toBeNull()
  })
})

describe('Header — signed-in state', () => {
  it('shows the masked email identifier and a Log out button', () => {
    render(<Header user={emailUser} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByText('j***@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull()
  })

  it('masks a phone identifier', () => {
    render(<Header user={phoneUser} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByText('+44 **** 456')).toBeInTheDocument()
  })

  it('calls onSignOut when Log out is clicked', () => {
    const onSignOut = vi.fn()
    render(<Header user={emailUser} onSignIn={vi.fn()} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('shows a Dashboard link when signed in', () => {
    render(<Header user={emailUser} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('calls onNavigate with "dashboard" when the Dashboard link is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={onNavigate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }))
    expect(onNavigate).toHaveBeenCalledWith('dashboard')
  })

  it('marks the Dashboard link as current when the dashboard view is active', () => {
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        view="dashboard"
      />,
    )
    expect(screen.getByRole('button', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows Profile and Assistant links when signed in', () => {
    render(<Header user={emailUser} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /assistant/i })).toBeInTheDocument()
  })

  it('calls onNavigate with "profile" when the Profile link is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={onNavigate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /profile/i }))
    expect(onNavigate).toHaveBeenCalledWith('profile')
  })

  it('calls onNavigate with "chat" when the Assistant link is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={onNavigate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /assistant/i }))
    expect(onNavigate).toHaveBeenCalledWith('chat')
  })

  it('marks the Profile link as current when the profile view is active', () => {
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        view="profile"
      />,
    )
    expect(screen.getByRole('button', { name: /profile/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks the Assistant link as current when the chat view is active', () => {
    render(
      <Header
        user={emailUser}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        view="chat"
      />,
    )
    expect(screen.getByRole('button', { name: /assistant/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not show Profile or Assistant links when signed out', () => {
    render(<Header user={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /profile/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /assistant/i })).toBeNull()
  })
})
