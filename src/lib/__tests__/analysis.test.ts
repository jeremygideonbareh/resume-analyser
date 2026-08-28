import { describe, it, expect } from 'vitest'
import {
  analyzeResume,
  containsKeyword,
  hasPhoneNumber,
  recencyFactor,
} from '@/lib/analysis'

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

const contactOf = (text: string) =>
  analyzeResume(text).breakdown.find((c) => c.id === 'contact')?.earned ?? 0
const recencyOf = (text: string) =>
  analyzeResume(text).breakdown.find((c) => c.id === 'recency')?.earned ?? 0

describe('phone detection is international', () => {
  // This product's own sample data is CGPA, backlogs, Infosys and Zoho, so the
  // previous North-American-only 3-3-4 shape silently cost Indian students
  // three contact points on a correctly formatted number.
  it.each([
    ['+91 98765 43210', 'Indian mobile, spaced'],
    ['+91-98765-43210', 'Indian mobile, hyphenated'],
    ['9876543210', 'Indian mobile, bare'],
    ['+1 (555) 123-4567', 'US with country code and parens'],
    ['(555) 123-4567', 'US with parens'],
    ['555-123-4567', 'US plain'],
    ['+44 20 7946 0958', 'UK, four groups'],
  ])('detects %s (%s)', (phone) => {
    expect(hasPhoneNumber(`Contact me on ${phone} any time.`)).toBe(true)
  })

  it.each([
    ['Acme Corp (2021 – 2024)', 'a two-year range is 8 digits, below every real numbering plan'],
    ['Education 2015 – 2019', 'same, with an en dash'],
    ['B.Tech 2019 2020 2021', 'three adjacent years must not join into a number'],
  ])('does not mistake %s for a phone number', (text) => {
    expect(hasPhoneNumber(text)).toBe(false)
  })
})

describe('JD keyword matching respects word boundaries', () => {
  it('does not credit JavaScript as a match for a Java requirement', () => {
    const resume = 'Skills: JavaScript, TypeScript, React'
    const r = analyzeResume(resume, { jdText: 'We need Java and Spring.' })
    // The naive substring check reported Java present because "java" sits
    // inside "javascript" — telling a candidate they matched a requirement
    // they do not have, on the highest-weighted category.
    expect(r.presentKeywords).not.toContain('java')
    expect(r.missingKeywords).toContain('java')
  })

  it('treats punctuation as a boundary so tech names still match', () => {
    const text = 'experienced with node.js and c++'
    expect(containsKeyword(text, 'node.js')).toBe(true)
    expect(containsKeyword(text, 'c++')).toBe(true)
    // "node" matching "node.js" is intended, not a leak: a job description
    // asking for Node is satisfied by a resume saying Node.js. Only an
    // alphanumeric neighbour blocks a match, which is what stops "java" from
    // matching inside "javascript".
    expect(containsKeyword(text, 'node')).toBe(true)
    expect(containsKeyword('javascript developer', 'java')).toBe(false)
  })
})

describe('recency measures how recent, not merely whether a date exists', () => {
  const withYears = (a: number, b: number) =>
    `Experience\nSoftware Engineer — Acme (${a} – ${b})\n- Shipped features`

  it('scores a current resume above a stale one', () => {
    const now = new Date().getFullYear()
    const current = recencyOf(withYears(now - 2, now))
    const stale = recencyOf(withYears(2010, 2012))
    // Both used to earn the full 13: the old rule was "contains a 20xx".
    expect(current).toBeGreaterThan(stale)
    expect(stale).toBe(0)
  })

  it('awards full marks for the current and previous year, then decays', () => {
    const now = new Date().getFullYear()
    expect(recencyFactor(now, now)).toBe(1)
    expect(recencyFactor(now - 1, now)).toBe(1)
    expect(recencyFactor(now - 3, now)).toBeCloseTo(0.7, 5)
    expect(recencyFactor(now - 9, now)).toBe(0)
    expect(recencyFactor(null, now)).toBe(0)
  })

  it('flags a stale resume in feedback', () => {
    const r = analyzeResume(withYears(2010, 2012))
    expect(r.feedback.some((f) => f.category === 'recency' && /stale/i.test(f.message))).toBe(true)
  })

  it('ignores implausible future years rather than treating them as current', () => {
    const now = new Date().getFullYear()
    // A stray "2099" must not rescue a resume whose real dates are a decade old.
    expect(recencyOf(`Experience 2010 – 2012, ref 2099`)).toBe(0)
    expect(recencyFactor(now + 50, now)).toBe(1) // guard lives in mostRecentYear
  })
})

describe('quantification requires numbers, not just impact verbs', () => {
  const base = (body: string) =>
    `Experience\nEngineer — Acme (${new Date().getFullYear()})\n${body}`
  const formattingOf = (t: string) =>
    analyzeResume(t).breakdown.find((c) => c.id === 'formatting')!.earned

  it('scores real metrics above bare verbs', () => {
    const verbsOnly = formattingOf(
      base('- Improved the codebase\n- Reduced complexity\n- Increased quality'),
    )
    const quantified = formattingOf(
      base('- Cut API latency by 38%\n- Raised conversion 12%\n- Saved $40,000'),
    )
    // Three verbs with no numbers previously maxed the quantified half.
    expect(quantified).toBeGreaterThan(verbsOnly)
  })

  it('does not count bare years as metrics', () => {
    // "Developer (2010 - 2012)" once contributed four "metrics" purely from
    // its dates, handing full quantification credit to a resume with no
    // measurements in it at all.
    const datesOnly = formattingOf(
      'Experience\nDeveloper — OldCorp (2010 - 2012)\n- Improved the codebase\n- Reduced complexity',
    )
    const withMetrics = formattingOf(
      'Experience\nDeveloper — OldCorp (2010 - 2012)\n- Cut latency 38%\n- Saved $40,000\n- Served 2,000 users',
    )
    expect(withMetrics).toBeGreaterThan(datesOnly)
  })

  it('does not count digits from the contact header as metrics', () => {
    // "555-123-4567" is three number groups; counted globally it earned full
    // quantification credit for a resume whose bullets contain no numbers.
    const header = 'John Smith\njohn@email.com | 555-123-4567 | linkedin.com/in/js\n'
    const noMetrics = formattingOf(
      `${header}Experience\nDeveloper (2010 - 2012)\n- Improved the codebase\n- Reduced complexity`,
    )
    const realMetrics = formattingOf(
      `${header}Experience\nDeveloper (2010 - 2012)\n- Cut latency 38%\n- Saved $40,000\n- Served 2,000 users`,
    )
    expect(noMetrics).toBeLessThan(realMetrics)
  })

  it('still counts a number wearing a unit, even a year-like one', () => {
    expect(
      formattingOf(base('- Onboarded 2,000 users\n- Handled 1500+ requests/sec\n- Cut cost 20%')),
    ).toBeGreaterThan(formattingOf(base('- Did the work\n- Helped the team')))
  })
})

describe('summary detection', () => {
  it('accepts a plain "Summary" heading without demanding one be added', () => {
    const r = analyzeResume('Summary\nFrontend developer.\n\nSkills\nReact')
    expect(r.sections.find((s) => s.name === 'summary')?.present).toBe(true)
    // The old lookup checked 'professional summary' first and returned its
    // absence, so this advice fired at people who already had the section.
    expect(r.feedback.some((f) => /professional summary/i.test(f.message))).toBe(false)
  })
})

describe('section headings may carry content on the same line', () => {
  it('detects "SKILLS: React, Node.js" as a skills section', () => {
    const r = analyzeResume(
      'Jane Doe\nSKILLS: React, Node.js, PostgreSQL\nEDUCATION — B.Tech CSE, VIT Vellore 2026\nEXPERIENCE — Intern at Zoho 2025',
    )
    for (const name of ['skills', 'education', 'experience']) {
      expect(r.sections.find((s) => s.name === name)?.present).toBe(true)
    }
  })

  it('does not treat a sentence starting with a heading word as a heading', () => {
    const r = analyzeResume('Experience building web applications for five years.')
    expect(r.sections.find((s) => s.name === 'experience')?.present).toBe(false)
  })

  it('accepts "Technical Skills" in place of "Skills"', () => {
    const r = analyzeResume('Technical Skills\nReact, Node.js')
    expect(r.sections.find((s) => s.name === 'skills')?.present).toBe(true)
  })
})

describe('any professional profile link earns the contact points', () => {
  const stem = 'Jane Doe\njane@email.com | +91 98765 43210\n'

  it('accepts GitHub as readily as LinkedIn', () => {
    expect(contactOf(`${stem}github.com/janedoe`)).toBe(
      contactOf(`${stem}linkedin.com/in/janedoe`),
    )
  })

  it('still withholds the points when there is no link at all', () => {
    expect(contactOf(stem)).toBeLessThan(contactOf(`${stem}github.com/janedoe`))
  })
})
