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
})
