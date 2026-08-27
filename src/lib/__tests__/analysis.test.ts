import { describe, it, expect } from 'vitest'
import { analyzeResume } from '@/lib/analysis'

const STRONG_RESUME = `Professional Summary
Senior frontend developer with 8 years of experience building web applications.

Contact
jane.doe@email.com | +1 (555) 123-4567 | linkedin.com/in/janedoe

Skills
React, TypeScript, JavaScript, CSS, HTML, Node.js, Next.js, GraphQL, AWS, Docker, Jest, Figma

Experience
Senior Frontend Developer — Acme Corp (2021 – 2024)
- Improved page load time by 40% using React and TypeScript
- Reduced infrastructure costs by $50,000 with AWS optimization
- Increased conversion rate by 15% through A/B testing
- Led a team of 6 engineers

Education
B.S. Computer Science, State University (2015 – 2019)
`

const WEAK_RESUME = `I am a detail-oriented person looking for a new opportunity. I like working hard and helping my team succeed. I am friendly, organized, and always ready to learn.
`

const JD_MATCH_RESUME = `Jane Smith
React developer with TypeScript and SQL experience.
Skills: React, TypeScript, SQL, JavaScript
`

const JD_TEXT =
  'We need a React developer with TypeScript, CSS, AWS, and SQL experience.'

describe('analyzeResume', () => {
  it('scores a strong resume >= 70 with all sections detected', () => {
    const r = analyzeResume(STRONG_RESUME)
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(r.score).toBeLessThanOrEqual(100)
    for (const name of ['professional summary', 'experience', 'education', 'skills']) {
      expect(r.sections.find((s) => s.name === name)?.present).toBe(true)
    }
    expect(r.skills).toContain('react')
    expect(r.skills).toContain('typescript')
    expect(r.skills).toContain('aws')
    // contact signals all present in the strong fixture
    expect(r.breakdown.find((c) => c.id === 'contact')?.earned).toBe(8)
    // no critical feedback on a strong resume
    expect(r.feedback.some((f) => f.severity === 'critical')).toBe(false)
  })

  it('scores a weak resume <= 40 with matching feedback items', () => {
    const r = analyzeResume(WEAK_RESUME)
    expect(r.score).toBeLessThanOrEqual(40)
    const messages = r.feedback.map((f) => f.message)
    expect(messages.some((m) => /email and phone/.test(m))).toBe(true)
    expect(messages.some((m) => /bullet points/.test(m))).toBe(true)
    expect(messages.some((m) => /[Qq]uantify/.test(m))).toBe(true)
    expect(r.sections.find((s) => s.name === 'experience')?.present).toBe(false)
  })

  it('returns line-anchored issues for weak text and empty issues for empty input', () => {
    const r = analyzeResume(WEAK_RESUME)
    expect(Array.isArray(r.issues)).toBe(true)
    // The weak fixture uses a bullet-less run-on sentence; it should at least
    // surface a buzzword (detail-oriented) on line 1.
    expect(r.issues.some((i) => i.line >= 1 && i.original.length > 0)).toBe(true)
    expect(r.issues.every((i) => i.start >= 0 && i.end > i.start)).toBe(true)

    const empty = analyzeResume('   ')
    expect(empty.issues).toEqual([])
  })

  it('computes present/missing JD keywords correctly and scores keywords from them', () => {
    const r = analyzeResume(JD_MATCH_RESUME, { jdText: JD_TEXT })
    expect(r.presentKeywords).toEqual(
      expect.arrayContaining(['react', 'typescript', 'sql']),
    )
    expect(r.missingKeywords).toEqual(
      expect.arrayContaining(['css', 'aws']),
    )
    expect(r.presentKeywords).toHaveLength(3)
    expect(r.missingKeywords).toHaveLength(2)
    // 3 of 5 keywords present -> 3/5 * 45 = 27
    expect(r.breakdown.find((c) => c.id === 'keywords')?.earned).toBe(27)
    expect(r.feedback.some((f) => /css, aws/.test(f.message))).toBe(true)
  })

  it('returns score 0 and a no-content warning for empty input, without throwing', () => {
    expect(() => analyzeResume('')).not.toThrow()
    const r = analyzeResume('   ')
    expect(r.score).toBe(0)
    expect(r.warnings).toContain('no-content')
    expect(r.feedback.length).toBeGreaterThan(0)
  })

  it('keeps scores bounded 0–100 for all fixture inputs', () => {
    for (const [text, opts] of [
      [STRONG_RESUME, {}],
      [WEAK_RESUME, {}],
      [JD_MATCH_RESUME, { jdText: JD_TEXT }],
    ] as const) {
      const r = analyzeResume(text, opts)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    }
  })

  it('breakdown categories always sum to the final score (±1)', () => {
    const inputs = [
      [STRONG_RESUME, {}],
      [WEAK_RESUME, {}],
      [JD_MATCH_RESUME, { jdText: JD_TEXT }],
      ['', {}],
    ] as const
    for (const [text, opts] of inputs) {
      const r = analyzeResume(text, opts)
      const sum = r.breakdown.reduce((acc, c) => acc + c.earned, 0)
      expect(Math.abs(sum - r.score)).toBeLessThanOrEqual(1)
    }
  })

  it('penalizes parse-confidence for possible-scanned warnings', () => {
    const r = analyzeResume(STRONG_RESUME, {
      warnings: ['possible-scanned'],
    })
    expect(r.breakdown.find((c) => c.id === 'parse-confidence')?.earned).toBe(
      -5,
    )
  })
})
