import { WEIGHTS } from './analysis'
import type { AnalysisHistoryRow } from './history'
import { evaluateEligibility } from './eligibility'
import {
  computeReadiness,
  skillCoverageScore,
  profileCompletenessScore,
} from './readiness'
import { scoreBand } from './report-format'
import type {
  StudentProfile,
  Company,
  Application,
  ApplicationStatus,
  EligibilityResult,
} from './placement-types'

/**
 * Todo 3.4 — dashboard data derivation (pure helpers, no React).
 *
 * Input rows ALWAYS come from `loadHistory` (3.3), which returns NEWEST-FIRST.
 * Two presentation contracts:
 *   - list UIs (KPI order, recent rows, activity feed) keep newest-first;
 *   - time-series charts (score trend, section breakdown) are reversed to
 *     oldest→newest so the x-axis reads left-to-right chronologically.
 */

export interface DashboardKpi {
  label: string
  value: string
  /** Percentage trend; 0 when not meaningful (lifetime counts/max). */
  delta: number
  /** Truthful footer copy describing what the delta compares against. */
  footer: string
}

export interface ScoreTrendPoint {
  created_at: string
  score: number
}

export interface SectionScorePoint {
  date: string
  keywords: number
  structure: number
}

export interface RecentAnalysisRow {
  id: string
  filename: string
  format: string
  score: number
}

export interface ActivityItem {
  title: string
  created_at: string
}

/** Percentage change from the first to the most recent score, 1dp. 0 when not computable. */
function scoreDeltaPct(rows: readonly AnalysisHistoryRow[]): number {
  const newest = rows[0]?.score
  const oldest = rows.at(-1)?.score
  if (newest === undefined || oldest === undefined || oldest === 0) return 0
  return Number((((newest - oldest) / oldest) * 100).toFixed(1))
}

/**
 * KPI cards: Analyses run, Average ATS score, Skills detected (union),
 * Best score. Delta is meaningful only for the average (first→last trend);
 * the others are lifetime counts and read as a flat 0.
 */
export function kpiStats(rows: readonly AnalysisHistoryRow[]): DashboardKpi[] {
  const count = rows.length
  const avg =
    count === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.score, 0) / count)
  const skills = new Set(rows.flatMap((r) => r.skills))
  const best = count === 0 ? 0 : Math.max(...rows.map((r) => r.score))

  return [
    { label: 'Analyses run', value: String(count), delta: 0, footer: 'all time' },
    {
      label: 'Average ATS score',
      value: String(avg),
      delta: scoreDeltaPct(rows),
      footer: 'vs first analysis',
    },
    {
      label: 'Skills detected',
      value: String(skills.size),
      delta: 0,
      footer: 'all time',
    },
    { label: 'Best score', value: String(best), delta: 0, footer: 'all time' },
  ]
}

/** Last n analyses as a chronological (oldest→newest) score series. */
export function scoreTrend(
  rows: readonly AnalysisHistoryRow[],
  n = 7,
): ScoreTrendPoint[] {
  return rows
    .slice(0, n)
    .reverse()
    .map((r) => ({ created_at: r.created_at.slice(0, 10), score: r.score }))
}

/**
 * Last n analyses as a chronological keywords/structure series, normalized to
 * 0–100 so the two categories plot on a shared scale (raw earned points have
 * different maxima — keywords 45 vs structure 17).
 */
export function sectionBreakdown(
  rows: readonly AnalysisHistoryRow[],
  n = 7,
): SectionScorePoint[] {
  return rows.slice(0, n).reverse().map((r) => {
    const earned = r.section_scores ?? {}
    return {
      // Date-only part: the charts feed this into formatDate/parseIsoCalendarDate
      // (formater.ts), which appends `T12:00:00` — a full ISO timestamp would
      // produce an Invalid Date.
      date: r.created_at.slice(0, 10),
      keywords: Math.round((earned.keywords ?? 0) / WEIGHTS.keywords * 100),
      structure: Math.round((earned.structure ?? 0) / WEIGHTS.structure * 100),
    }
  })
}

/** Last n analyses, newest-first, for the "Recent analyses" table. */
export function recentRows(
  rows: readonly AnalysisHistoryRow[],
  n = 4,
): RecentAnalysisRow[] {
  return rows.slice(0, n).map((r) => ({
    id: r.id,
    filename: r.filename,
    format: r.format.toUpperCase(),
    score: r.score,
  }))
}

/** Last n analyses, newest-first, as activity-feed entries. */
export function activityItems(
  rows: readonly AnalysisHistoryRow[],
  n = 4,
): ActivityItem[] {
  return rows.slice(0, n).map((r) => ({
    title: `Analysed ${r.filename}`,
    created_at: r.created_at.slice(0, 10),
  }))
}

// --- Placement Assistant helpers (T5.1) -----------------------------------

export interface ReadinessStats {
  score: number
  band: ReturnType<typeof scoreBand>
  resumeScore: number
  skillCoverage: number
  profileCompleteness: number
}

/**
 * Evaluate the student profile against every company (delegates to the pure
 * `evaluateEligibility` in `src/lib/eligibility.ts`). Returns [] when the
 * student has no profile yet.
 */
export function eligibleCompanies(
  profile: StudentProfile | null,
  companies: readonly Company[],
): EligibilityResult[] {
  if (!profile) return []
  return companies.map((c) => evaluateEligibility(profile, c))
}

/**
 * Placement readiness stats (D8). `recentAnalyses` is NEWEST-FIRST (the
 * `loadHistory` contract) — the latest saved analysis score is rows[0].
 * A missing profile contributes 0 for both skill coverage and completeness.
 */
export function readinessStats(
  profile: StudentProfile | null,
  recentAnalyses: readonly AnalysisHistoryRow[],
): ReadinessStats {
  const resumeScore = recentAnalyses[0]?.score ?? 0
  const skillCoverage = skillCoverageScore(profile?.skills ?? [])
  const profileCompleteness = profile
    ? profileCompletenessScore(profile)
    : 0
  const score = computeReadiness({
    resumeScore,
    skillCoverageScore: skillCoverage,
    profileCompletenessScore: profileCompleteness,
  })
  return {
    score,
    band: scoreBand(score),
    resumeScore,
    skillCoverage,
    profileCompleteness,
  }
}

/** Count applications by status (all six statuses present, zero-filled). */
export function applicationStats(
  applications: readonly Application[],
): Record<ApplicationStatus, number> {
  const stats: Record<ApplicationStatus, number> = {
    draft: 0,
    applied: 0,
    shortlisted: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  }
  for (const app of applications) {
    stats[app.status] += 1
  }
  return stats
}
