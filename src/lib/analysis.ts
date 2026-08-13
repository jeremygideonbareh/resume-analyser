/**
 * Rule-based ATS resume analysis. Deterministic, no LLM.
 *
 * Scoring weights (normalized from 2026 industry research):
 *   keywords 45 | structure 17 | formatting 12 | recency 13 | contact 8
 *   parse-confidence ±5 bonus/penalty
 * Max total = 100. Breakdown categories always sum to the final score.
 */
import { findSkills, SKILLS } from './skills-lexicon'

export type CategoryId =
  | 'keywords'
  | 'structure'
  | 'formatting'
  | 'recency'
  | 'contact'
  | 'parse-confidence'

export interface CategoryScore {
  id: CategoryId
  label: string
  /** Points this category can contribute (parse-confidence may be ±5). */
  weight: number
  /** Points actually earned in this category. */
  earned: number
}

export interface DetectedSection {
  name: string
  present: boolean
  /** Raw heading line when present. */
  heading?: string
}

export interface FeedbackItem {
  severity: 'info' | 'warning' | 'critical'
  message: string
  /** Category this item belongs to — used by the ReportView drill-down
   * (clicking a breakdown bar highlights matching feedback). */
  category?: CategoryId
}

export interface AnalyzeOptions {
  /** Job description text for keyword match (optional). */
  jdText?: string
  /** Parsing warnings, e.g. ['possible-scanned'] from extractTextFromFile. */
  warnings?: string[]
}

export interface AnalysisResult {
  /** 0–100 ATS score. */
  score: number
  /** Category breakdown; sums to exactly `score`. */
  breakdown: CategoryScore[]
  /** Section headings detected. */
  sections: DetectedSection[]
  /** Skills from the lexicon found in the resume. */
  skills: string[]
  /** JD keywords present in the resume (empty when no JD provided). */
  presentKeywords: string[]
  /** JD keywords missing from the resume (empty when no JD provided). */
  missingKeywords: string[]
  /** Rule-driven, human-readable feedback. */
  feedback: FeedbackItem[]
  /** Warning codes, e.g. 'no-content', forwarded 'possible-scanned'. */
  warnings: string[]
}

export const WEIGHTS: Record<CategoryId, number> = {
  keywords: 45,
  structure: 17,
  formatting: 12,
  recency: 13,
  contact: 8,
  'parse-confidence': 5,
}

// --- section heading detection -------------------------------------------

const HEADING_RE =
  /^\s*(professional summary|summary|work experience|experience|education|skills|technical skills|core competencies|about me|profile|objective|projects?|certifications?)\s*(?=$|[:–\-—])/i

const SECTION_NAMES = [
  'professional summary',
  'summary',
  'experience',
  'education',
  'skills',
  'technical skills',
  'core competencies',
  'about me',
  'profile',
  'objective',
  'projects',
  'certifications',
]

// --- formatting / contact / recency signals ------------------------------

const BULLET_RE = /^[\s]*[•\-*▪]\s+/m
const QUANTIFIED_RE =
  /\b\d+(\.\d+)?%|\$\s?[\d,]+(\.\d+)?\b|\b(improved|increased|reduced|grew|boosted|cut|raised|accelerated|doubled|tripled)\b/gi
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/
// Strict phone shape — a loose digit/separator class would match date
// ranges like "2021 – 2024". Requires (area) XXX-XXXX structure.
const PHONE_RE =
  /\b(?:\+?\d{1,3}[\s().-]?)?\(?\d{3}\)?[\s().-]?\d{3}[\s().-]?\d{4}\b/
const LINKEDIN_RE = /linkedin\.com|linkedin\b/i
const YEAR_RE = /(20\d{2})/g

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will',
  'would', 'your', 'our', 'their', 'they', 'them', 'you', 'are', 'was',
  'were', 'been', 'being', 'has', 'had', 'did', 'does', 'not', 'but',
  'can', 'could', 'should', 'may', 'might', 'must', 'all', 'any', 'each',
  'new', 'work', 'team', 'role', 'job', 'like', 'also', 'into', 'than',
  'more', 'most', 'such', 'only', 'very', 'just', 'about', 'over',
])

const MIN_JD_KEYWORD_LEN = 3

// --- helpers --------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function extractJdKeywords(jdText: string): string[] {
  const tokens = jdText
    .split(/[^A-Za-z0-9+#.]+/)
    .filter(
      (t) =>
        t.length >= MIN_JD_KEYWORD_LEN && !STOPWORDS.has(t.toLowerCase()),
    )
  const keywords = new Set<string>()
  for (const token of tokens) {
    const low = token.toLowerCase()
    // Keep lexicon skills (any casing) or capitalized tokens (product /
    // proper-noun signals like "React", "AWS", "Postgres").
    if (SKILLS.has(low) || /[A-Z]/.test(token)) keywords.add(low)
  }
  return [...keywords]
}

function detectSections(text: string): DetectedSection[] {
  const lines = text.split(/\r?\n/)
  const found = new Map<string, string>()
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING_RE)
    if (m) found.set(m[1].toLowerCase(), lines[i].trim())
  }
  return SECTION_NAMES.map((name) => ({
    name,
    present: found.has(name),
    heading: found.get(name),
  }))
}

function parseConfidenceEarned(
  text: string,
  warnings: string[],
): number {
  if (warnings.includes('possible-scanned')) return -5
  if (warnings.length === 0 && text.trim().length >= 200) return 5
  return 0
}

// --- feedback rules -------------------------------------------------------

function buildFeedback(
  hasEmail: boolean,
  hasPhone: boolean,
  hasLinkedIn: boolean,
  hasBullets: boolean,
  quantifiedCount: number,
  hasSummary: boolean,
  missingSections: string[],
  missingKeywords: string[],
  isEmpty: boolean,
): FeedbackItem[] {
  const feedback: FeedbackItem[] = []
  if (isEmpty) {
    feedback.push({
      severity: 'critical',
      message:
        'Your resume appears to be empty — upload a file or paste your text.',
    })
    return feedback
  }
  if (!hasEmail && !hasPhone) {
    feedback.push({
      severity: 'critical',
      category: 'contact',
      message: 'Add your email and phone number so recruiters can reach you.',
    })
  } else if (!hasLinkedIn) {
    feedback.push({
      severity: 'info',
      category: 'contact',
      message: 'Consider adding a LinkedIn profile link.',
    })
  }
  if (!hasBullets) {
    feedback.push({
      severity: 'warning',
      category: 'formatting',
      message: 'Use bullet points to make achievements scannable.',
    })
  }
  if (quantifiedCount === 0) {
    feedback.push({
      severity: 'warning',
      category: 'formatting',
      message:
        'Quantify achievements with numbers or percentages (e.g. "improved load time by 40%").',
    })
  }
  if (!hasSummary) {
    feedback.push({
      severity: 'info',
      category: 'structure',
      message: 'Add a professional summary at the top of your resume.',
    })
  }
  for (const s of missingSections) {
    feedback.push({
      severity: 'info',
      category: 'structure',
      message: `Add a "${s}" section — ATS parsers rely on clear section headings.`,
    })
  }
  if (missingKeywords.length > 0) {
    feedback.push({
      severity: 'warning',
      category: 'keywords',
      message: `Add these keywords from the job description: ${missingKeywords.slice(0, 5).join(', ')}.`,
    })
  }
  return feedback
}

// --- main entry -----------------------------------------------------------

export function analyzeResume(
  text: string,
  opts: AnalyzeOptions = {},
): AnalysisResult {
  const warnings = [...(opts.warnings ?? [])]
  const trimmed = text.trim()

  if (!trimmed) {
    warnings.push('no-content')
    return {
      score: 0,
      breakdown: [
        { id: 'keywords', label: 'Keyword match', weight: 45, earned: 0 },
        { id: 'structure', label: 'Structure', weight: 17, earned: 0 },
        { id: 'formatting', label: 'Formatting', weight: 12, earned: 0 },
        { id: 'recency', label: 'Recency', weight: 13, earned: 0 },
        { id: 'contact', label: 'Contact info', weight: 8, earned: 0 },
        {
          id: 'parse-confidence',
          label: 'Parse confidence',
          weight: 5,
          earned: 0,
        },
      ],
      sections: detectSections(''),
      skills: [],
      presentKeywords: [],
      missingKeywords: [],
      feedback: buildFeedback(
        false, false, false, false, 0, false, [], [], true,
      ),
      warnings,
    }
  }

  const sections = detectSections(trimmed)
  const hasSummary =
    sections.find((s) => s.name === 'summary' || s.name === 'professional summary')
      ?.present ?? false

  // keywords: JD match or lexicon coverage
  const skills = findSkills(trimmed)
  let presentKeywords: string[] = []
  let missingKeywords: string[] = []
  let keywordEarned: number
  if (opts.jdText && opts.jdText.trim()) {
    const jdKeywords = extractJdKeywords(opts.jdText)
    const lower = trimmed.toLowerCase()
    presentKeywords = jdKeywords.filter((k) => lower.includes(k))
    missingKeywords = jdKeywords.filter((k) => !lower.includes(k))
    keywordEarned =
      jdKeywords.length === 0
        ? 0
        : (presentKeywords.length / jdKeywords.length) * WEIGHTS.keywords
  } else {
    // Coverage: 10+ distinct lexicon skills earns the full 45.
    keywordEarned = Math.min(skills.length / 10, 1) * WEIGHTS.keywords
  }

  // structure: experience + education + skills headings
  const exp = sections.find((s) => s.name === 'experience')
  const edu = sections.find((s) => s.name === 'education')
  const skillSec = sections.find((s) => s.name === 'skills')
  const structureFound = [exp, edu, skillSec].filter((s) => s?.present).length
  const structureEarned = (structureFound / 3) * WEIGHTS.structure

  // formatting: bullets + quantified achievements (6 pts each)
  const hasBullets = BULLET_RE.test(trimmed)
  const quantifiedMatches = trimmed.match(QUANTIFIED_RE) ?? []
  const quantifiedCount = quantifiedMatches.length
  const formattingEarned =
    (hasBullets ? 0.5 : 0) * WEIGHTS.formatting +
    Math.min(quantifiedCount / 2, 1) * 0.5 * WEIGHTS.formatting

  // recency: any 20xx year present
  const years = trimmed.match(YEAR_RE) ?? []
  const recencyEarned = years.length > 0 ? WEIGHTS.recency : 0

  // contact: email (3) + phone (3) + LinkedIn (2)
  const hasEmail = EMAIL_RE.test(trimmed)
  const hasPhone = PHONE_RE.test(trimmed)
  const hasLinkedIn = LINKEDIN_RE.test(trimmed)
  const contactEarned =
    (hasEmail ? 3 : 0) + (hasPhone ? 3 : 0) + (hasLinkedIn ? 2 : 0)

  const parseEarned = parseConfidenceEarned(trimmed, warnings)

  const breakdown: CategoryScore[] = [
    {
      id: 'keywords',
      label: 'Keyword match',
      weight: WEIGHTS.keywords,
      earned: Math.round(keywordEarned),
    },
    {
      id: 'structure',
      label: 'Structure',
      weight: WEIGHTS.structure,
      earned: Math.round(structureEarned),
    },
    {
      id: 'formatting',
      label: 'Formatting',
      weight: WEIGHTS.formatting,
      earned: Math.round(formattingEarned),
    },
    {
      id: 'recency',
      label: 'Recency',
      weight: WEIGHTS.recency,
      earned: Math.round(recencyEarned),
    },
    {
      id: 'contact',
      label: 'Contact info',
      weight: WEIGHTS.contact,
      earned: Math.round(contactEarned),
    },
    {
      id: 'parse-confidence',
      label: 'Parse confidence',
      weight: WEIGHTS['parse-confidence'],
      earned: parseEarned,
    },
  ]

  const rawScore = breakdown.reduce((sum, c) => sum + c.earned, 0)
  const score = clamp(rawScore, 0, 100)

  const missingSections = [
    ['experience', 'Work Experience'],
    ['education', 'Education'],
    ['skills', 'Skills'],
  ]
    .filter(([key]) => !sections.find((s) => s.name === key)?.present)
    .map(([, label]) => label)

  const feedback = buildFeedback(
    hasEmail,
    hasPhone,
    hasLinkedIn,
    hasBullets,
    quantifiedCount,
    hasSummary,
    missingSections,
    missingKeywords,
    false,
  )

  return {
    score,
    breakdown,
    sections,
    skills,
    presentKeywords,
    missingKeywords,
    feedback,
    warnings,
  }
}
