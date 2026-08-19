// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { ToolSection } from '@/components/sections/ToolSection'

// Keep the test light: the analyser internals are covered elsewhere.
vi.mock('@/components/UploadZone', () => ({
  UploadZone: () => <div data-testid="upload-zone" />,
}))
vi.mock('@/components/ReportView', () => ({
  ReportView: () => null,
}))
vi.mock('@/components/KineticLoader', () => ({
  AnalyzingSkeleton: () => <div data-testid="analyzing-skeleton" />,
}))
vi.mock('@/lib/analysis', () => ({
  analyzeResume: vi.fn(),
}))
vi.mock('@/lib/history', () => ({
  saveAnalysis: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
}))

const user = { id: 'user-1', email: 'a@b.c', phone: null }

/**
 * jsdom has no IntersectionObserver, and motion's useInView (SectionReveal)
 * constructs one. Stub a no-op observer so the hook mounts cleanly.
 */
function stubIntersectionObserver() {
  class MockIntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubIntersectionObserver()
})

afterEach(() => {
  cleanup()
})

describe('ToolSection — guest gating', () => {
  it('shows the locked panel for guests and never the upload zone', () => {
    const onSignIn = vi.fn()
    render(<ToolSection user={null} onSignIn={onSignIn} />)
    expect(
      screen.getByRole('heading', { name: /your resume stays on your device/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sign in to continue/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('upload-zone')).toBeNull()
  })

  it('opens the sign-in dialog when the guest clicks the CTA', async () => {
    const onSignIn = vi.fn()
    const userEventCtx = userEvent.setup()
    render(<ToolSection user={null} onSignIn={onSignIn} />)
    await userEventCtx.click(
      screen.getByRole('button', { name: /sign in to continue/i }),
    )
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('renders the upload zone for signed-in users', () => {
    render(<ToolSection user={user} onSignIn={vi.fn()} />)
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /sign in to continue/i }),
    ).toBeNull()
  })
})