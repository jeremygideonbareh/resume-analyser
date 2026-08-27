import { describe, expect, it } from 'vitest'
import { scanResumeIssues } from '../resume-issues'
import { buildAnnotatedLines } from '../report-format'
import type { ResumeIssue } from '../resume-issues'

function issue(
  text: string,
  category: ResumeIssue['category'],
  line: number,
  messageSubstr?: string,
): ResumeIssue {
  const found = scanResumeIssues(text).find(
    (i) => i.category === category && i.line === line,
  )
  if (!found) {
    throw new Error(
      `Expected a ${category} issue on line ${line}` +
        (messageSubstr ? ` matching "${messageSubstr}"` : '') +
        `. Got: ${JSON.stringify(scanResumeIssues(text))}`,
    )
  }
  if (messageSubstr && !found.message.toLowerCase().includes(messageSubstr.toLowerCase())) {
    throw new Error(
      `Issue message "${found.message}" did not include "${messageSubstr}"`,
    )
  }
  return found
}

describe('scanResumeIssues — rule coverage', () => {
  it('flags weak verbs', () => {
    const i = issue(
      'Responsible for the team.\nBuilt a dashboard.',
      'verbs',
      1,
      'responsible for',
    )
    expect(i.severity).toBe('warning')
    expect(i.original.toLowerCase()).toContain('responsible for')
  })

  it('flags buzzwords as info', () => {
    const i = issue('I am a team player and self-motivated.', 'buzzwords', 1)
    expect(i.severity).toBe('info')
  })

  it('flags placeholder text as critical', () => {
    const i = issue('Name: [insert your name]', 'placeholder', 1)
    expect(i.severity).toBe('critical')
    expect(i.message).toMatch(/placeholder/i)
  })

  it('flags repeated punctuation', () => {
    const i = issue('Worked hard.. on this project.', 'grammar', 1)
    expect(i.message).toMatch(/punctuation/i)
  })

  it('flags a bullet starting with lowercase', () => {
    const i = issue('• built a tool', 'grammar', 1)
    expect(i.message).toMatch(/lowercase/i)
  })

  it('flags inconsistent date formats on one line', () => {
    const i = issue('Jul 2021 – 2021/07', 'consistency', 1)
    expect(i.message).toMatch(/date format/i)
  })

  it('flags overlong bullets', () => {
    const longBullet =
      '• ' + 'responsible delivery of an end-to-end platform that handled hundreds ' +
      'of concurrent requests across multiple regions while remaining ' +
      'observable, resilient and easy to operate in production every single day ' +
      'without interruption to the business bottom line whatsoever.'
    const i = issue(longBullet, 'length', 1)
    expect(i.message).toMatch(/long/i)
  })

  it('flags a common skill typo', () => {
    const i = issue('Pyton', 'spelling', 1)
    expect(i.suggestion).toMatch(/python/i)
  })

  it('does not flag clean text', () => {
    const clean = [
      'Senior Software Engineer',
      'Built and scaled a payments platform handling $2M/yr.',
      'Stack: React, TypeScript, Node, Docker.',
    ].join('\n')
    expect(scanResumeIssues(clean)).toEqual([])
  })

  it('reports correct absolute offsets', () => {
    const text = 'Responsible for X\n'
    const i = scanResumeIssues(text).find((x) => x.category === 'verbs')!
    expect(i.line).toBe(1)
    // "Responsible for" starts at index 0 within line 1.
    expect(i.start).toBe(0)
    // Match length covers "Responsible for".
    expect(i.end).toBeGreaterThan(0)
  })
})

describe('buildAnnotatedLines', () => {
  it('tiles a line into plain + highlighted segments', () => {
    const text = 'I am responsible for the build\nClean line\n'
    const issues = scanResumeIssues(text)
    const lines = buildAnnotatedLines(text, issues)
    // Two content lines.
    expect(lines).toHaveLength(3)
    const first = lines[0]
    expect(first.line).toBe(1)
    const highlighted = first.segments.filter((s) => s.issue)
    const plain = first.segments.filter((s) => !s.issue)
    expect(highlighted.length).toBeGreaterThan(0)
    // Reconstruct the line from segments.
    expect(first.segments.map((s) => s.text).join('')).toBe('I am responsible for the build')
    expect(plain.length).toBeGreaterThan(0)
  })

  it('handles multi-line documents and empty trailing newline', () => {
    const text = 'Alpha\nBeta\nGamma'
    const lines = buildAnnotatedLines(text, [])
    expect(lines).toHaveLength(3)
    expect(lines.map((l) => l.segments.map((s) => s.text).join(''))).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
  })

  it('orders narrower issues first and avoids overlap gap', () => {
    // A whole-line issue plus a contained verb issue would overlap; the builder
    // must still produce a contiguous line reconstruction.
    const text = 'Responsible for the project end\n'
    const issues = [
      {
        line: 1,
        start: 0,
        end: 30,
        severity: 'warning' as const,
        category: 'consistency' as const,
        message: 'whole line',
        suggestion: 'fix',
        original: text.trim(),
      },
      {
        line: 1,
        start: 0,
        end: 15,
        severity: 'warning' as const,
        category: 'verbs' as const,
        message: 'weak verb',
        suggestion: 'replace',
        original: 'Responsible for',
      },
    ]
    const lines = buildAnnotatedLines(text, issues)
    expect(lines[0].segments.map((s) => s.text).join('')).toBe(text.trim())
  })
})
