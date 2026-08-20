/**
 * Placement readiness score (D8) — pure helpers, no React.
 *
 *   readiness = clamp(round(0.5 × resumeScore + 0.3 × skillCoverageScore
 *                          + 0.2 × profileCompletenessScore), 0, 100)
 *
 *   skillCoverageScore(skills)      = min(skills.length / 10, 1) × 100
 *   profileCompletenessScore(profile) = weighted completion:
 *     full_name 10 · department 10 · semester 10 · cgpa 20 · backlogs 10 ·
 *     skills ≥ 3 → 20 · programming_languages ≥ 1 → 10 ·
 *     github OR portfolio → 10   (total 100)
 *
 * `backlogs` is a non-null DB column defaulting to 0, so it always
 * contributes once a profile row exists.
 */
import type { StudentProfile } from './placement-types'

export interface ReadinessInputs {
  resumeScore: number
  skillCoverageScore: number
  profileCompletenessScore: number
}

export function computeReadiness(inputs: ReadinessInputs): number {
  const raw =
    0.5 * inputs.resumeScore +
    0.3 * inputs.skillCoverageScore +
    0.2 * inputs.profileCompletenessScore
  return Math.min(100, Math.max(0, Math.round(raw)))
}

export function skillCoverageScore(skills: readonly string[]): number {
  return Math.min(skills.length / 10, 1) * 100
}

export function profileCompletenessScore(profile: StudentProfile): number {
  let score = 0
  if (profile.full_name?.trim()) score += 10
  if (profile.department?.trim()) score += 10
  if (profile.semester != null && profile.semester >= 1 && profile.semester <= 8) {
    score += 10
  }
  if (profile.cgpa != null && profile.cgpa >= 0 && profile.cgpa <= 10) {
    score += 20
  }
  if (profile.backlogs >= 0) score += 10
  if (profile.skills.length >= 3) score += 20
  if (profile.programming_languages.length >= 1) score += 10
  if (profile.github_url?.trim() || profile.portfolio_url?.trim()) score += 10
  return score
}