import type { AnalysisResult, FeedbackItem } from './analysis'
import type { ParsedResume } from './parsing'
import type { ResumeIssue } from './resume-issues'

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

// --- annotated resume preview (Todo: line-anchored issues) ----------------

export interface AnnotatedSegment {
  text: string
  issue: ResumeIssue | null
}

export interface AnnotatedLine {
  line: number
  segments: AnnotatedSegment[]
}

/**
 * Split the resume text into lines, each with its issue-highlight spans.
 *
 * Issues are anchored to 1-based line numbers and absolute char offsets.
 * Where two issues overlap on a line we keep the most specific (smallest)
 * span so segments always tile the line without gaps or double-highlighting.
 */
export function buildAnnotatedLines(
  text: string,
  issues: ResumeIssue[],
): AnnotatedLine[] {
  const rawLines = text.split(/\r?\n/)
  const lines: AnnotatedLine[] = []
  let offset = 0

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const lineStart = offset
    const lineEnd = offset + raw.length

    const candidates = issues
      .filter((issue) => issue.line === i + 1)
      .map((issue) => ({
        issue,
        localStart: Math.max(issue.start, lineStart) - lineStart,
        localEnd: Math.min(issue.end, lineEnd) - lineStart,
      }))
      .filter((c) => c.localEnd > c.localStart && c.localStart < raw.length)
      .sort((a, b) =>
        a.localStart - b.localStart || (a.localEnd - a.localStart) - (b.localEnd - b.localStart),
      )

    const segments: AnnotatedSegment[] = []
    let cursor = 0
    for (const { issue, localStart, localEnd } of candidates) {
      if (localStart < cursor) continue // already covered by a previous span
      if (localStart > cursor) {
        segments.push({ text: raw.slice(cursor, localStart), issue: null })
      }
      segments.push({ text: raw.slice(localStart, localEnd), issue })
      cursor = localEnd
    }
    if (cursor < raw.length) {
      segments.push({ text: raw.slice(cursor), issue: null })
    }

    lines.push({ line: i + 1, segments })
    offset += raw.length + 1
  }

  return lines
}
