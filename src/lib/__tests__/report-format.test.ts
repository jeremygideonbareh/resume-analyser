import { describe, it, expect } from 'vitest'
import {
  scoreBand,
  feedbackPriority,
  groupFeedback,
  countWords,
  buildCopySummary,
} from '@/lib/report-format'
import type { FeedbackItem } from '@/lib/analysis'

describe('report-format helpers', () => {
  describe('scoreBand', () => {
    it('labels >= 70 as Strong (emerald)', () => {
      const band = scoreBand(70)
      expect(band.label).toBe('Strong')
      expect(band.textClass).toContain('emerald')
      expect(scoreBand(100).label).toBe('Strong')
    })

    it('labels 40-69 as Needs work (amber)', () => {
      expect(scoreBand(40).label).toBe('Needs work')
      expect(scoreBand(54).textClass).toContain('amber')
      expect(scoreBand(69).label).toBe('Needs work')
    })

    it('labels < 40 as Weak (red)', () => {
      expect(scoreBand(0).label).toBe('Weak')
      expect(scoreBand(39).textClass).toContain('red')
      expect(scoreBand(23).label).toBe('Weak')
    })
  })

  describe('feedbackPriority / groupFeedback', () => {
    it('maps critical->high, warning->medium, info->low', () => {
      expect(feedbackPriority({ severity: 'critical', message: 'x' })).toBe(
        'high',
      )
      expect(feedbackPriority({ severity: 'warning', message: 'x' })).toBe(
        'medium',
      )
      expect(feedbackPriority({ severity: 'info', message: 'x' })).toBe('low')
    })

    it('groups items and preserves order within each group', () => {
      const items: FeedbackItem[] = [
        { severity: 'info', message: 'low-1' },
        { severity: 'critical', message: 'high-1' },
        { severity: 'warning', message: 'medium-1' },
        { severity: 'critical', message: 'high-2' },
      ]
      const groups = groupFeedback(items)
      expect(groups.high.map((i) => i.message)).toEqual(['high-1', 'high-2'])
      expect(groups.medium.map((i) => i.message)).toEqual(['medium-1'])
      expect(groups.low.map((i) => i.message)).toEqual(['low-1'])
    })

    it('returns empty arrays for empty input', () => {
      const groups = groupFeedback([])
      expect(groups.high).toEqual([])
      expect(groups.medium).toEqual([])
      expect(groups.low).toEqual([])
    })
  })

  describe('countWords', () => {
    it('counts whitespace-separated words', () => {
      expect(countWords('a b c')).toBe(3)
      expect(countWords('  one   two  ')).toBe(2)
      expect(countWords('')).toBe(0)
      expect(countWords('   ')).toBe(0)
    })
  })

  describe('buildCopySummary', () => {
    const result = {
      score: 54,
      breakdown: [
        { id: 'keywords', label: 'Keyword match', weight: 45, earned: 23 },
      ],
      skills: ['react', 'sql'],
      presentKeywords: ['react'],
      missingKeywords: ['docker'],
      feedback: [
        { severity: 'warning', message: 'Quantify achievements.' },
      ],
      sections: [],
      warnings: [],
    } as Parameters<typeof buildCopySummary>[0]

    it('includes score, breakdown, keywords, and feedback', () => {
      const s = buildCopySummary(result, {
        text: 'hello world',
        format: 'txt',
        warnings: [],
        filename: 'resume.txt',
      })
      expect(s).toContain('ATS Score: 54/100 (Needs work)')
      expect(s).toContain('TXT · 2 words')
      expect(s).toContain('Keyword match: 23/45')
      expect(s).toContain('JD keywords present (1): react')
      expect(s).toContain('JD keywords missing (1): docker')
      expect(s).toContain('[warning] Quantify achievements.')
    })

    it('omits JD sections when no JD keywords exist', () => {
      const noJd = {
        ...result,
        presentKeywords: [],
        missingKeywords: [],
      } as Parameters<typeof buildCopySummary>[0]
      const s = buildCopySummary(noJd, null)
      expect(s).not.toContain('JD keywords')
    })
  })
})
