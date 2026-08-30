import { describe, it, expect } from 'vitest'
import { analyzeResume } from '@/lib/analysis'

// Inputs that a real upload can produce and that must not throw, hang, or
// return a nonsensical score.
const CASES: [string, string][] = [
  ['empty', ''],
  ['whitespace only', '   \n\n\t  '],
  ['single char', 'a'],
  ['no newlines, very long', 'word '.repeat(20000)],
  ['only numbers', '1234567890 '.repeat(500)],
  ['only punctuation', '!@#$%^&*()_+{}|:"<>?'.repeat(200)],
  ['null bytes', 'Name\u0000\u0000Email test@x.com'],
  ['emoji + RTL + CJK', '👩‍💻 Priya שלום 你好 Skills: React'],
  ['windows line endings', 'SKILLS\r\nReact, Node\r\nEXPERIENCE\r\nEngineer 2025\r\n'],
  ['regex metacharacters in text', 'Skills: C++ (a|b) [x]{2} .* $^ +?'],
  ['very many lines', Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n')],
  ['huge single token', 'A'.repeat(100000)],
  ['html-ish', '<script>alert(1)</script> Skills: React'],
]

describe('analyzeResume survives hostile input', () => {
  it.each(CASES)('handles %s', (_label, text) => {
    const started = Date.now()
    let r: ReturnType<typeof analyzeResume> | undefined
    expect(() => { r = analyzeResume(text) }).not.toThrow()
    expect(Date.now() - started).toBeLessThan(4000) // no catastrophic backtracking
    expect(r!.score).toBeGreaterThanOrEqual(0)
    expect(r!.score).toBeLessThanOrEqual(100)
    expect(Number.isFinite(r!.score)).toBe(true)
    const sum = r!.breakdown.reduce((a, c) => a + c.earned, 0)
    expect(Math.abs(sum - r!.score)).toBeLessThanOrEqual(1)
    expect(Array.isArray(r!.issues)).toBe(true)
    for (const i of r!.issues) {
      expect(i.start).toBeGreaterThanOrEqual(0)
      expect(i.end).toBeGreaterThan(i.start)
      expect(i.line).toBeGreaterThanOrEqual(1)
    }
  })

  it('handles a job description full of regex metacharacters', () => {
    expect(() =>
      analyzeResume('Skills: React', { jdText: 'Need (a|b)* [x]{9999} .*.*.* $^ +?' }),
    ).not.toThrow()
  })

  it('does not let a pathological JD hang the scorer', () => {
    const started = Date.now()
    analyzeResume('a'.repeat(5000), { jdText: 'React '.repeat(3000) })
    expect(Date.now() - started).toBeLessThan(5000)
  })
})
