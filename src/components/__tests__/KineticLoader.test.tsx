// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  act,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  ScanSkeleton,
  AnalyzingSkeleton,
  ReportReveal,
} from '@/components/KineticLoader'

/**
 * motion-dom's initPrefersReducedMotion snapshots prefersReducedMotion at
 * module level (guarded by hasReducedMotionListener), so stubbing
 * window.matchMedia cannot change it after the first render. Mock the hook
 * directly instead — deterministic and independent of motion internals.
 */
const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useReducedMotion: () => reducedMotion.current,
  }
})

// Vitest globals are disabled, so RTL's auto-cleanup never hooks in —
// without this, DOM accumulates across tests and getByRole sees duplicates.
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  reducedMotion.current = false
})

/**
 * jsdom has no IntersectionObserver, and motion's useInView (ReportReveal)
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

describe('ScanSkeleton (idle→parsing treatment)', () => {
  it('renders a status region with the first ticker label', () => {
    render(<ScanSkeleton />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('Reading headings…')
  })

  it('cycles the ticker through phase labels over time', () => {
    vi.useFakeTimers()
    render(<ScanSkeleton />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Reading headings…')

    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(status).toHaveTextContent('Extracting skills…')

    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(status).toHaveTextContent('Checking keywords…')
  })

  it('freezes on the first label under reduced motion', () => {
    reducedMotion.current = true
    vi.useFakeTimers()
    render(<ScanSkeleton />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Reading headings…')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // No cycling — static equivalent.
    expect(status).toHaveTextContent('Reading headings…')
  })
})

describe('AnalyzingSkeleton (parsing→analyzing treatment)', () => {
  it('renders the scorecard outline with category bars', () => {
    render(<AnalyzingSkeleton />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('ATS Score')
    expect(status).toHaveTextContent('Keywords')
    expect(status).toHaveTextContent('Structure')
    expect(status).toHaveTextContent('Formatting')
    expect(status).toHaveTextContent('Recency')
    expect(status).toHaveTextContent('Contact')
  })

  it('renders the final score instantly under reduced motion', async () => {
    reducedMotion.current = true
    render(<AnalyzingSkeleton />)
    const status = screen.getByRole('status')
    // Score is set in a useEffect — wait for the effect to flush.
    await waitFor(() => expect(status).toHaveTextContent('100'))
    expect(status).toHaveTextContent('ATS Score')
  })
})

describe('ReportReveal (report section reveal)', () => {
  it('renders children immediately under reduced motion', () => {
    reducedMotion.current = true
    stubIntersectionObserver()
    render(
      <ReportReveal>
        <p>Section content</p>
      </ReportReveal>,
    )
    expect(screen.getByText('Section content')).toBeInTheDocument()
  })
})