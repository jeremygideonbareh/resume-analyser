import { describe, it, expect } from 'vitest'
import { evaluateEligibility } from '@/lib/eligibility'
import type { StudentProfile, Company } from '@/lib/placement-types'

/**
 * T1.3 — deterministic eligibility evaluator.
 *
 * Cases per the plan: eligible (meets all), ineligible-per-criteria
 * (cgpa / backlogs / skills each), empty profile, null criteria
 * (no cutoff = pass).
 */

function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 'p1',
    created_at: '2026-08-20T00:00:00Z',
    user_id: 'user_1',
    full_name: 'Test Student',
    department: 'CSE',
    semester: 6,
    cgpa: 8.5,
    backlogs: 0,
    skills: ['python', 'java', 'sql'],
    certifications: [],
    programming_languages: ['python', 'java'],
    portfolio_url: null,
    github_url: null,
    linkedin_url: null,
    target_role: 'Software Engineer',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  }
}

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    created_at: '2026-08-20T00:00:00Z',
    name: 'TestCorp',
    min_cgpa: 7.0,
    max_backlogs: 0,
    required_skills: ['python', 'sql'],
    preferred_skills: ['java'],
    description: null,
    recruitment_process: null,
    salary_insights: null,
    ...overrides,
  }
}

describe('evaluateEligibility', () => {
  it('marks a profile that meets every criterion as eligible with positive reasons', () => {
    const result = evaluateEligibility(makeProfile(), makeCompany())
    expect(result.eligible).toBe(true)
    expect(result.company).toBe('TestCorp')
    expect(result.reasons).toContain('CGPA 8.5 meets the 7 cutoff')
    expect(result.reasons).toContain('Backlogs (0) within the limit')
    expect(result.reasons).toContain('Has all required skills (python, sql)')
    expect(result.reasons).toContain('Preferred skills: java')
  })

  it('flags a profile below the CGPA cutoff as ineligible', () => {
    const result = evaluateEligibility(makeProfile({ cgpa: 6.5 }), makeCompany())
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CGPA below cutoff')
  })

  it('flags a profile with too many backlogs as ineligible', () => {
    const result = evaluateEligibility(
      makeProfile({ backlogs: 2 }),
      makeCompany({ max_backlogs: 0 }),
    )
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('Has 2 active backlog(s)')
  })

  it('flags a profile missing required skills as ineligible', () => {
    const result = evaluateEligibility(
      makeProfile({ skills: ['python'] }),
      makeCompany(),
    )
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('Missing: sql')
  })

  it('treats an empty profile as ineligible when criteria exist', () => {
    const result = evaluateEligibility(
      makeProfile({ cgpa: null, backlogs: 0, skills: [] }),
      makeCompany(),
    )
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CGPA below cutoff')
    expect(result.reasons).toContain('Missing: python, sql')
  })

  it('passes when a company has no cutoffs (null criteria)', () => {
    const result = evaluateEligibility(
      makeProfile({ cgpa: null, backlogs: 0, skills: [] }),
      makeCompany({
        min_cgpa: null,
        max_backlogs: null,
        required_skills: [],
        preferred_skills: [],
      }),
    )
    expect(result.eligible).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('matches required skills case-insensitively and trims whitespace', () => {
    const result = evaluateEligibility(
      makeProfile({ skills: ['Python', ' SQL '] }),
      makeCompany(),
    )
    expect(result.eligible).toBe(true)
  })

  it('treats a missing CGPA as 0 against a cutoff (ineligible)', () => {
    const result = evaluateEligibility(
      makeProfile({ cgpa: null }),
      makeCompany({ min_cgpa: 6.0 }),
    )
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CGPA below cutoff')
  })
})