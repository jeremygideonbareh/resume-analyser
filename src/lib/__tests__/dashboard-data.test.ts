import { describe, it, expect } from 'vitest'
import {
  kpiStats,
  scoreTrend,
  sectionBreakdown,
  recentRows,
  activityItems,
  eligibleCompanies,
  readinessStats,
  applicationStats,
} from '@/lib/dashboard-data'
import type { AnalysisHistoryRow } from '@/lib/history'
import type {
  StudentProfile,
  Company,
  Application,
} from '@/lib/placement-types'

/**
 * Todo 3.4 — dashboard data derivation (pure helpers).
 *
 * `loadHistory` (3.3) returns rows NEWEST-FIRST. Every helper here must
 * document and respect that ordering: `recentRows` / `activityItems` keep
 * newest-first (list UIs), while `scoreTrend` / `sectionBreakdown` reverse
 * to oldest→newest for the time-series charts.
 */

function makeRow(overrides: Partial<AnalysisHistoryRow>): AnalysisHistoryRow {
  return {
    id: 'r1',
    user_id: 'user_1',
    created_at: '2026-08-01T10:00:00Z',
    filename: 'resume.pdf',
    format: 'pdf',
    score: 70,
    section_scores: { keywords: 30, structure: 12 },
    skills: ['react', 'typescript'],
    keyword_match: null,
    ...overrides,
  }
}

describe('kpiStats', () => {
  it('returns all-zero KPI cards for an empty history', () => {
    const stats = kpiStats([])
    expect(stats).toHaveLength(4)
    for (const s of stats) {
      expect(s.value).toBe('0')
      expect(s.delta).toBe(0)
    }
  })

  it('computes count / avg / skills union / best from one row', () => {
    const stats = kpiStats([
      makeRow({
        id: 'a',
        created_at: '2026-08-01T10:00:00Z',
        score: 72,
        skills: ['react', 'typescript', 'git'],
      }),
    ])
    const byLabel = Object.fromEntries(stats.map((s) => [s.label, s]))
    expect(byLabel['Analyses run'].value).toBe('1')
    expect(byLabel['Average ATS score'].value).toBe('72')
    expect(byLabel['Skills detected'].value).toBe('3')
    expect(byLabel['Best score'].value).toBe('72')
    // Single row: no first→last trend to compute.
    expect(byLabel['Average ATS score'].delta).toBe(0)
  })

  it('averages scores, unions skills, takes max, and trends avg vs first analysis', () => {
    // NEWEST-FIRST input (loadHistory contract).
    const stats = kpiStats([
      makeRow({
        id: 'c',
        created_at: '2026-08-03T10:00:00Z',
        score: 80,
        skills: ['react', 'graphql'],
      }),
      makeRow({
        id: 'b',
        created_at: '2026-08-02T10:00:00Z',
        score: 70,
        skills: ['react', 'typescript'],
      }),
      makeRow({
        id: 'a',
        created_at: '2026-08-01T10:00:00Z',
        score: 60,
        skills: ['git'],
      }),
    ])
    const byLabel = Object.fromEntries(stats.map((s) => [s.label, s]))
    expect(byLabel['Analyses run'].value).toBe('3')
    expect(byLabel['Average ATS score'].value).toBe('70')
    expect(byLabel['Best score'].value).toBe('80')
    expect(byLabel['Skills detected'].value).toBe('4') // react, graphql, typescript, git
    // ((80 - 60) / 60) * 100 = 33.33 → 1dp 33.3
    expect(byLabel['Average ATS score'].delta).toBeCloseTo(33.3, 1)
  })

  it('avoids a divide-by-zero trend when the first analysis scored 0', () => {
    const stats = kpiStats([
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', score: 45 }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', score: 0 }),
    ])
    const avg = stats.find((s) => s.label === 'Average ATS score')
    expect(avg?.delta).toBe(0)
  })
})

describe('scoreTrend', () => {
  it('returns an empty series for an empty history', () => {
    expect(scoreTrend([])).toEqual([])
  })

  it('keeps the most recent n analyses in OLDEST→NEWEST order (chart order)', () => {
    const rows = [
      makeRow({ id: 'd', created_at: '2026-08-04T10:00:00Z', score: 82 }),
      makeRow({ id: 'c', created_at: '2026-08-03T10:00:00Z', score: 71 }),
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', score: 64 }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', score: 58 }),
    ]
    const trend = scoreTrend(rows, 3)
    expect(trend).toEqual([
      { created_at: '2026-08-02', score: 64 },
      { created_at: '2026-08-03', score: 71 },
      { created_at: '2026-08-04', score: 82 },
    ])
  })

  it('returns all rows (chronological) when there are fewer than n', () => {
    const rows = [
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', score: 64 }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', score: 58 }),
    ]
    expect(scoreTrend(rows, 7)).toHaveLength(2)
    expect(scoreTrend(rows, 7)[0].created_at).toBe('2026-08-01')
  })
})

describe('sectionBreakdown', () => {
  it('returns an empty breakdown for an empty history', () => {
    expect(sectionBreakdown([])).toEqual([])
  })

  it('maps section_scores to normalized 0–100 percentages in chronological order', () => {
    // keywords weight 45, structure weight 17 (analysis.ts WEIGHTS).
    const rows = [
      makeRow({
        id: 'b',
        created_at: '2026-08-02T10:00:00Z',
        section_scores: { keywords: 45, structure: 17 },
      }),
      makeRow({
        id: 'a',
        created_at: '2026-08-01T10:00:00Z',
        section_scores: { keywords: 30, structure: 12 },
      }),
    ]
    expect(sectionBreakdown(rows, 7)).toEqual([
      { date: '2026-08-01', keywords: 67, structure: 71 },
      { date: '2026-08-02', keywords: 100, structure: 100 },
    ])
  })

  it('treats missing category keys as 0 and clips the window to n', () => {
    const rows = [
      makeRow({ id: 'c', created_at: '2026-08-03T10:00:00Z', section_scores: {} }),
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', section_scores: {} }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', section_scores: {} }),
    ]
    expect(sectionBreakdown(rows, 2)).toHaveLength(2)
    for (const row of sectionBreakdown(rows, 2)) {
      expect(row.keywords).toBe(0)
      expect(row.structure).toBe(0)
    }
  })
})

describe('recentRows', () => {
  it('returns an empty list for an empty history', () => {
    expect(recentRows([])).toEqual([])
  })

  it('keeps newest-first order, uppercases format, and clips to n', () => {
    const rows = [
      makeRow({ id: 'd', created_at: '2026-08-04T10:00:00Z', filename: 'a.pdf', format: 'pdf', score: 82 }),
      makeRow({ id: 'c', created_at: '2026-08-03T10:00:00Z', filename: 'b.docx', format: 'docx', score: 71 }),
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', filename: 'c.txt', format: 'txt', score: 64 }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', filename: 'd.pdf', format: 'pdf', score: 58 }),
    ]
    expect(recentRows(rows, 3)).toEqual([
      { id: 'd', filename: 'a.pdf', format: 'PDF', score: 82 },
      { id: 'c', filename: 'b.docx', format: 'DOCX', score: 71 },
      { id: 'b', filename: 'c.txt', format: 'TXT', score: 64 },
    ])
  })
})

describe('activityItems', () => {
  it('returns an empty list for an empty history', () => {
    expect(activityItems([])).toEqual([])
  })

  it('derives one "Analysed {filename}" item per recent analysis, newest first', () => {
    const rows = [
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', filename: 'new.pdf' }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', filename: 'old.pdf' }),
    ]
    expect(activityItems(rows, 4)).toEqual([
      { title: 'Analysed new.pdf', created_at: '2026-08-02' },
      { title: 'Analysed old.pdf', created_at: '2026-08-01' },
    ])
  })

  it('clips to n items', () => {
    const rows = [
      makeRow({ id: 'd', created_at: '2026-08-04T10:00:00Z', filename: 'd.pdf' }),
      makeRow({ id: 'c', created_at: '2026-08-03T10:00:00Z', filename: 'c.pdf' }),
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', filename: 'b.pdf' }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', filename: 'a.pdf' }),
    ]
    expect(activityItems(rows, 2)).toHaveLength(2)
  })
})

// --- Placement Assistant helpers (T5.1) -----------------------------------

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
    programming_languages: ['python'],
    portfolio_url: null,
    github_url: 'https://github.com/teststudent',
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

function makeApplication(overrides: Partial<Application>): Application {
  return {
    id: 'a1',
    created_at: '2026-08-20T00:00:00Z',
    user_id: 'user_1',
    company_id: 'c1',
    company_name: 'TestCorp',
    status: 'applied',
    applied_at: '2026-08-20T00:00:00Z',
    notes: null,
    ...overrides,
  }
}

describe('eligibleCompanies', () => {
  it('returns an empty list when the student has no profile', () => {
    expect(eligibleCompanies(null, [makeCompany()])).toEqual([])
  })

  it('evaluates the profile against every company', () => {
    const results = eligibleCompanies(makeProfile(), [
      makeCompany(),
      makeCompany({ id: 'c2', name: 'OtherCorp', min_cgpa: 9.0 }),
    ])
    expect(results).toHaveLength(2)
    expect(results[0].eligible).toBe(true)
    expect(results[1].eligible).toBe(false)
    expect(results[1].reasons).toContain('CGPA below cutoff')
  })
})

describe('readinessStats', () => {
  it('scores 0 for a user with no profile and no analyses', () => {
    const stats = readinessStats(null, [])
    expect(stats.score).toBe(0)
    expect(stats.band.label).toBe('Weak')
    expect(stats.resumeScore).toBe(0)
    expect(stats.skillCoverage).toBe(0)
    expect(stats.profileCompleteness).toBe(0)
  })

  it('uses the latest analysis score (newest-first input) and full profile', () => {
    const rows = [
      makeRow({ id: 'b', created_at: '2026-08-02T10:00:00Z', score: 80 }),
      makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', score: 60 }),
    ]
    const stats = readinessStats(makeProfile(), rows)
    // resume 80 → 40 + skills 3/10 → 30*0.3=9 + completeness 100 → 20 = 69
    expect(stats.resumeScore).toBe(80)
    expect(stats.skillCoverage).toBe(30)
    expect(stats.profileCompleteness).toBe(100)
    expect(stats.score).toBe(69)
    expect(stats.band.label).toBe('Needs work')
  })

  it('ignores older analyses when the newest score is 0', () => {
    const rows = [makeRow({ id: 'a', created_at: '2026-08-01T10:00:00Z', score: 0 })]
    const stats = readinessStats(null, rows)
    expect(stats.resumeScore).toBe(0)
    expect(stats.score).toBe(0)
  })
})

describe('applicationStats', () => {
  it('zero-fills every status for an empty list', () => {
    expect(applicationStats([])).toEqual({
      draft: 0,
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    })
  })

  it('counts applications by status', () => {
    const stats = applicationStats([
      makeApplication({ status: 'applied' }),
      makeApplication({ status: 'applied' }),
      makeApplication({ status: 'interview' }),
      makeApplication({ status: 'offer' }),
    ])
    expect(stats.applied).toBe(2)
    expect(stats.interview).toBe(1)
    expect(stats.offer).toBe(1)
    expect(stats.draft).toBe(0)
  })
})
