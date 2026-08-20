import { describe, it, expect } from 'vitest'
import {
  computeReadiness,
  skillCoverageScore,
  profileCompletenessScore,
} from '@/lib/readiness'
import type { StudentProfile } from '@/lib/placement-types'

/**
 * T5.1 / T2.2 — readiness score helpers (D8).
 *
 * Cases per the plan: formula math, clamp, empty/partial/full profiles,
 * division guards.
 */

function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 'p1',
    created_at: '2026-08-20T00:00:00Z',
    user_id: 'user_1',
    full_name: null,
    department: null,
    semester: null,
    cgpa: null,
    backlogs: 0,
    skills: [],
    certifications: [],
    programming_languages: [],
    portfolio_url: null,
    github_url: null,
    linkedin_url: null,
    target_role: null,
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  }
}

describe('computeReadiness', () => {
  it('computes the D8 weighted formula', () => {
    // 0.5*80 + 0.3*50 + 0.2*100 = 40 + 15 + 20 = 75
    expect(
      computeReadiness({
        resumeScore: 80,
        skillCoverageScore: 50,
        profileCompletenessScore: 100,
      }),
    ).toBe(75)
  })

  it('rounds to the nearest integer', () => {
    // 0.5*70 + 0.3*33 + 0.2*50 = 35 + 9.9 + 10 = 54.9 → 55
    expect(
      computeReadiness({
        resumeScore: 70,
        skillCoverageScore: 33,
        profileCompletenessScore: 50,
      }),
    ).toBe(55)
  })

  it('clamps to 0..100', () => {
    expect(
      computeReadiness({
        resumeScore: 100,
        skillCoverageScore: 100,
        profileCompletenessScore: 100,
      }),
    ).toBe(100)
    expect(
      computeReadiness({
        resumeScore: 0,
        skillCoverageScore: 0,
        profileCompletenessScore: 0,
      }),
    ).toBe(0)
  })

  it('treats a missing resume score as 0 (no division by zero)', () => {
    // 0.5*0 + 0.3*100 + 0.2*100 = 50
    expect(
      computeReadiness({
        resumeScore: 0,
        skillCoverageScore: 100,
        profileCompletenessScore: 100,
      }),
    ).toBe(50)
  })
})

describe('skillCoverageScore', () => {
  it('is 0 for no skills', () => {
    expect(skillCoverageScore([])).toBe(0)
  })

  it('scales linearly to 100 at 10 skills', () => {
    const skills = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    expect(skillCoverageScore(skills)).toBe(100)
  })

  it('caps at 100 beyond 10 skills', () => {
    const skills = Array.from({ length: 15 }, (_, i) => `s${i}`)
    expect(skillCoverageScore(skills)).toBe(100)
  })

  it('is 50 for 5 skills', () => {
    const skills = ['a', 'b', 'c', 'd', 'e']
    expect(skillCoverageScore(skills)).toBe(50)
  })
})

describe('profileCompletenessScore', () => {
  it('scores only the always-present backlogs field for an empty profile', () => {
    // backlogs is a non-null DB column defaulting to 0 → +10.
    expect(profileCompletenessScore(makeProfile())).toBe(10)
  })

  it('is 100 for a fully complete profile', () => {
    const full = makeProfile({
      full_name: 'Test Student',
      department: 'CSE',
      semester: 6,
      cgpa: 8.5,
      backlogs: 0,
      skills: ['python', 'java', 'sql'],
      programming_languages: ['python'],
      github_url: 'https://github.com/test',
    })
    expect(profileCompletenessScore(full)).toBe(100)
  })

  it('awards partial credit for a partially complete profile', () => {
    const partial = makeProfile({
      full_name: 'Test Student',
      department: 'CSE',
      skills: ['python', 'java', 'sql'],
    })
    // full_name 10 + department 10 + backlogs 10 + skills 20 = 50
    expect(profileCompletenessScore(partial)).toBe(50)
  })

  it('counts github OR portfolio for the links item', () => {
    expect(profileCompletenessScore(makeProfile({ portfolio_url: 'https://example.com' }))).toBe(20)
    expect(profileCompletenessScore(makeProfile({ github_url: 'https://github.com/x' }))).toBe(20)
  })

  it('requires at least 3 skills for the skills item', () => {
    expect(profileCompletenessScore(makeProfile({ skills: ['a', 'b'] }))).toBe(10)
    expect(profileCompletenessScore(makeProfile({ skills: ['a', 'b', 'c'] }))).toBe(30)
  })

  it('requires at least 1 programming language for that item', () => {
    expect(profileCompletenessScore(makeProfile({ programming_languages: ['python'] }))).toBe(20)
  })

  it('rejects out-of-range semester and cgpa values', () => {
    expect(profileCompletenessScore(makeProfile({ semester: 9, cgpa: 11 }))).toBe(10)
  })
})