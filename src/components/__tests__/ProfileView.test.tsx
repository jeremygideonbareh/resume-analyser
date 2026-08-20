// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ProfileView } from '@/components/ProfileView'
import type { StudentProfile } from '@/lib/placement-types'

const { supabaseMock, toastMock } = vi.hoisted(() => ({
  supabaseMock: {
    getSupabase: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: supabaseMock.getSupabase,
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

/**
 * T2.1 + T2.2 — ProfileView tests.
 *
 * Cases per the plan: load prefill, save payload, validation errors,
 * completeness meter math, gate.
 */

function makeSupabaseMock(opts: {
  profile?: StudentProfile | null
  upsertError?: Error | null
} = {}) {
  const upserts: Array<Record<string, unknown>> = []
  const client = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: opts.profile ?? null,
            error: null,
          }),
        })),
      })),
      upsert: vi.fn((row: Record<string, unknown>) => {
        upserts.push(row)
        return Promise.resolve({ data: null, error: opts.upsertError ?? null })
      }),
    })),
  }
  supabaseMock.getSupabase.mockReturnValue(client as never)
  return { client, upserts }
}

const fullProfile: StudentProfile = {
  id: 'p1',
  created_at: '2026-08-20T00:00:00Z',
  user_id: 'user_1',
  full_name: 'Priya Sharma',
  department: 'CSE',
  semester: 6,
  cgpa: 8.5,
  backlogs: 0,
  skills: ['python', 'java', 'sql'],
  certifications: ['AWS Cloud Practitioner'],
  programming_languages: ['Python', 'Java'],
  portfolio_url: 'https://portfolio.dev',
  github_url: 'https://github.com/priya',
  linkedin_url: 'https://linkedin.com/in/priya',
  target_role: 'Software Engineer',
  updated_at: '2026-08-20T00:00:00Z',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProfileView — gate', () => {
  it('shows a sign-in prompt when no userId is provided', () => {
    render(<ProfileView />)
    expect(
      screen.getByText(/sign in to manage your placement profile/i),
    ).toBeInTheDocument()
  })
})

describe('ProfileView — load prefill', () => {
  it('loads the existing profile and prefills the form', async () => {
    makeSupabaseMock({ profile: fullProfile })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Priya Sharma')
    })
    expect(screen.getByLabelText(/cgpa/i)).toHaveValue(8.5)
    expect(screen.getByLabelText('Skills (comma-separated)')).toHaveValue('python, java, sql')
    expect(screen.getByLabelText('Certifications (comma-separated)')).toHaveValue('AWS Cloud Practitioner')
    expect(screen.getByLabelText(/target role/i)).toHaveValue('Software Engineer')
    expect(screen.getByLabelText(/portfolio url/i)).toHaveValue('https://portfolio.dev')
  })

  it('shows a loading state while fetching', () => {
    makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)
    expect(screen.getByRole('status')).toHaveTextContent(/loading your profile/i)
  })
})

describe('ProfileView — save payload', () => {
  it('upserts the form values scoped to the user id', async () => {
    const { upserts } = makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Priya Sharma' },
    })
    fireEvent.change(screen.getByLabelText('Skills (comma-separated)'), {
      target: { value: 'python, java, sql' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(upserts).toHaveLength(1)
    })
    expect(upserts[0]).toMatchObject({
      user_id: 'user_1',
      full_name: 'Priya Sharma',
      skills: ['python', 'java', 'sql'],
      backlogs: 0,
    })
  })

  it('shows an error toast when the upsert fails', async () => {
    makeSupabaseMock({ upsertError: new Error('RLS denied') })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not save your profile'),
      )
    })
  })
})

describe('ProfileView — validation', () => {
  it('rejects an out-of-range CGPA with an inline error', async () => {
    makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/cgpa/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/cgpa/i), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/cgpa must be between 0 and 10/i)).toBeInTheDocument()
  })

  it('rejects an invalid URL with an inline error', async () => {
    makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/github url/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/github url/i), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/github url must start with http/i)).toBeInTheDocument()
  })

  it('does not upsert when validation fails', async () => {
    const { upserts } = makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/cgpa/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/cgpa/i), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(upserts).toHaveLength(0)
  })
})

describe('ProfileView — completeness meter', () => {
  it('shows 100% for a fully complete profile', async () => {
    makeSupabaseMock({ profile: fullProfile })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    })
  })

  it('shows the partial percentage for a partially complete profile', async () => {
    makeSupabaseMock({
      profile: {
        ...fullProfile,
        full_name: null,
        department: null,
        semester: null,
        cgpa: null,
        skills: [],
        programming_languages: [],
        portfolio_url: null,
        github_url: null,
        linkedin_url: null,
        target_role: null,
      },
    })
    render(<ProfileView userId="user_1" />)

    // backlogs 10 only → 10%
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
    })
  })

  it('updates the meter live as fields are filled', async () => {
    makeSupabaseMock({ profile: null })
    render(<ProfileView userId="user_1" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })
    // Empty form: backlogs default 0 → 10%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Priya Sharma' },
    })
    fireEvent.change(screen.getByLabelText(/department/i), {
      target: { value: 'CSE' },
    })
    fireEvent.change(screen.getByLabelText('Skills (comma-separated)'), {
      target: { value: 'python, java, sql' },
    })
    // +10 name +10 dept +20 skills = 50
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })
})