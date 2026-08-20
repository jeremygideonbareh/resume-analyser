/**
 * Deterministic eligibility evaluation (D7, D12) — pure rules, no LLM.
 *
 * The chatbot server (`api/chat.ts`) and the dashboard (`dashboard-data.ts`)
 * both use this logic. The server copy inside `api/chat.ts` is intentionally
 * duplicated (D12) so the serverless function stays self-contained; this
 * client copy powers the dashboard and is the reference implementation.
 *
 * Rules (per plan T1.3):
 *   - CGPA ≥ min_cgpa, else reason "CGPA below cutoff".
 *   - backlogs ≤ max_backlogs, else reason "Has N active backlog(s)".
 *   - required_skills ⊆ profile.skills (case-insensitive), else
 *     reason "Missing: X, Y".
 *   - preferred_skills intersection adds a positive "Preferred skills" reason
 *     (informational, never disqualifying).
 * Passing criteria produce positive reasons so the UI can render the
 * "✔ reasons" list on the eligibility card.
 */
import type { StudentProfile, Company, EligibilityResult } from './placement-types'

export function evaluateEligibility(
  profile: StudentProfile,
  company: Company,
): EligibilityResult {
  const reasons: string[] = []
  let eligible = true

  if (company.min_cgpa != null) {
    const cgpa = profile.cgpa ?? 0
    if (cgpa < company.min_cgpa) {
      eligible = false
      reasons.push('CGPA below cutoff')
    } else {
      reasons.push(`CGPA ${cgpa} meets the ${company.min_cgpa} cutoff`)
    }
  }

  if (company.max_backlogs != null) {
    if (profile.backlogs > company.max_backlogs) {
      eligible = false
      reasons.push(`Has ${profile.backlogs} active backlog(s)`)
    } else {
      reasons.push(`Backlogs (${profile.backlogs}) within the limit`)
    }
  }

  const profileSkills = new Set(
    profile.skills.map((s) => s.trim().toLowerCase()),
  )
  const missing = company.required_skills.filter(
    (s) => !profileSkills.has(s.trim().toLowerCase()),
  )
  if (missing.length > 0) {
    eligible = false
    reasons.push(`Missing: ${missing.join(', ')}`)
  } else if (company.required_skills.length > 0) {
    reasons.push(`Has all required skills (${company.required_skills.join(', ')})`)
  }

  const preferred = company.preferred_skills.filter((s) =>
    profileSkills.has(s.trim().toLowerCase()),
  )
  if (preferred.length > 0) {
    reasons.push(`Preferred skills: ${preferred.join(', ')}`)
  }

  return { company: company.name, eligible, reasons }
}