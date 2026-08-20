// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Dashboard } from '@/components/dashboard'
import type { AnalysisHistoryRow } from '@/lib/history'
import type { Application, Company, StudentProfile } from '@/lib/placement-types'

const { historyMock, supabaseMock } = vi.hoisted(() => ({
  historyMock: {
    loadHistory: vi.fn(),
  },
  supabaseMock: {
    getSupabase: vi.fn(),
  },
}))

vi.mock('@/lib/history', () => ({
  loadHistory: historyMock.loadHistory,
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: supabaseMock.getSupabase,
}))

// The chart/activity components render recharts, which throws in jsdom —
// stub them out so the placement sections under test render cleanly.
vi.mock('@/components/score-trend-chart', () => ({
  ScoreTrendChart: () => <div data-testid="score-trend-chart" />,
}))
vi.mock('@/components/section-breakdown-chart', () => ({
  SectionBreakdownChart: () => <div data-testid="section-breakdown-chart" />,
}))
vi.mock('@/components/recent-analyses', () => ({
  RecentAnalyses: () => <div data-testid="recent-analyses" />,
}))
vi.mock('@/components/recent-activity', () => ({
  RecentActivity: () => <div data-testid="recent-activity" />,
}))
vi.mock('@/components/stats', () => ({
  DashboardStats: () => <div data-testid="dashboard-stats" />,
}))

/**
 * T5.2 — Dashboard placement sections.
 *
 * Cases per the plan: readiness KPI (score + band), eligible companies list,
 * applications (count by status + list + add form), skill progress, Phase-2
 * placeholders, and empty states when the profile is missing.
 */

const rows: AnalysisHistoryRow[] = [
  {
    id: 'a1',
    user_id: 'user_1',
    created_at: '2026-08-20T10:00:00Z',
    filename: 'resume.pdf',
    format: 'pdf',
    score: 85,
    section_scores: { keywords: 40, structure: 15 },
    skills: ['python', 'sql'],
    keyword_match: { present: ['python'], missing: ['java'] },
  },
]

const profile: StudentProfile = {
  id: 'p1',
  created_at: '2026-08-20T00:00:00Z',
  user_id: 'user_1',
  full_name: 'Priya Sharma',
  department: 'CSE',
  semester: 6,
  cgpa: 8.5,
  backlogs: 0,
  skills: ['python', 'java', 'sql'],
  certifications: [],
  programming_languages: ['Python'],
  portfolio_url: null,
  github_url: 'https://github.com/priya',
  linkedin_url: null,
  target_role: 'Software Engineer',
  updated_at: '2026-08-20T00:00:00Z',
}

const companies: Company[] = [
  {
    id: 'c1',
    created_at: '2026-08-01T00:00:00Z',
    name: 'TCS',
    min_cgpa: 7,
    max_backlogs: 2,
    required_skills: ['java'],
    preferred_skills: ['python'],
    description: null,
    recruitment_process: null,
    salary_insights: null,
  },
  {
    id: 'c2',
    created_at: '2026-08-01T00:00:00Z',
    name: 'Microsoft',
    min_cgpa: 8,
    max_backlogs: 0,
    required_skills: ['system design'],
    preferred_skills: [],
    description: null,
    recruitment_process: null,
    salary_insights: null,
  },
]

const applications: Application[] = [
  {
    id: 'app1',
    created_at: '2026-08-19T00:00:00Z',
    user_id: 'user_1',
    company_id: 'c1',
    company_name: null,
    status: 'applied',
    applied_at: '2026-08-19T00:00:00Z',
    notes: null,
  },
]

function makeSupabaseClient(opts: {
  profile?: StudentProfile | null
  companies?: Company[]
  applications?: Application[]
  insertError?: Error | null
} = {}) {
  const inserts: Array<Record<string, unknown>> = []
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'student_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.profile ?? null,
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'companies') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({ data: opts.companies ?? [], error: null }),
            ),
          })),
        }
      }
      if (table === 'applications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({ data: opts.applications ?? [], error: null }),
              ),
            })),
          })),
          insert: vi.fn((row: Record<string, unknown>) => {
            inserts.push(row)
            return Promise.resolve({ data: null, error: opts.insertError ?? null })
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  supabaseMock.getSupabase.mockReturnValue(client as never)
  return { client, inserts }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Dashboard — placement sections with data', () => {
  it('renders the readiness KPI with score and band', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    // readiness = round(0.5*85 + 0.3*30 + 0.2*100) = round(71.5) = 72 → Strong
    expect(await screen.findByText('Placement readiness')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('renders the eligible companies list with reasons', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(await screen.findByText('Eligible companies')).toBeInTheDocument()
    // TCS appears in both the eligible list and the applications list.
    expect(screen.getAllByText('TCS').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Microsoft')).toBeInTheDocument()
    expect(screen.getByText('✔ Eligible')).toBeInTheDocument()
    expect(screen.getByText('Not eligible')).toBeInTheDocument()
  })

  it('renders application counts by status and the list', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(await screen.findByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('applied 1')).toBeInTheDocument()
    // TCS appears in both the eligible list and the applications list.
    expect(screen.getAllByText('TCS').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the skill progress bar', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(await screen.findByText('Skill progress')).toBeInTheDocument()
    expect(screen.getByText('3 of 10 skills listed')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  })

  it('renders Phase-2 placeholder cards', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(await screen.findByText('Mock interview')).toBeInTheDocument()
    expect(screen.getByText('Aptitude practice')).toBeInTheDocument()
    expect(screen.getByText('Coding practice')).toBeInTheDocument()
    expect(screen.getAllByText('Coming in Phase 2').length).toBe(3)
  })
})

describe('Dashboard — placement empty states', () => {
  it('prompts the user to complete the profile when none exists', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile: null, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(
      await screen.findByText(/complete your profile to see which companies/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
  })

  it('shows an empty applications state', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    makeSupabaseClient({ profile, companies, applications: [] })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    expect(
      await screen.findByText(/no applications tracked yet/i),
    ).toBeInTheDocument()
  })
})

describe('Dashboard — add application form', () => {
  it('inserts an application with the selected company and status', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    const { inserts } = makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /add/i }))
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: 'c1' },
    })
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'interview' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))

    await waitFor(() => {
      expect(inserts).toHaveLength(1)
    })
    expect(inserts[0]).toMatchObject({
      user_id: 'user_1',
      company_id: 'c1',
      status: 'interview',
    })
  })

  it('inserts a free-text company name when Other is selected', async () => {
    historyMock.loadHistory.mockResolvedValue(rows)
    const { inserts } = makeSupabaseClient({ profile, companies, applications })

    render(<Dashboard userId="user_1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /add/i }))
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: '__other__' },
    })
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'StartupX' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))

    await waitFor(() => {
      expect(inserts).toHaveLength(1)
    })
    expect(inserts[0]).toMatchObject({
      user_id: 'user_1',
      company_id: null,
      company_name: 'StartupX',
    })
  })
})