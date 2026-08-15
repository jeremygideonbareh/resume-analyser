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
    sendEmailOtp: vi.fn(),
    sendPhoneOtp: vi.fn(),
    verifyEmailOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
  },
}))

vi.mock('@/lib/auth-flow', () => authFlowMock)

function Harness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sign-in
      </button>
      <LoginPanel open={open} onOpenChange={setOpen} />
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
  it('renders the dialog with tabs when open', () => {
    render(<Harness />)
    expect(screen.getByRole('dialog', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /phone/i })).toBeInTheDocument()
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

  it('switches between email and phone tabs', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /phone/i }))
    expect(screen.getByLabelText(/phone number in e\.164 format/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /email/i }))
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })
})

describe('LoginPanel — validation errors', () => {
  it('shows an inline error for an invalid email without calling the flow', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/valid email/i)
    expect(authFlowMock.sendEmailOtp).not.toHaveBeenCalled()
  })

  it('shows an inline error for an invalid phone number', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /phone/i }))
    await user.type(screen.getByLabelText(/phone number/i), '12')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid phone/i)
    expect(authFlowMock.sendPhoneOtp).not.toHaveBeenCalled()
  })
})

describe('LoginPanel — OTP flow', () => {
  it('sends an email OTP and shows the code step after a valid email', async () => {
    const user = userEvent.setup()
    authFlowMock.sendEmailOtp.mockResolvedValue({ error: null })
    render(<Harness />)
    await user.type(
      screen.getByLabelText(/email address/i),
      'me@example.com',
    )
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(authFlowMock.sendEmailOtp).toHaveBeenCalledWith('me@example.com')
    expect(await screen.findByLabelText(/6-digit verification code/i)).toBeInTheDocument()
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
  })

  it('surfaces a send failure inline instead of advancing', async () => {
    const user = userEvent.setup()
    authFlowMock.sendEmailOtp.mockResolvedValue({
      error: 'Too many requests — you\'ve hit the rate limit. Wait a minute and try again.',
    })
    render(<Harness />)
    await user.type(
      screen.getByLabelText(/email address/i),
      'me@example.com',
    )
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/rate limit/i)
    expect(
      screen.queryByLabelText(/6-digit verification code/i),
    ).toBeNull()
  })

  it('shows the graceful SMS-provider message on the phone tab', async () => {
    const user = userEvent.setup()
    authFlowMock.sendPhoneOtp.mockResolvedValue({
      error: 'Phone sign-in needs an SMS provider — use email for now.',
    })
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: /phone/i }))
    await user.type(
      screen.getByLabelText(/phone number/i),
      '+44 7911 123456',
    )
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /sms provider/i,
    )
  })

  it('verifies the code and closes the modal on success', async () => {
    const user = userEvent.setup()
    authFlowMock.sendEmailOtp.mockResolvedValue({ error: null })
    authFlowMock.verifyEmailOtp.mockResolvedValue({ error: null })
    render(<Harness />)
    await user.type(
      screen.getByLabelText(/email address/i),
      'me@example.com',
    )
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await user.type(
      await screen.findByLabelText(/6-digit verification code/i),
      '123456',
    )
    await user.click(screen.getByRole('button', { name: /verify code/i }))

    await waitFor(() =>
      expect(authFlowMock.verifyEmailOtp).toHaveBeenCalledWith(
        'me@example.com',
        '123456',
      ),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps the verify button disabled until the code is 6 digits', async () => {
    const user = userEvent.setup()
    authFlowMock.sendEmailOtp.mockResolvedValue({ error: null })
    render(<Harness />)
    await user.type(
      screen.getByLabelText(/email address/i),
      'me@example.com',
    )
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await user.type(
      await screen.findByLabelText(/6-digit verification code/i),
      '12',
    )
    expect(
      screen.getByRole('button', { name: /verify code/i }),
    ).toBeDisabled()
  })
})