// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { LoginPanel } from '@/components/auth/LoginPanel'

const { authFlowMock } = vi.hoisted(() => ({
  authFlowMock: {
    signUpWithEmail: vi.fn(),
    signInWithPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    updatePasswordFromRecovery: vi.fn(),
  },
}))

vi.mock('@/lib/auth-flow', () => authFlowMock)

function Harness({
  initialOpen = true,
  isRecovery = false,
}: {
  initialOpen?: boolean
  isRecovery?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sign-in
      </button>
      <LoginPanel open={open} onOpenChange={setOpen} isRecovery={isRecovery} />
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('LoginPanel — open / close / a11y', () => {
  it('renders the dialog with Sign in / Create account tabs when open', () => {
    render(<Harness />)
    expect(screen.getByRole('dialog', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /create account/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /phone/i })).toBeNull()
  })

  it('renders nothing when closed', () => {
    render(<Harness initialOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on Escape', async () => {
    render(<Harness />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    // AnimatePresence keeps the dialog mounted through its exit animation —
    // wait for the exit to complete (jsdom runs the frame loop on real timers).
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('restores focus to the trigger after closing', async () => {
    const user = userEvent.setup()
    render(<Harness initialOpen={false} />)
    const trigger = screen.getByRole('button', { name: /open sign-in/i })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it('switches between Sign in and Create account tabs', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /create account/i }))
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /sign in/i }))
    expect(screen.queryByLabelText(/confirm password/i)).toBeNull()
  })
})

describe('LoginPanel — validation errors', () => {
  it('shows an inline error for an invalid email without calling the flow', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
    expect(authFlowMock.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows an inline error for a short password', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'short7')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /at least 8 characters/i,
    )
    expect(authFlowMock.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows an inline error when the password confirmation does not match', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /create account/i }))
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret124')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/don't match/i)
    expect(authFlowMock.signUpWithEmail).not.toHaveBeenCalled()
  })
})

describe('LoginPanel — sign in', () => {
  it('signs in with email + password and closes the modal on success', async () => {
    const user = userEvent.setup()
    authFlowMock.signInWithPassword.mockResolvedValue({ error: null })
    render(<Harness />)
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(authFlowMock.signInWithPassword).toHaveBeenCalledWith(
      'me@example.com',
      'secret123',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('surfaces a wrong-credentials error inline', async () => {
    const user = userEvent.setup()
    authFlowMock.signInWithPassword.mockResolvedValue({
      error: 'Incorrect email or password.',
    })
    render(<Harness />)
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /incorrect email or password/i,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('LoginPanel — create account', () => {
  it('creates an account and closes the modal on success', async () => {
    const user = userEvent.setup()
    authFlowMock.signUpWithEmail.mockResolvedValue({ error: null })
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /create account/i }))
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(authFlowMock.signUpWithEmail).toHaveBeenCalledWith(
      'me@example.com',
      'secret123',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('surfaces a duplicate-account error inline', async () => {
    const user = userEvent.setup()
    authFlowMock.signUpWithEmail.mockResolvedValue({
      error: 'An account with that email already exists — sign in instead.',
    })
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /create account/i }))
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)
  })
})

describe('LoginPanel — forgot password', () => {
  it('sends a reset link and shows the check-your-email state', async () => {
    const user = userEvent.setup()
    authFlowMock.sendPasswordResetEmail.mockResolvedValue({ error: null })
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /forgot password/i }))
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(authFlowMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      'me@example.com',
    )
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('surfaces a reset-send failure inline', async () => {
    const user = userEvent.setup()
    authFlowMock.sendPasswordResetEmail.mockResolvedValue({
      error: 'Too many requests — you\'ve hit the rate limit. Wait a minute and try again.',
    })
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /forgot password/i }))
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/rate limit/i)
    expect(screen.queryByText(/check your email/i)).toBeNull()
  })
})

describe('LoginPanel — recovery view', () => {
  it('shows the new-password form when isRecovery is true', () => {
    render(<Harness isRecovery />)
    expect(screen.getByRole('dialog', { name: /set a new password/i }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /sign in/i })).toBeNull()
  })

  it('updates the password and closes the modal on success', async () => {
    const user = userEvent.setup()
    authFlowMock.updatePasswordFromRecovery.mockResolvedValue({ error: null })
    render(<Harness isRecovery />)
    await user.type(screen.getByLabelText('Password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm password'), 'newpass123')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    expect(authFlowMock.updatePasswordFromRecovery).toHaveBeenCalledWith(
      'newpass123',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows an inline error when the new password confirmation does not match', async () => {
    const user = userEvent.setup()
    render(<Harness isRecovery />)
    await user.type(screen.getByLabelText('Password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm password'), 'newpass124')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/don't match/i)
    expect(authFlowMock.updatePasswordFromRecovery).not.toHaveBeenCalled()
  })
})