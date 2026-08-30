/**
 * Rule-based ATS resume analysis. Deterministic, no LLM.
 *
 * Scoring weights (normalized from 2026 industry research):
 *   keywords 45 | structure 17 | formatting 12 | recency 13 | contact 8
 *   parse-confidence ±5 bonus/penalty
 * Max total = 100. Breakdown categories always sum to the final score.
 */
import { findSkills, SKILLS } from './skills-lexicon'
import { scanResumeIssues, type ResumeIssue } from './resume-issues'

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
  /** Line-anchored issues for the annotated preview (empty when no content). */
  issues: ResumeIssue[]
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

const HEADING_WORDS =
  'professional summary|summary|work experience|work history|experience|education|academic background|technical skills|skills|core competencies|about me|profile|objective|projects?|certifications?'

/** Heading occupying its own line, optionally with trailing punctuation. */
const HEADING_RE = new RegExp(`^\\s*(${HEADING_WORDS})\\s*[:.\\-–—]?\\s*$`, 'i')

/**
 * Heading with its content on the same line — "SKILLS: React, Node.js" or
 * "Education — B.Tech CSE". Single-column resumes exported from Word do this
 * constantly, and the old own-line-only rule scored them as having no
 * sections at all, which is both wrong and the most punishing thing the
 * analyser could get wrong: structure is 17 points and the missing-section
 * feedback then tells people to add headings they already have.
 *
 * Requires a real separator so a sentence merely beginning with the word
 * ("Experience building web apps…") is not mistaken for a heading.
 */
const INLINE_HEADING_RE = new RegExp(
  `^\\s*(${HEADING_WORDS})\\s*[:\\-–—]\\s*\\S`,
  'i',
)

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

/** Normalize section name variants to canonical SECTION_NAMES keys. */
function normalizeSectionName(raw: string): string {
  const low = raw.toLowerCase().trim()
  // "work experience" → "experience"
  if (low === 'work experience') return 'experience'
  // "work history" → "experience"
  if (low === 'work history') return 'experience'
  // "academic background" → "education"
  if (low === 'academic background') return 'education'
  // "technical skills" → "skills" (keep as-is, both exist)
  // Return as-is for exact matches
  return low
}

// --- formatting / contact / recency signals ------------------------------

const BULLET_RE = /^[\s]*[•\-*▪]\s+/m

/**
 * Impact verbs alone are not quantification. "Improved the codebase" used to
 * earn the same formatting credit as "Cut latency 38%", because the old
 * pattern OR-ed verbs together with numbers and two matches maxed the score.
 * A verb now only counts when a number sits near it, and bare metrics still
 * count on their own.
 */
const METRIC_RE = /\d+(?:\.\d+)?\s?%|[$€£₹]\s?[\d,]+(?:\.\d+)?|\b\d{2,}(?:,\d{3})*\+?/g

/**
 * Dates are not achievements. A bare four-digit year matches the generic
 * number branch above, so "Developer (2010 - 2012)" was contributing four
 * "metrics" and earning full quantification credit for a resume containing no
 * measurements at all. A year wearing a unit — "40+", "2,000", "38%" — is
 * still a metric, so only the undecorated form is dropped.
 */
function isBareYear(match: string): boolean {
  if (!/^\d{4}$/.test(match)) return false
  const n = Number(match)
  return n >= 1950 && n <= new Date().getFullYear() + 1
}

/**
 * Header lines carrying an address, profile or number. Their digits are
 * identifiers, never achievements, so they are excluded from metric counting.
 */
function isContactLine(line: string): boolean {
  return (
    EMAIL_RE.test(line) ||
    /https?:\/\/|www\.|linkedin|github|gitlab/i.test(line) ||
    hasPhoneNumber(line)
  )
}
const IMPACT_VERB_RE =
  /\b(improved|increased|reduced|grew|boosted|cut|raised|accelerated|doubled|tripled|saved|shipped|launched|scaled|optimi[sz]ed)\b/gi

/**
 * Quantifiers are bounded, and that is load-bearing rather than tidiness.
 *
 * An unbounded `[\w.+-]+@` matches to the end of a long word-character run
 * and then backtracks one character at a time looking for an "@" that is not
 * there — at every start position, so quadratic. A PDF that extracts without
 * spaces (common) yields a single 100k-character token, and that froze
 * analyzeResume for 24 seconds on the main thread, hanging the browser.
 *
 * RFC 5321 caps the local part at 64 and each domain label at 63, so these
 * bounds lose nothing real and make the scan linear.
 */
const EMAIL_RE = /\b[\w.+-]{1,64}@[\w-]{1,63}\.[\w.]{2,24}\b/

/**
 * Candidate phone-shaped runs. Grouping varies too much between countries for
 * one pattern to encode digit positions, so this only finds plausible runs and
 * `hasPhoneNumber` decides using the digit count.
 *
 * Separators are limited to a single character between groups: a phone number
 * has no long gaps, and allowing runs of whitespace lets two adjacent date
 * ranges join into one candidate.
 */
const PHONE_CANDIDATE_RE =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}|\+\d{9,15}|\b\d{10,12}\b/g

/** 1950..next year — the plausible range for a year printed on a resume. */
const YEARISH = (n: string) =>
  n.length === 4 && Number(n) >= 1950 && Number(n) <= new Date().getFullYear() + 1

/**
 * Phone detection, deliberately international.
 *
 * The previous regex hard-coded North-American 3-3-4 grouping, so it missed
 * "+91 98765 43210" — the standard way an Indian student writes their number,
 * on a product whose own sample data is CGPA, backlogs, Infosys and Zoho. It
 * also missed UK spacing.
 *
 * The floor of 9 digits is what keeps "2021 – 2024" out: a two-year range is
 * exactly 8 digits, below every real national numbering plan. The explicit
 * year-pair guard then catches the remaining case where three or more year
 * groups sit adjacent on one line.
 */
export function hasPhoneNumber(text: string): boolean {
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const candidate = m[0]
    const groups = candidate.match(/\d+/g) ?? []
    const digits = groups.join('')
    if (digits.length < 9 || digits.length > 15) continue
    // A run of nothing but plausible years is a date range, not a number.
    if (groups.length >= 2 && groups.every(YEARISH)) continue
    return true
  }
  return false
}

/**
 * Any public professional profile earns the same points. An engineering
 * student with a GitHub and no LinkedIn is not worse off than the reverse —
 * and the product's own report copy already tells people a repository link
 * matters, so the score has to agree with the advice.
 */
const PROFILE_LINK_RE =
  /linkedin\.com|\blinkedin\b|github\.com|\bgithub\b|gitlab\.com|behance\.net|dribbble\.com|\bportfolio\b|[\w-]{1,63}\.(?:dev|me|io)\b/i

const YEAR_RE = /\b(19\d{2}|20\d{2})\b/g

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

/**
 * Whole-token keyword test.
 *
 * The old check was `resumeText.includes(keyword)`, which credits a resume
 * that says "JavaScript" for a job description asking for "Java" — a false
 * positive on the single highest-weighted category, telling someone they
 * match a requirement they do not have. Boundaries here are non-alphanumeric
 * rather than \b, because \b treats "." and "+" as boundaries and would let
 * "c" match inside "c++" while failing "node.js" against "node".
 */
export function containsKeyword(haystackLower: string, keywordLower: string): boolean {
  const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(haystackLower)
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
  for (const line of lines) {
    const m = line.match(HEADING_RE) ?? line.match(INLINE_HEADING_RE)
    if (m) {
      const key = normalizeSectionName(m[1])
      // Own-line headings win when a resume has both, so `heading` shows the
      // cleaner of the two in the report.
      if (!found.has(key) || HEADING_RE.test(line)) found.set(key, line.trim())
    }
  }
  // "Technical Skills" satisfies a reader looking for "Skills"; scoring should
  // not require the plainer wording to appear as well.
  if (found.has('technical skills') && !found.has('skills')) {
    found.set('skills', found.get('technical skills')!)
  }
  return SECTION_NAMES.map((name) => ({
    name,
    present: found.has(name),
    heading: found.get(name),
  }))
}

/**
 * Newest 4-digit year in the text, or null when there is none.
 * Years beyond next year are ignored as parse noise rather than treated as
 * the newest date — a stray "2099" should not make a stale resume look current.
 */
function mostRecentYear(text: string): number | null {
  const horizon = new Date().getFullYear() + 1
  const years = [...text.matchAll(YEAR_RE)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 1950 && y <= horizon)
  return years.length ? Math.max(...years) : null
}

/**
 * Recency used to be "does a 20xx appear anywhere", which awarded the full 13
 * points to a resume whose most recent role ended in 2011 — identical to one
 * ending this year. For a category named Recency that is not a rounding
 * problem, it is measuring the wrong thing entirely.
 *
 * Full marks for the current or previous year, then a straight decay to zero
 * across roughly eight years.
 */
export function recencyFactor(mostRecent: number | null, now = new Date().getFullYear()): number {
  if (mostRecent === null) return 0
  const stale = now - mostRecent
  return clamp(1 - (stale - 1) * 0.15, 0, 1)
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
  hasProfileLink: boolean,
  hasBullets: boolean,
  quantifiedCount: number,
  hasSummary: boolean,
  missingSections: string[],
  missingKeywords: string[],
  isEmpty: boolean,
  newestYear: number | null = null,
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
  } else if (!hasProfileLink) {
    feedback.push({
      severity: 'info',
      category: 'contact',
      message:
        'Add a LinkedIn, GitHub, or portfolio link — engineering shortlists weight it, and it costs one line.',
    })
  }

  // Only reachable now that recency is measured rather than merely detected.
  const now = new Date().getFullYear()
  if (newestYear === null) {
    feedback.push({
      severity: 'warning',
      category: 'recency',
      message:
        'No dates found. Add years to your roles and education — parsers use them to judge how current you are.',
    })
  } else if (now - newestYear >= 3) {
    feedback.push({
      severity: 'warning',
      category: 'recency',
      message: `Your most recent date is ${newestYear}. Add current or recent work — a ${now - newestYear}-year gap reads as stale to a screener.`,
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
      issues: [],
      feedback: buildFeedback(
        false, false, false, false, 0, false, [], [], true,
      ),
      warnings,
    }
  }

  const sections = detectSections(trimmed)
  // `.some`, not `.find(...)?.present`: find returns the first entry whose
  // NAME matches, and 'professional summary' is checked first, so a resume
  // with a plain "Summary" heading was reported as having none — and told to
  // add the section it already had.
  const hasSummary = sections.some(
    (s) => (s.name === 'summary' || s.name === 'professional summary') && s.present,
  )

  // keywords: JD match or lexicon coverage
  const skills = findSkills(trimmed)
  let presentKeywords: string[] = []
  let missingKeywords: string[] = []
  let keywordEarned: number
  if (opts.jdText && opts.jdText.trim()) {
    const jdKeywords = extractJdKeywords(opts.jdText)
    const lower = trimmed.toLowerCase()
    presentKeywords = jdKeywords.filter((k) => containsKeyword(lower, k))
    missingKeywords = jdKeywords.filter((k) => !containsKeyword(lower, k))
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
  // A metric counts on its own; an impact verb only counts as quantification
  // when a number appears on the same line, so "Improved the codebase" no
  // longer scores the same as "Cut latency 38%".
  // Metrics are counted per line, skipping contact lines. A phone number is
  // three number groups and a postcode is another; counted globally they
  // handed a resume with no measurements in it full quantification credit
  // purely for having a header.
  const metricCount = trimmed
    .split(/\r?\n/)
    .filter((line) => !isContactLine(line))
    .reduce(
      (n, line) =>
        n + (line.match(METRIC_RE) ?? []).filter((m) => !isBareYear(m.trim())).length,
      0,
    )
  const verbLinesWithNumbers = trimmed
    .split(/\r?\n/)
    .filter((l) => IMPACT_VERB_RE.test(l) && /\d/.test(l)).length
  IMPACT_VERB_RE.lastIndex = 0
  const quantifiedCount = metricCount + verbLinesWithNumbers
  const formattingEarned =
    (hasBullets ? 0.5 : 0) * WEIGHTS.formatting +
    Math.min(quantifiedCount / 3, 1) * 0.5 * WEIGHTS.formatting

  // recency: how recent the newest date is, not merely whether one exists
  const newestYear = mostRecentYear(trimmed)
  const recencyEarned = recencyFactor(newestYear) * WEIGHTS.recency

  // contact: email (3) + phone (3) + any professional profile link (2)
  const hasEmail = EMAIL_RE.test(trimmed)
  const hasPhone = hasPhoneNumber(trimmed)
  const hasLinkedIn = PROFILE_LINK_RE.test(trimmed)
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
    newestYear,
  )

  return {
    score,
    breakdown,
    sections,
    skills,
    presentKeywords,
    missingKeywords,
    feedback,
    issues: scanResumeIssues(trimmed),
    warnings,
  }
}
