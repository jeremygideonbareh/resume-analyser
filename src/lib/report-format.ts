import type { AnalysisResult, FeedbackItem } from './analysis'
import type { ParsedResume } from './parsing'

/**
 * Pure formatting helpers for the report UI. Kept free of React so they are
 * trivially unit-testable (Todo 4.1 acceptance: "unit test for pure
 * formatting helpers — score band color fn, feedback grouping").
 */

export interface ScoreBand {
  label: 'Strong' | 'Needs work' | 'Weak'
  /** Tailwind text color class for the band label. */
  textClass: string
  /** Tailwind fill/border class for the scorecard. */
  accentClass: string
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) {
    return {
      label: 'Strong',
      textClass: 'text-emerald-600',
      accentClass: 'border-emerald-600/40',
    }
  }
  if (score >= 40) {
    return {
      label: 'Needs work',
      textClass: 'text-amber-600',
      accentClass: 'border-amber-600/40',
    }
  }
  return {
    label: 'Weak',
    textClass: 'text-red-600',
    accentClass: 'border-red-600/40',
  }
}

export type FeedbackGroup = 'high' | 'medium' | 'low'

/** Priority grouping: critical → high, warning → medium, info → low. */
export function feedbackPriority(item: FeedbackItem): FeedbackGroup {
  switch (item.severity) {
    case 'critical':
      return 'high'
    case 'warning':
      return 'medium'
    default:
      return 'low'
  }
}

export function groupFeedback(
  items: FeedbackItem[],
): Record<FeedbackGroup, FeedbackItem[]> {
  const groups: Record<FeedbackGroup, FeedbackItem[]> = {
    high: [],
    medium: [],
    low: [],
  }
  for (const item of items) {
    groups[feedbackPriority(item)].push(item)
  }
  return groups
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

/** Human-readable clipboard summary ("Copy summary" button). */
export function buildCopySummary(
  result: AnalysisResult,
  parsed?: ParsedResume | null,
): string {
  const lines: string[] = []
  lines.push(`ATS Score: ${result.score}/100 (${scoreBand(result.score).label})`)
  if (parsed) {
    lines.push(
      `${parsed.format.toUpperCase()} · ${countWords(parsed.text)} words`,
    )
  }
  lines.push('')
  lines.push('Breakdown:')
  for (const c of result.breakdown) {
    lines.push(`- ${c.label}: ${c.earned}/${c.weight}`)
  }
  if (result.skills.length > 0) {
    lines.push('')
    lines.push(`Skills (${result.skills.length}): ${result.skills.join(', ')}`)
  }
  if (result.presentKeywords.length > 0) {
    lines.push('')
    lines.push(
      `JD keywords present (${result.presentKeywords.length}): ${result.presentKeywords.join(', ')}`,
    )
  }
  if (result.missingKeywords.length > 0) {
    lines.push(
      `JD keywords missing (${result.missingKeywords.length}): ${result.missingKeywords.join(', ')}`,
    )
  }
  if (result.feedback.length > 0) {
    lines.push('')
    lines.push('Feedback:')
    result.feedback.forEach((f, i) => {
      lines.push(`${i + 1}. [${f.severity}] ${f.message}`)
    })
  }
  return lines.join('\n')
}
